import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AdminSidebar } from "@/components/ops/admin-sidebar"
import { cache } from "react"
import { isCompanyAdminFeatureEnabled } from "@/lib/company-admin-features"

const getLocations = cache(async (companyId?: string | null) => {
    return prisma.companyAddress.findMany({
        where: companyId ? { companyId } : {},
        include: { company: true },
        orderBy: [{ company: { name: "asc" } }, { city: "asc" }],
    })
})

export default async function AdminAuthenticatedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()
    if (!session?.user) {
        redirect("/admin")
    }

    const { role, companyId } = session.user
    if (role !== "SUPERADMIN" && role !== "ADMIN") {
        redirect("/admin")
    }

    const sessionUser = session.user
    const locations = await getLocations(role === "ADMIN" ? companyId : undefined)
    const [showEmployeeManagement, showMenu, showReviews] = await Promise.all([
        isCompanyAdminFeatureEnabled(sessionUser, "employeeManagement"),
        isCompanyAdminFeatureEnabled(sessionUser, "menu"),
        isCompanyAdminFeatureEnabled(sessionUser, "reviews"),
    ])

    const managedCompanies = locations.map((loc) => ({
        id: loc.id,
        name: `${loc.company.name} - ${loc.city}`,
        companyId: loc.companyId,
        companyName: loc.company.name,
        companyIcon: loc.company.icon,
        addressCity: loc.city,
        locationTimezone: loc.timezone,
    }))

    let locationName = "Select Company"
    let currentCompanyIcon = sessionUser.companyIcon

    if (sessionUser.companyName && sessionUser.addressCity) {
        locationName = `${sessionUser.companyName} - ${sessionUser.addressCity}`
    } else if (managedCompanies.length > 0) {
        locationName = managedCompanies[0].name
        currentCompanyIcon = managedCompanies[0].companyIcon
    }


    return (
        <div className="h-screen bg-background overflow-hidden">
            <AdminSidebar
                companyName={locationName}
                companyIcon={currentCompanyIcon}
                managedCompanies={managedCompanies}
                showEmployeeManagement={showEmployeeManagement}
                showMenu={showMenu}
                showReviews={showReviews}
            />
            <div className="lg:pl-64 flex flex-col h-screen w-full overflow-y-auto">
                <main className="flex-1 flex flex-col w-full mx-auto max-w-7xl px-6 py-6 pt-16 lg:pt-6 min-h-0">
                    {children}
                </main>
            </div>
        </div>
    )
}
