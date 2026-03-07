import { auth } from "@/lib/auth"

export async function requireAdmin() {
    const session = await auth()
    if (!session?.user) return null
    if ((session.user.role as string) !== "SUPERADMIN") return null
    return session.user
}
