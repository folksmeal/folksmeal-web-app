import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getEffectiveAddressId } from "@/lib/auth-helpers"
import { formatInIST } from "@/lib/utils/time"

export async function GET(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user || session.user.role !== "SUPERADMIN") {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const effectiveAddressId = await getEffectiveAddressId(session.user)

        const { searchParams } = new URL(req.url)
        const monthParam = searchParams.get("month")

        if (!monthParam) {
            return new NextResponse("Month parameter is required (YYYY-MM)", { status: 400 })
        }

        const [yearRaw, monthRaw] = monthParam.split("-")
        const year = Number(yearRaw)
        const month = Number(monthRaw)
        if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
            return new NextResponse("Invalid month format. Expected YYYY-MM", { status: 400 })
        }

        // Meal selection dates are stored as UTC-midnight instants representing the IST day.
        // Compute an equivalent UTC range for the IST calendar month.
        const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0))
        const endDate = new Date(Date.UTC(year, month, 0, 0, 0, 0, 0))

        const addonSelections = await prisma.mealSelectionAddon.findMany({
            where: {
                mealSelection: {
                    date: {
                        gte: startDate,
                        lte: endDate,
                    },
                    ...(effectiveAddressId && {
                        employee: {
                            addressId: effectiveAddressId,
                        },
                    }),
                },
            },
            include: {
                addon: true,
                mealSelection: {
                    include: {
                        employee: {
                            include: {
                                company: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                mealSelection: {
                    date: "asc",
                },
            },
        })

        // Generate CSV
        const headers = [
            "Date",
            "Company",
            "Employee Name",
            "Employee ID",
            "Add-on Name",
            "Quantity",
            "Unit Price (At Selection)",
            "Total Cost",
        ]

        const csvRows = addonSelections.map((selection) => {
            const date = formatInIST(selection.mealSelection.date, {
                day: "2-digit",
                month: "short",
                year: "numeric",
            })
            const company = selection.mealSelection.employee.company.name
            const empName = selection.mealSelection.employee.name
            const empCode = selection.mealSelection.employee.employeeCode
            const addonName = selection.addon.name
            const qty = selection.quantity
            const price = selection.priceAtSelection
            const total = qty * price

            return [date, company, empName, empCode, addonName, qty.toString(), price.toString(), total.toString()]
        })

        const csvContent = [
            headers.join(","),
            ...csvRows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")),
        ].join("\n")

        return new NextResponse(csvContent, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="addon-invoice-${monthParam}.csv"`,
            },
        })
    } catch (error) {
        console.error("Failed to generate addon invoice:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
