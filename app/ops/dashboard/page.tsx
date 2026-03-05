import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { OpsDashboard } from "@/components/ops/ops-dashboard"

export default async function OpsDashboardPage() {
    const session = await auth()

    if (!session?.user) {
        redirect("/ops")
    }

    if (session.user.role !== "OPS") {
        redirect("/ops")
    }

    const sessionUser = session.user
    const companyName = sessionUser.companyName || "Company"
    const officeName = sessionUser.officeName || "Office"

    return (
        <OpsDashboard
            userName={session.user.name || "Ops"}
            officeName={`${companyName} - ${officeName}`}
        />
    )
}
