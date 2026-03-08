import { CompanyManagement } from "@/components/ops/company-management"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export default async function CompaniesPage({
    searchParams
}: {
    searchParams: Promise<{ page?: string }>
}) {
    const session = await auth()
    if (!session?.user) return null

    const params = await searchParams
    const page = Math.max(1, parseInt(params.page || "1"))
    const limit = 5
    const skip = (page - 1) * limit

    const [companies, totalCompanies] = await Promise.all([
        prisma.company.findMany({
            include: {
                addresses: { orderBy: { city: "asc" } },
                _count: { select: { employees: true } },
            },
            orderBy: { name: "asc" },
            skip,
            take: limit
        }),
        prisma.company.count()
    ])

    const serializedCompanies = companies.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        domain: c.domain,
        employeeCount: c._count.employees,
        addresses: c.addresses.map((a) => ({
            id: a.id,
            city: a.city,
            state: a.state,
            address: a.address,
            cutoffTime: a.cutoffTime,
            timezone: a.timezone,
            workingDays: a.workingDays,
        })),
    }))

    return <CompanyManagement initialCompanies={serializedCompanies} totalCompanies={totalCompanies} />
}
