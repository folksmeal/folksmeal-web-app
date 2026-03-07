import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { OpsSidebar } from "@/components/ops/ops-sidebar"
import { cache } from "react"

const getLocations = cache(async () => {
    return prisma.companyAddress.findMany({
        include: { company: true },
        orderBy: [{ company: { name: "asc" } }, { city: "asc" }],
    })
})

export default async function OpsAuthenticatedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()
    if (!session?.user) {
        redirect("/ops")
    }

    const role = session.user.role as string
    if (role !== "SUPERADMIN") {
        redirect("/ops")
    }

    const sessionUser = session.user
    const locations = await getLocations()

    const managedCompanies = locations.map((loc) => ({
        id: loc.id,
        name: `${loc.company.name} - ${loc.city}`,
        companyId: loc.companyId,
        companyName: loc.company.name,
        addressCity: loc.city,
        locationTimezone: loc.timezone,
    }))

    let locationName = "Select Company"
    if (sessionUser.companyName && sessionUser.addressCity) {
        locationName = `${sessionUser.companyName} - ${sessionUser.addressCity}`
    } else if (managedCompanies.length > 0) {
        locationName = managedCompanies[0].name
    }


    return (
        <div className="min-h-screen bg-background">
            <OpsSidebar
                companyName={locationName}
                managedCompanies={managedCompanies}
            />
            <div className="lg:pl-64">
                <main className="mx-auto max-w-7xl px-6 py-6 pt-16 lg:pt-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
