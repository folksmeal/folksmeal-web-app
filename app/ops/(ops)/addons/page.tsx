import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AddonClient } from "./addon-client"

export default async function AddonsPage() {
    const session = await auth()
    if (!session?.user || session.user.role !== "SUPERADMIN") {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <h1 className="text-xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground">Only Super Admins can access Add-ons.</p>
            </div>
        )
    }

    const addons = await prisma.addon.findMany({
        orderBy: [{ type: "asc" }, { name: "asc" }],
    })

    return (
        <div className="flex flex-col h-full gap-6 overflow-hidden">
            <div className="rounded-lg border border-border bg-card px-4 py-3 sm:px-5 sm:py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 space-y-0.5">
                        <h1 className="text-lg font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                            Add-ons
                        </h1>
                        <p className="max-w-2xl text-sm text-muted-foreground">
                            Manage the global catalog of add-ons available for meal selections.
                        </p>
                    </div>
                </div>
            </div>

            <div className="rounded-lg border border-border bg-card flex flex-col flex-1 min-h-0 overflow-hidden">
                <AddonClient initialAddons={addons} />
            </div>
        </div>
    )
}
