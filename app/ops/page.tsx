import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { OpsLoginScreen } from "@/components/ops/ops-login-screen"

export default async function OpsLoginPage() {
    const session = await auth()

    // Already authenticated as OPS → go to ops dashboard
    if (session?.user && (session.user as { role: string }).role === "OPS") {
        redirect("/ops/dashboard")
    }

    return <OpsLoginScreen />
}
