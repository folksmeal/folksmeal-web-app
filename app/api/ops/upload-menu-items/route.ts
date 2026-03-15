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
const MAX_ROWS = 5000 // Library can be larger than daily menus

export async function POST(request: NextRequest) {
    return handleApiRequest(async () => {
        const user = await requireAdmin()
        if (!user || user.role !== "SUPERADMIN") {
            return apiError("Forbidden: Only Super Admins can manage Menu Items", 403)
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
                headers[String(cell.value).toLowerCase().trim()] = colNumber
            }
        })

        const requiredHeaders = ["name"]
        for (const req of requiredHeaders) {
            if (!headers[req]) {
                throw new ApiRequestError(`Missing required column: ${req}`, 400, "MISSING_COLUMN")
            }
        }

        interface MenuItemRecord { name: string; description: string | null }
        const uniqueIncomingItems = new Map<string, MenuItemRecord>()

        for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
            const row = sheet.getRow(rowNum)
            let isEmpty = true
            row.eachCell(() => { isEmpty = false })
            if (isEmpty) continue

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

            const rawName = extractStringValue("name")
            const description = extractStringValue("description")

            if (!rawName) {
                errors.push({ row: rowNum, error: "Missing name" })
                continue
            }

            // Normalize: Trim and handle casing (we'll store as provided but match case-insensitively)
            // To ensure no duplicates like "Apple" and "apple", we'll use the normalized name as a key
            const normalizedName = rawName.trim()
            uniqueIncomingItems.set(normalizedName.toLowerCase(), { name: normalizedName, description })
        }

        // Fetch existing items to see what to update vs create
        const namesToSync = Array.from(uniqueIncomingItems.keys())
        const existingItems = await prisma.menuItem.findMany({
            where: {
                name: {
                    in: namesToSync,
                    mode: "insensitive"
                }
            }
        })

        const existingMap = new Map(existingItems.map(item => [item.name.toLowerCase(), item]))
        const operations: (ReturnType<typeof prisma.menuItem.create> | ReturnType<typeof prisma.menuItem.update>)[] = []

        uniqueIncomingItems.forEach((data, lowerName) => {
            const existing = existingMap.get(lowerName)
            if (existing) {
                operations.push(
                    prisma.menuItem.update({
                        where: { id: existing.id },
                        data: { description: data.description }
                    })
                )
            } else {
                operations.push(
                    prisma.menuItem.create({
                        data: { name: data.name, description: data.description }
                    })
                )
            }
        })

        // Execute in transaction batches
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
