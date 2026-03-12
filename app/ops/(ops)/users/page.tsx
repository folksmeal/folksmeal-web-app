import { UserManagement } from "@/components/ops/user-management"
import { auth } from "@/lib/auth"
import { getEffectiveAddressId } from "@/lib/auth-helpers"

import { prisma } from "@/lib/prisma"

export default async function UsersPage({
    searchParams
}: {
    searchParams: Promise<{ search?: string, tab?: string, empPage?: string, adminPage?: string }>
}) {
    const session = await auth()
    if (!session?.user) return null

    const effectiveAddressId = await getEffectiveAddressId(session.user)
    const params = await searchParams

    const search = params.search || ""
    const empPage = Math.max(1, parseInt(params.empPage || "1"))
    const adminPage = Math.max(1, parseInt(params.adminPage || "1"))
    const limit = 15
    const empSkip = (empPage - 1) * limit
    const adminSkip = (adminPage - 1) * limit

    const empWhere = {
        ...(effectiveAddressId ? { addressId: effectiveAddressId } : {}),
        ...(search ? {
            OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { employeeCode: { contains: search, mode: "insensitive" as const } }
            ]
        } : {})
    }

    const adminWhere = {
        ...(search ? {
            OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { email: { contains: search, mode: "insensitive" as const } }
            ]
        } : {})
    }

    const [employees, totalEmployees, users, totalUsers] = await Promise.all([
        prisma.employee.findMany({
            where: empWhere,
            include: { company: true, address: true },
            orderBy: { name: "asc" },
            take: limit,
            skip: empSkip,
        }),
        prisma.employee.count({ where: empWhere }),
        prisma.user.findMany({
            where: adminWhere,
            include: { company: true },
            orderBy: { name: "asc" },
            take: limit,
            skip: adminSkip,
        }),
        prisma.user.count({ where: adminWhere })
    ])

    const serializedEmployees = employees.map((e) => ({
        id: e.id,
        name: e.name,
        employeeCode: e.employeeCode,
        email: e.email,
        defaultPreference: e.defaultPreference,
        companyId: e.companyId,
        addressId: e.addressId,
        companyName: e.company.name,
        addressCity: e.address.city,
        createdAt: e.createdAt.toISOString(),
    }))

    const serializedUsers = users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        companyId: u.companyId,
        companyName: u.company?.name ?? null,
        createdAt: u.createdAt.toISOString(),
    }))

    return (
        <UserManagement
            effectiveAddressId={effectiveAddressId || undefined}
            initialEmployees={serializedEmployees}
            totalEmployees={totalEmployees}
            initialUsers={serializedUsers}
            totalUsers={totalUsers}
        />
    )
}
