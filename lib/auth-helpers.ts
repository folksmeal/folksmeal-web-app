import { auth } from "@/lib/auth"

/**
 * Requires the current user to be a SUPERADMIN or ADMIN.
 * Returns the session user or null if unauthorized.
 */
export async function requireAdmin() {
    const session = await auth()
    if (!session?.user) return null
    if (session.user.role !== "SUPERADMIN" && session.user.role !== "ADMIN") return null
    return session.user
}

/**
 * Requires the current user to be an authenticated EMPLOYEE.
 * Returns the session user or null if unauthorized.
 */
export async function requireEmployee() {
    const session = await auth()
    if (!session?.user) return null
    if (session.user.role !== "EMPLOYEE") return null
    if (!session.user.addressId) return null
    return session.user
}

/**
 * Gets the effective address ID for an admin or employee session.
 * For a SUPERADMIN without an explicit address selected, defaults to the first available company address.
 * For an ADMIN, forces matching their company context.
 */
export async function getEffectiveAddressId(user: { role?: string; addressId?: string | null; companyId?: string | null }) {
    if (user.addressId) return user.addressId

    if (user.role === "SUPERADMIN" || user.role === "ADMIN") {
        const { prisma } = await import("@/lib/prisma")
        const firstAddress = await prisma.companyAddress.findFirst({
            where: user.role === "ADMIN" && user.companyId ? { companyId: user.companyId } : {},
            include: { company: true },
            orderBy: [{ company: { name: "asc" } }, { city: "asc" }]
        })
        return firstAddress?.id
    }

    return undefined
}
