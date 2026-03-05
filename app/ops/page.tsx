import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { OpsLoginScreen } from "@/components/ops/ops-login-screen"

export default async function OpsLoginPage() {
    const session = await auth()

    if (session?.user) {
        const role = (session.user as { role: string }).role
        if (role === "SUPERADMIN") {
            redirect("/ops/dashboard")
        }
    }

    return <OpsLoginScreen />
}
