import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import * as XLSX from "xlsx"

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

        const buffer = Buffer.from(await file.arrayBuffer())
        const workbook = XLSX.read(buffer, { type: "buffer" })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet)

        if (!rows.length) {
            return NextResponse.json(
                { error: "Excel file is empty" },
                { status: 400 }
            )
        }

        // ─── Process rows ─────────────────────────────────────────
        const results: { date: string; vegItem: string; nonvegItem: string | null; action: string }[] = []
        const errors: { row: number; error: string }[] = []

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            const rowNum = i + 2 // +2 because row 1 is header, data starts at row 2

            // Find column keys (case-insensitive and trimmed)
            const getCol = (name: string) => Object.keys(row).find((k) => k.toLowerCase().trim() === name)

            const dateKey = getCol("date")
            const vegKey = getCol("veg_item")
            const nonvegKey = getCol("nonveg_item")
            const sideKey = getCol("side_beverage")
            const notesKey = getCol("notes")
            const dayKey = getCol("day")

            if (!dateKey || !row[dateKey]) {
                errors.push({ row: rowNum, error: "Missing date" })
                continue
            }

            if (!vegKey || !row[vegKey]) {
                errors.push({ row: rowNum, error: "Missing veg_item" })
                continue
            }

            // Parse date
            let parsedDate: Date
            const rawDate = row[dateKey]

            if (typeof rawDate === "number") {
                // Excel serial date number
                parsedDate = new Date((rawDate - 25569) * 86400 * 1000)
            } else {
                parsedDate = new Date(rawDate)
            }

            if (isNaN(parsedDate.getTime())) {
                errors.push({ row: rowNum, error: `Invalid date: ${rawDate}` })
                continue
            }

            parsedDate.setHours(0, 0, 0, 0)

            const vegItem = String(row[vegKey]).trim()
            const nonvegItem = nonvegKey && row[nonvegKey] ? String(row[nonvegKey]).trim() : null
            const sideBeverage = sideKey && row[sideKey] ? String(row[sideKey]).trim() : null
            const notes = notesKey && row[notesKey] ? String(row[notesKey]).trim() : null
            const day = dayKey && row[dayKey] ? String(row[dayKey]).trim() : null

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
