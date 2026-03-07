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
