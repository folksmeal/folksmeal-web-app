import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-helpers"
import ExcelJS from "exceljs"
import { apiResponse, apiError, handleApiRequest, ApiRequestError } from "@/lib/api-utils"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_MIME_TYPES = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
]
const MAX_ROWS = 1000

function parseAddonType(typeStr: string): "MAIN_REPEAT" | "PROTEIN_SIDE" | "BEVERAGE" | "SIDE_DESSERT" | "BREAD_ADDITION" {
    const s = typeStr.toLowerCase().replace(/[^a-z0-9]/g, "")
    if (s.includes("main") || s.includes("repeat")) return "MAIN_REPEAT"
    if (s.includes("protein") || s.includes("side")) return "PROTEIN_SIDE"
    if (s.includes("beverage") || s.includes("drink")) return "BEVERAGE"
    if (s.includes("dessert") || s.includes("sweet")) return "SIDE_DESSERT"
    if (s.includes("bread") || s.includes("roti")) return "BREAD_ADDITION"

    // Default fallback
    return "SIDE_DESSERT"
}

function parseBoolean(val: string | null): boolean {
    if (!val) return false
    const s = val.toLowerCase().trim()
    return s === "yes" || s === "true" || s === "1" || s === "y"
}

export async function POST(request: NextRequest) {
    return handleApiRequest(async () => {
        const user = await requireAdmin()
        if (!user || user.role !== "SUPERADMIN") {
            return apiError("Forbidden: Only Super Admins can manage Add-ons", 403)
        }

        const formData = await request.formData()
        const file = formData.get("file") as File | null

        if (!file) {
            throw new ApiRequestError("No file uploaded", 400, "NO_FILE")
        }

        if (file.size > MAX_FILE_SIZE) {
            throw new ApiRequestError("File exceeds the maximum limit of 5MB", 400, "FILE_TOO_LARGE")
        }

        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            throw new ApiRequestError(
                "Invalid file type. Only Excel files (.xlsx, .xls) are allowed.",
                400,
                "INVALID_FILE_TYPE"
            )
        }

        const arrayBuffer = await file.arrayBuffer()
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.load(arrayBuffer)

        const sheet = workbook.worksheets[0]
        if (!sheet || sheet.rowCount <= 1) {
            throw new ApiRequestError("Excel file is empty or missing data rows", 400, "EMPTY_FILE")
        }

        if (sheet.rowCount > MAX_ROWS + 1) {
            throw new ApiRequestError(`Excel file exceeds the maximum limit of ${MAX_ROWS} rows`, 400, "TOO_MANY_ROWS")
        }

        const errors: { row: number; error: string }[] = []

        // Parse headers
        const headers: Record<string, number> = {}
        const headerRow = sheet.getRow(1)
        headerRow.eachCell((cell, colNumber) => {
            if (cell.value) {
                // Normalize header string securely removing non-alpha
                const nameMatch = String(cell.value).toLowerCase().replace(/[^a-z0-9]/g, "")
                headers[nameMatch] = colNumber
            }
        })

        // Require at least name and unit price
        if (!headers["name"]) {
            throw new ApiRequestError(`Missing required column: Name`, 400, "MISSING_COLUMN")
        }
        if (!headers["unitprice"] && !headers["price"]) {
            throw new ApiRequestError(`Missing required column: Unit Price`, 400, "MISSING_COLUMN")
        }

        interface AddonRecord {
            name: string;
            unitPrice: number;
            maxQty: number;
            isRepeatable: boolean;
            isLinkedToMenu: boolean;
            type: "MAIN_REPEAT" | "PROTEIN_SIDE" | "BEVERAGE" | "SIDE_DESSERT" | "BREAD_ADDITION";
            active: boolean;
        }

        const uniqueIncomingItems = new Map<string, AddonRecord>()

        for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
            const row = sheet.getRow(rowNum)
            let isEmpty = true
            row.eachCell(() => { isEmpty = false })
            if (isEmpty) continue

            const extractStringValue = (keys: string[]): string | null => {
                let val: ExcelJS.CellValue | null = null
                for (const k of keys) {
                    if (headers[k]) {
                        val = row.getCell(headers[k]).value
                        break
                    }
                }
                if (val === null || val === undefined) return null
                if (typeof val === "object" && "richText" in val) {
                    return (val as { richText: { text: string }[] }).richText
                        .map((rt) => rt.text)
                        .join("")
                }
                if (typeof val === "object" && "result" in val) {
                    return String((val as { result: unknown }).result)
                }
                return String(val).trim()
            }

            const rawName = extractStringValue(["name"])
            const priceStr = extractStringValue(["unitprice", "price"])
            const maxQtyStr = extractStringValue(["maxqty", "quantity", "max"])
            const typeStr = extractStringValue(["type", "category"])
            const repeatableStr = extractStringValue(["repeatable", "isrepeatable"])
            const linkedStr = extractStringValue(["linkedtomenu", "islinked", "linked"])

            if (!rawName) {
                errors.push({ row: rowNum, error: "Missing Name" })
                continue
            }
            if (!priceStr || isNaN(parseFloat(priceStr))) {
                errors.push({ row: rowNum, error: `Invalid or Missing Unit Price for ${rawName}` })
                continue
            }

            const unitPrice = parseFloat(priceStr)
            const maxQty = maxQtyStr && !isNaN(parseInt(maxQtyStr)) ? parseInt(maxQtyStr) : 1
            const type = parseAddonType(typeStr || "side")
            const isRepeatable = parseBoolean(repeatableStr)
            const isLinkedToMenu = parseBoolean(linkedStr)

            const normalizedName = rawName.trim()
            uniqueIncomingItems.set(normalizedName.toLowerCase(), {
                name: normalizedName,
                unitPrice,
                maxQty,
                type,
                isRepeatable,
                isLinkedToMenu,
                active: true
            })
        }

        const namesToSync = Array.from(uniqueIncomingItems.values()).map(x => x.name)
        const existingItems = await prisma.addon.findMany({
            where: {
                name: {
                    in: namesToSync,
                    mode: "insensitive"
                }
            }
        })

        const existingMap = new Map(existingItems.map(item => [item.name.toLowerCase(), item]))
        const operations: (ReturnType<typeof prisma.addon.create> | ReturnType<typeof prisma.addon.update>)[] = []

        uniqueIncomingItems.forEach((data, lowerName) => {
            const existing = existingMap.get(lowerName)
            if (existing) {
                operations.push(
                    prisma.addon.update({
                        where: { id: existing.id },
                        data: {
                            unitPrice: data.unitPrice,
                            maxQty: data.maxQty,
                            isRepeatable: data.isRepeatable,
                            isLinkedToMenu: data.isLinkedToMenu,
                            type: data.type,
                            active: true // Reactivate if it was deleted/inactive
                        }
                    })
                )
            } else {
                operations.push(
                    prisma.addon.create({
                        data
                    })
                )
            }
        })

        const batchSize = 100
        for (let i = 0; i < operations.length; i += batchSize) {
            const batch = operations.slice(i, i + batchSize)
            await prisma.$transaction(batch)
        }

        return apiResponse({
            success: true,
            processed: uniqueIncomingItems.size,
            errors: errors.length,
            ...(errors.length > 0 && { errorDetails: errors }),
        })
    })
}
