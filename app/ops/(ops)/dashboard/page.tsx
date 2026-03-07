import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getTomorrowMidnightInTimezone } from "@/lib/utils/time"
import { OpsDashboard } from "@/components/ops/ops-dashboard"

export default async function OpsDashboardPage() {
    const session = await auth()
    if (!session?.user) return null

    const sessionUser = session.user
    const timezone = (sessionUser.locationTimezone as string) || "Asia/Kolkata"
    const targetDate = getTomorrowMidnightInTimezone(timezone)

    const [selections, allEmployees] = await Promise.all([
        prisma.mealSelection.findMany({
            where: {
                date: targetDate,
                employee: { addressId: (sessionUser.addressId as string) || undefined },
            },
            include: {
                employee: { include: { company: true, address: true } },
            },
            orderBy: { employee: { name: "asc" } },
        }),
        prisma.employee.findMany({
            where: { addressId: (sessionUser.addressId as string) || undefined },
            include: { company: true, address: true },
            orderBy: { name: "asc" },
        }),
    ])

    const totalEmployees = allEmployees.length

    const selectionEmployeeIds = new Set(selections.map((s) => s.employeeId))
    const employeesWithoutSelection = allEmployees.filter(
        (e) => !selectionEmployeeIds.has(e.id)
    )

    const stats = {
        total: selections.length,
        optedIn: selections.filter((s) => s.status === "OPT_IN").length,
        optedOut: selections.filter((s) => s.status === "OPT_OUT").length,
        vegCount: selections.filter((s) => s.status === "OPT_IN" && s.preference === "VEG").length,
        nonvegCount: selections.filter((s) => s.status === "OPT_IN" && s.preference === "NONVEG").length,
        totalEmployees,
        missingInput: employeesWithoutSelection.length,
    }

    const selectionRows = selections.map((s) => ({
        employeeName: s.employee.name,
        employeeCode: s.employee.employeeCode,
        company: `${s.employee.company.name} - ${s.employee.address.city}`,
        status: s.status,
        preference: s.preference,
        date: s.date.toISOString().split("T")[0],
        updatedAt: s.updatedAt.toISOString(),
    }))

    const noSelectionRows = employeesWithoutSelection.map((e) => ({
        employeeName: e.name,
        employeeCode: e.employeeCode,
        company: `${e.company.name} - ${e.address.city}`,
        status: "NO_SELECTION" as const,
        preference: null,
        date: targetDate.toISOString().split("T")[0],
        updatedAt: "",
    }))

    let companyName = "Global Platform"
    if (sessionUser.companyName && sessionUser.addressCity) {
        companyName = `${sessionUser.companyName} - ${sessionUser.addressCity}`
    } else if (allEmployees.length > 0 && allEmployees[0].company) {
        companyName = `${allEmployees[0].company.name} - ${allEmployees[0].address.city}`
    }

    return (
        <OpsDashboard
            userName={sessionUser.name || "Admin"}
            companyName={companyName}
            initialDate={targetDate.toISOString().split("T")[0]}
            initialRows={[...selectionRows, ...noSelectionRows]}
            initialStats={stats}
        />
    )
}