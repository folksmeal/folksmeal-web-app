import { AdminEmployeeManagement } from "@/components/admin/admin-employee-management"
import { auth } from "@/lib/auth"
import { getEffectiveAddressId } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

export default async function AdminEmployeesPage({
    searchParams
}: {
    searchParams: Promise<{ search?: string, empPage?: string }>
}) {
    const session = await auth()
    if (!session?.user) return null

    const effectiveAddressId = await getEffectiveAddressId(session.user)
    const params = await searchParams

    const search = params.search || ""
    const empPage = Math.max(1, parseInt(params.empPage || "1"))
    const limit = 15
    const empSkip = (empPage - 1) * limit

    const empWhere = {
        ...(effectiveAddressId ? { addressId: effectiveAddressId } : {}),
        ...(session.user.role === "ADMIN" ? { companyId: session.user.companyId! } : {}),
        ...(search ? {
            OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { employeeCode: { contains: search, mode: "insensitive" as const } }
            ]
        } : {})
    }

    const [employees, totalEmployees] = await Promise.all([
        prisma.employee.findMany({
            where: empWhere,
            include: { company: true, address: true },
            orderBy: { name: "asc" },
            take: limit,
            skip: empSkip,
        }),
        prisma.employee.count({ where: empWhere }),
    ])

    const serializedEmployees = employees.map((e) => ({
        id: e.id,
        name: e.name,
        employeeCode: e.employeeCode,
        email: e.email,
        defaultPreference: (e.defaultPreference as "VEG" | "NONVEG" | null) ?? "VEG",
        companyId: e.companyId,
        addressId: e.addressId,
        companyName: e.company.name,
        addressCity: e.address.city,
        createdAt: e.createdAt.toISOString(),
    }))

    return (
        <div className="flex-1 h-full overflow-hidden">
            <AdminEmployeeManagement
                effectiveAddressId={effectiveAddressId || undefined}
                initialEmployees={serializedEmployees}
                totalEmployees={totalEmployees}
                initialUsers={[]}
                totalUsers={0}
                isAdminPortal={true}
                apiBasePath="/admin"
            />
        </div>
    )
}
