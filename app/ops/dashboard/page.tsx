import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { OpsDashboard } from "@/components/ops/ops-dashboard"
import { prisma } from "@/lib/prisma"
import { getTomorrowMidnightInTimezone } from "@/lib/utils/time"

export default async function OpsDashboardPage() {
    const session = await auth()
    if (!session?.user) {
        redirect("/ops")
    }

    const role = session.user.role as string
    if (role !== "SUPERADMIN") {
        redirect("/ops")
    }

    const sessionUser = session.user
    const locationName = `${sessionUser.companyName} - ${sessionUser.addressCity}`
    const timezone = session.user.locationTimezone || "Asia/Kolkata"
    const targetDate = getTomorrowMidnightInTimezone(timezone)

    // Fetch Managed Companies
    const locations = await prisma.companyAddress.findMany({
        include: { company: true },
        orderBy: [{ company: { name: 'asc' } }, { city: 'asc' }]
    })
    const managedCompanies = locations.map(loc => ({
        id: loc.id,
        name: `${loc.company.name} - ${loc.city}`,
        companyId: loc.companyId,
        companyName: loc.company.name,
        addressCity: loc.city,
        locationTimezone: loc.timezone
    }))

    // Fetch default selections (tomorrow)
    const selections = await prisma.mealSelection.findMany({
        where: {
            date: targetDate,
            employee: { addressId: sessionUser.addressId },
        },
        include: {
            employee: {
                include: { company: true, address: true },
            },
        },
        orderBy: { employee: { name: "asc" } },
    })

    const stats = {
        total: selections.length,
        optedIn: selections.filter((s) => s.status === "OPT_IN").length,
        optedOut: selections.filter((s) => s.status === "OPT_OUT").length,
        vegCount: selections.filter(
            (s) => s.status === "OPT_IN" && s.preference === "VEG"
        ).length,
        nonvegCount: selections.filter(
            (s) => s.status === "OPT_IN" && s.preference === "NONVEG"
        ).length,
    }

    const rows = selections.map((s) => ({
        employeeName: s.employee.name,
        employeeCode: s.employee.employeeCode,
        company: `${s.employee.company.name} - ${s.employee.address.city}`,
        status: s.status,
        preference: s.preference,
        date: s.date.toISOString().split("T")[0],
        updatedAt: s.updatedAt.toISOString(),
    }))

    return (
        <OpsDashboard
            userName={session.user.name || "Admin"}
            companyName={locationName}
            initialDate={targetDate.toISOString().split("T")[0]}
            initialRows={rows}
            initialStats={stats}
            initialManagedCompanies={managedCompanies}
        />
    )
}