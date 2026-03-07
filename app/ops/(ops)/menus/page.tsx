import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { MenuUploader } from "@/components/ops/menu-uploader"
import { format } from "date-fns"

export default async function MenusPage() {
    const session = await auth()
    if (!session?.user) return null

    const menus = await prisma.menu.findMany({
        where: { addressId: (session.user.addressId as string) || undefined },
        orderBy: { date: "desc" },
        take: 14,
    })

    return (
        <div className="flex flex-col gap-6">
            <h1
                className="text-lg font-semibold text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
            >
                Menu Management
            </h1>

            <MenuUploader />

            <div className="rounded-lg border border-border bg-card">
                <div className="border-b border-border px-5 py-3">
                    <p className="text-sm font-medium text-foreground">Recent Menus</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/50">
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Day</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Veg Item</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Non-Veg Item</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Side/Beverage</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {menus.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                                        No menus uploaded yet
                                    </td>
                                </tr>
                            ) : (
                                menus.map((menu) => (
                                    <tr key={menu.id} className="transition-colors hover:bg-muted/30">
                                        <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                                            {format(menu.date, "dd MMM yyyy")}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                                            {menu.day || "—"}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">{menu.vegItem}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{menu.nonvegItem || "—"}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{menu.sideBeverage || "—"}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
