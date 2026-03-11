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

export async function POST(request: NextRequest) {
    return handleApiRequest(async () => {
        const user = await requireAdmin()
        if (!user) return apiError("Forbidden", 403)

        const formData = await request.formData()
        const file = formData.get("file") as File | null
        const addressId = formData.get("addressId") as string | null

        if (!file) {
            throw new ApiRequestError("No file uploaded", 400, "NO_FILE")
        }
        if (!addressId) {
            throw new ApiRequestError("Location ID (addressId) is required", 400, "MISSING_ADDRESS_ID")
        }

        const address = await prisma.companyAddress.findUnique({ where: { id: addressId } })
        if (!address) {
            return apiError("Location not found", 404, "ADDRESS_NOT_FOUND")
        }

        if (user.role === "ADMIN" && user.companyId !== address.companyId) {
            return apiError("Forbidden: Cannot upload menu for another company", 403, "FORBIDDEN")
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

        const results: { date: string; vegItem: string; nonvegItem: string | null; action: string }[] = []
        const errors: { row: number; error: string }[] = []

        // Parse headers
        const headers: Record<string, number> = {}
        const headerRow = sheet.getRow(1)
        headerRow.eachCell((cell, colNumber) => {
            if (cell.value) {
                headers[String(cell.value).toLowerCase().trim()] = colNumber
            }
        })

        const requiredHeaders = ["date", "veg_item"]
        for (const req of requiredHeaders) {
            if (!headers[req]) {
                throw new ApiRequestError(`Missing required column: ${req}`, 400, "MISSING_COLUMN")
            }
        }

        // Prepare bulk upserts
        const upserts: ReturnType<typeof prisma.menu.upsert>[] = []

        for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
            const row = sheet.getRow(rowNum)
            let isEmpty = true
            row.eachCell(() => { isEmpty = false })
            if (isEmpty) continue

            const rawDate = row.getCell(headers["date"]).value
            const rawVegItem = row.getCell(headers["veg_item"]).value

            if (!rawDate) {
                errors.push({ row: rowNum, error: "Missing date" })
                continue
            }
            if (!rawVegItem) {
                errors.push({ row: rowNum, error: "Missing veg_item" })
                continue
            }

            let parsedDate: Date
            if (rawDate instanceof Date) {
                parsedDate = rawDate
            } else if (typeof rawDate === "number") {
                // Excel serial date number
                parsedDate = new Date((rawDate - 25569) * 86400 * 1000)
            } else if (typeof rawDate === "string") {
                parsedDate = new Date(rawDate)
            } else if (typeof rawDate === "object" && rawDate !== null && "result" in rawDate) {
                const result = (rawDate as { result: unknown }).result
                parsedDate = result instanceof Date ? result : new Date(result as string | number)
            } else {
                errors.push({ row: rowNum, error: `Invalid date format: ${JSON.stringify(rawDate)}` })
                continue
            }

            if (isNaN(parsedDate.getTime())) {
                errors.push({ row: rowNum, error: `Invalid date: ${rawDate}` })
                continue
            }

            parsedDate.setHours(0, 0, 0, 0)

            const extractStringValue = (colName: string): string | null => {
                const colIdx = headers[colName]
                if (!colIdx) return null
                const val = row.getCell(colIdx).value
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

            const vegItem = extractStringValue("veg_item") || ""
            const nonvegItem = extractStringValue("nonveg_item")
            const sideBeverage = extractStringValue("side_beverage")
            const notes = extractStringValue("notes")
            const day = extractStringValue("day")

            upserts.push(
                prisma.menu.upsert({
                    where: {
                        addressId_date: { addressId, date: parsedDate },
                    },
                    update: { day, vegItem, nonvegItem, sideBeverage, notes },
                    create: { addressId, date: parsedDate, day, vegItem, nonvegItem, sideBeverage, notes },
                })
            )

            results.push({
                date: parsedDate.toISOString().split("T")[0],
                vegItem,
                nonvegItem,
                action: "upserted",
            })
        }

        // Execute all upserts in a single transaction
        if (upserts.length > 0) {
            await prisma.$transaction(upserts)
        }

        return apiResponse({
            success: true,
            processed: results.length,
            errors: errors.length,
            ...(errors.length > 0 && { errorDetails: errors }),
        })
    })
}