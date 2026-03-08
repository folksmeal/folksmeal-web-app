import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getEffectiveAddressId } from "@/lib/auth-helpers"
import { MenuUploadButton } from "@/components/ops/menu-upload-button"
import { PaginationFooter } from "@/components/ops/pagination-footer"
import { format } from "date-fns"

export default async function MenusPage({ searchParams }: { searchParams: { page?: string } }) {
    const session = await auth()
    if (!session?.user) return null

    const effectiveAddressId = await getEffectiveAddressId(session.user)

    const page = Number(searchParams.page) || 1
    const take = 15
    const skip = (page - 1) * take

    const [menus, totalItems] = await Promise.all([
        prisma.menu.findMany({
            where: effectiveAddressId ? { addressId: effectiveAddressId } : undefined,
            orderBy: { date: "desc" },
            take,
            skip,
        }),
        prisma.menu.count({
            where: effectiveAddressId ? { addressId: effectiveAddressId } : undefined,
        })
    ])

    const totalPages = Math.ceil(totalItems / take)

    return (
        <div className="flex flex-col flex-1 gap-6 min-h-0">
            <div className="shrink-0 flex items-center justify-between">
                <h1
                    className="text-lg font-semibold text-foreground"
                    style={{ fontFamily: "var(--font-heading)" }}
                >
                    Menu Management
                </h1>
                {effectiveAddressId && <MenuUploadButton addressId={effectiveAddressId} />}
            </div>

            <div className="rounded-lg border border-border bg-card flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm relative">
                        <thead className="sticky top-0 bg-slate-50 z-10">
                            <tr className="border-b border-border">
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
                <PaginationFooter
                    page={page}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    pageSize={take}
                    hrefBuilder={(p) => `/ops/menus?page=${p}`}
                />
            </div>
        </div>
    )
}
