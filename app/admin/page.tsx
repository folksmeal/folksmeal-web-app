import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AdminLoginScreen } from "@/components/admin/admin-login-screen"

export default async function AdminLoginPage() {
    const session = await auth()
    if (session?.user) {
        const role = session.user.role
        if (role === "SUPERADMIN") redirect("/ops/dashboard")
        if (role === "ADMIN") redirect("/admin/dashboard")
        redirect("/dashboard")
    }
    return <AdminLoginScreen />
}
