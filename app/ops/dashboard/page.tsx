import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { OpsDashboard } from "@/components/ops/ops-dashboard"

export default async function OpsDashboardPage() {
    const session = await auth()

    if (!session?.user) {
        redirect("/ops")
    }

    if ((session.user as any).role !== "OPS") {
        redirect("/ops")
    }

    return (
        <OpsDashboard
            userName={session.user.name}
            officeName={(session.user as any).officeName}
        />
    )
}
