import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { OpsDashboard } from "@/components/ops/ops-dashboard"

export default async function OpsDashboardPage() {
    const session = await auth()

    if (!session?.user) {
        redirect("/ops")
    }

    if ((session.user as { role: string }).role !== "OPS") {
        redirect("/ops")
    }

    return (
        <OpsDashboard
            userName={session.user.name}
            officeName={(session.user as { officeName: string }).officeName}
        />
    )
}
