import { auth } from "@/lib/auth"

/**
 * Requires the current user to be a SUPERADMIN.
 * Returns the session user or null if unauthorized.
 */
export async function requireAdmin() {
    const session = await auth()
    if (!session?.user) return null
    if (session.user.role !== "SUPERADMIN") return null
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
 */
export async function getEffectiveAddressId(user: { role?: string; addressId?: string | null }) {
    if (user.addressId) return user.addressId

    if (user.role === "SUPERADMIN") {
        const { prisma } = await import("@/lib/prisma")
        const firstAddress = await prisma.companyAddress.findFirst({
            include: { company: true },
            orderBy: [{ company: { name: "asc" } }, { city: "asc" }]
        })
        return firstAddress?.id
    }

    return undefined
}
