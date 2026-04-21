import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, getEffectiveAddressId } from "@/lib/auth-helpers"
import { formatInIST, getTomorrowMidnightInTimezone } from "@/lib/utils/time"

export async function GET(request: NextRequest) {
    try {
        const user = await requireAdmin()
        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const dateParam = searchParams.get("date")
        const statusParam = searchParams.get("status") || "all"
        const isAdminPortalStr = searchParams.get("isAdminPortal") === "true"

        const queryAddressId = searchParams.get("addressId")
        const effectiveAddressId = queryAddressId || await getEffectiveAddressId(user)

        const whereClauseAddress = {
            ...(effectiveAddressId ? { addressId: effectiveAddressId } : {}),
            ...(user.role === "ADMIN" && user.companyId ? { companyId: user.companyId } : {})
        }

        let targetDate: Date
        if (dateParam) {
            targetDate = new Date(dateParam + "T00:00:00.000Z")
            if (isNaN(targetDate.getTime())) {
                return new NextResponse("Invalid date format", { status: 400 })
            }
        } else {
            const timezone = (user.locationTimezone as string) || "Asia/Kolkata"
            targetDate = getTomorrowMidnightInTimezone(timezone)
        }

        const [selections, employeesWithoutSelection] = await Promise.all([
            prisma.mealSelection.findMany({
                where: {
                    date: targetDate,
                    employee: whereClauseAddress,
                },
                include: {
                    employee: {
                        include: { company: true, address: true },
                    },
                    addons: {
                        include: { addon: true }
                    }
                },
                orderBy: { employee: { name: "asc" } },
            }),
            prisma.employee.findMany({
                where: {
                    ...whereClauseAddress,
                    selections: {
                        none: { date: targetDate },
                    },
                },
                include: { company: true, address: true },
                orderBy: { name: "asc" },
            }),
        ])

        const optedIn = selections.filter((s) => s.status === "OPT_IN")
        const optedOut = selections.filter((s) => s.status === "OPT_OUT")

        const stats = {
            total: selections.length,
            optedIn: optedIn.length,
            optedOut: optedOut.length,
            vegCount: optedIn.filter((s) => s.preference === "VEG").length,
            nonvegCount: optedIn.filter((s) => s.preference === "NONVEG").length,
            totalEmployees: selections.length + employeesWithoutSelection.length,
            missingInput: employeesWithoutSelection.length,
        }

        const dateStr = targetDate.toISOString().split("T")[0]
        const formattedTargetDate = formatInIST(targetDate, {
            day: "2-digit",
            month: "short",
            year: "numeric",
        })

        const selectionRows = selections.map((s) => ({
            employeeName: s.employee.name,
            employeeCode: s.employee.employeeCode,
            company: `${s.employee.company.name} - ${s.employee.address.city}`,
            status: s.status,
            preference: s.preference || null,
            addons: s.addons
                .map(a => `${a.quantity}x ${a.addon.name} (₹${a.priceAtSelection})`)
                .join(", "),
            date: formattedTargetDate,
            updatedAt: s.updatedAt
                ? formatInIST(s.updatedAt, {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                })
                : "-",
        }))

        const noSelectionRows = employeesWithoutSelection.map((e) => ({
            employeeName: e.name,
            employeeCode: e.employeeCode,
            company: `${e.company.name} - ${e.address.city}`,
            status: "NO_SELECTION" as const,
            preference: null,
            addons: "",
            date: formattedTargetDate,
            updatedAt: "-",
        }))

        const allRows = [...selectionRows, ...noSelectionRows]

        const filteredRows = allRows.filter((row) => {
            if (statusParam === "all") return true
            if (statusParam === "opted_in") return row.status === "OPT_IN"
            if (statusParam === "opted_out") return row.status === "OPT_OUT"
            if (statusParam === "no_selection") return row.status === "NO_SELECTION"
            return true
        })

        // CSV Headers
        const headers = [
            "Employee Name",
            "Employee ID",
            ...(isAdminPortalStr ? [] : ["Company"]),
            "Opt Status",
            "Veg/NonVeg",
            "Add-ons",
            "Date",
            "Last Updated",
        ]

        // CSV Data
        const csvRowsData = filteredRows.map((r) => [
            r.employeeName,
            r.employeeCode,
            ...(isAdminPortalStr ? [] : [r.company]),
            r.status === "OPT_IN" ? "Opted In" : r.status === "OPT_OUT" ? "Opted Out" : "No Selection",
            r.preference || "-",
            r.addons || "-",
            r.date,
            r.updatedAt,
        ])

        // Summary Rows
        csvRowsData.push([])
        csvRowsData.push(["--- SUMMARY ---"])
        csvRowsData.push(["Total Employees", String(stats.totalEmployees)])
        csvRowsData.push(["Opted In", String(stats.optedIn)])
        csvRowsData.push(["Veg Count", String(stats.vegCount)])
        csvRowsData.push(["Non-Veg Count", String(stats.nonvegCount)])
        csvRowsData.push(["Opted Out", String(stats.optedOut)])
        csvRowsData.push(["Missing Input", String(stats.missingInput)])

        // Add-ons Summary Calculation
        const addonTotals = new Map<string, { count: number, revenue: number }>()
        selections.forEach((s) => {
            const matchesFilter = statusParam === "all" || (statusParam === "opted_in" && s.status === "OPT_IN") || (statusParam === "opted_out" && s.status === "OPT_OUT")
            if (matchesFilter && s.addons.length > 0) {
                s.addons.forEach((a) => {
                    const name = a.addon.name
                    const qty = a.quantity
                    const rev = qty * a.priceAtSelection
                    const existing = addonTotals.get(name) || { count: 0, revenue: 0 }
                    addonTotals.set(name, { count: existing.count + qty, revenue: existing.revenue + rev })
                })
            }
        })

        if (addonTotals.size > 0) {
            csvRowsData.push([])
            csvRowsData.push(["--- ADD-ONS SUMMARY ---"])
            csvRowsData.push(["Add-on Name", "Total Quantity Sold", "Total Amount"])
            Array.from(addonTotals.entries())
                .sort((a, b) => a[0].localeCompare(b[0]))
                .forEach(([name, stats]) => {
                    csvRowsData.push([name, String(stats.count), `₹${stats.revenue}`])
                })

            const grandTotal = Array.from(addonTotals.values()).reduce((sum, stats) => sum + stats.revenue, 0)
            csvRowsData.push(["GRAND TOTAL", "", `₹${grandTotal}`])
        }

        const csvContent = "\uFEFF" + [headers, ...csvRowsData]
            .map((row) =>
                (row as string[])
                    .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
                    .join(",")
            )
            .join("\n")

        const filename = isAdminPortalStr
            ? `daily-selections-report-${dateStr}.csv`
            : `folksmeal-prep-sheet-${dateStr}.csv`

        return new NextResponse(csvContent, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        })

    } catch (error) {
        console.error("Failed to generate selections export:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
