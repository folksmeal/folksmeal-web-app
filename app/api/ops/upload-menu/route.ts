import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import ExcelJS from "exceljs"

// ─── POST /api/ops/upload-menu ─────────────────────────────────────
// Accepts an Excel file with weekly menus.
// Expected columns: date, day, veg_item, nonveg_item, side_beverage, notes
// Requires: role = OPS

export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if ((session.user as any).role !== "OPS") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { officeId } = session.user as any

        // ─── Parse uploaded file ──────────────────────────────────
        const formData = await request.formData()
        const file = formData.get("file") as File

        if (!file) {
            return NextResponse.json(
                { error: "No file uploaded" },
                { status: 400 }
            )
        }

        const arrayBuffer = await file.arrayBuffer()
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.load(arrayBuffer)

        const sheet = workbook.worksheets[0] // get first worksheet

        if (!sheet || sheet.rowCount <= 1) {
            return NextResponse.json(
                { error: "Excel file is empty or missing data rows" },
                { status: 400 }
            )
        }

        // ─── Process rows ─────────────────────────────────────────
        const results: { date: string; vegItem: string; nonvegItem: string | null; action: string }[] = []
        const errors: { row: number; error: string }[] = []

        // Extract headers from the first row
        const headers: Record<string, number> = {}
        const headerRow = sheet.getRow(1)
        headerRow.eachCell((cell, colNumber) => {
            if (cell.value) {
                headers[String(cell.value).toLowerCase().trim()] = colNumber
            }
        })

        // Ensure required headers exist
        const requiredHeaders = ["date", "veg_item"]
        for (const req of requiredHeaders) {
            if (!headers[req]) {
                return NextResponse.json(
                    { error: `Missing required column: ${req}` },
                    { status: 400 }
                )
            }
        }

        // Process data rows (starting from row 2)
        // using a standard for loop to handle async/await cleanly
        for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
            const row = sheet.getRow(rowNum)

            // Skip empty rows
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

            // Parse date
            let parsedDate: Date

            if (rawDate instanceof Date) {
                // ExcelJS often parses dates to JS Date objects automatically
                parsedDate = rawDate
            } else if (typeof rawDate === "number") {
                // If it's stored as an Excel serial date, ExcelJS sometimes returns it as a float or int if it doesn't recognize the cell format
                // 25569 is Jan 1, 1970
                parsedDate = new Date((rawDate - 25569) * 86400 * 1000)
            } else if (typeof rawDate === "string") {
                // Might be a parsed string from the file
                parsedDate = new Date(rawDate)
            } else if (typeof rawDate === "object" && rawDate !== null && 'result' in rawDate) {
                // Handle formula results that might return a Date
                const result = (rawDate as any).result
                parsedDate = result instanceof Date ? result : new Date(result)
            } else {
                errors.push({ row: rowNum, error: `Invalid date format: ${JSON.stringify(rawDate)}` })
                continue
            }

            if (isNaN(parsedDate.getTime())) {
                errors.push({ row: rowNum, error: `Invalid date: ${rawDate}` })
                continue
            }

            // Ensure we are storing it at midnight local time
            parsedDate.setHours(0, 0, 0, 0)

            // Helper to extract value since cell.value can be an object (rich text, formula, etc.)
            const extractStringValue = (colName: string): string | null => {
                const colIdx = headers[colName]
                if (!colIdx) return null

                const val = row.getCell(colIdx).value

                if (val === null || val === undefined) return null
                if (typeof val === 'object' && 'richText' in val) {
                    return (val as any).richText.map((rt: any) => rt.text).join('')
                }
                if (typeof val === 'object' && 'result' in val) {
                    return String((val as any).result)
                }
                return String(val).trim()
            }

            const vegItem = extractStringValue("veg_item") || ""
            const nonvegItem = extractStringValue("nonveg_item")
            const sideBeverage = extractStringValue("side_beverage")
            const notes = extractStringValue("notes")
            const day = extractStringValue("day")

            // Upsert into database
            await prisma.menu.upsert({
                where: {
                    officeId_date: {
                        officeId,
                        date: parsedDate,
                    },
                },
                update: {
                    day,
                    vegItem,
                    nonvegItem,
                    sideBeverage,
                    notes,
                },
                create: {
                    officeId,
                    date: parsedDate,
                    day,
                    vegItem,
                    nonvegItem,
                    sideBeverage,
                    notes,
                },
            })

            results.push({
                date: parsedDate.toISOString().split("T")[0],
                vegItem,
                nonvegItem,
                action: "upserted",
            })
        }

        return NextResponse.json({
            success: true,
            processed: results.length,
            errors: errors.length,
            results,
            ...(errors.length > 0 && { errorDetails: errors }),
        })
    } catch (error) {
        console.error("[POST /api/ops/upload-menu]", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}

