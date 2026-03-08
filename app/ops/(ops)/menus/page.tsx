import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getEffectiveAddressId } from "@/lib/auth-helpers"
import { MenuUploadButton } from "@/components/ops/menu-upload-button"
import { PaginationFooter } from "@/components/ops/pagination-footer"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export default async function MenusPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
    const session = await auth()
    if (!session?.user) return null

    const effectiveAddressId = await getEffectiveAddressId(session.user)
    const params = await searchParams

    const page = Number(params.page) || 1
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
        <div className="flex flex-col h-full gap-6 overflow-hidden">
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
                <div className="shrink-0 border-b border-border bg-slate-50">
                    <table className="w-full text-sm">
                        <thead>
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-[20%]">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-[25%]">Veg Item</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-[25%]">Non-Veg Item</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-[15%]">Side/Beverage</th>
                                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground w-[15%]">Actions</th>
                            </tr>
                        </thead>
                    </table>
                </div>
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm table-fixed">
                        <tbody>
                            {menus.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                                        No menus uploaded yet
                                    </td>
                                </tr>
                            ) : (
                                menus.map((menu, i) => (
                                    <tr key={menu.id} className="transition-colors hover:bg-muted/30 border-b border-border">
                                        <td className="truncate px-4 py-3 font-medium text-foreground w-[20%]">
                                            {format(menu.date, "EEE, dd MMM yyyy")}
                                        </td>
                                        <td className="truncate px-4 py-3 text-muted-foreground w-[25%]">{menu.vegItem}</td>
                                        <td className="truncate px-4 py-3 text-muted-foreground w-[25%]">{menu.nonvegItem || "—"}</td>
                                        <td className="truncate px-4 py-3 text-muted-foreground w-[15%]">{menu.sideBeverage || "—"}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right w-[15%]">
                                            <span className="text-xs text-muted-foreground/30">—</span>
                                        </td>
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
                    hrefPrefix="/ops/menus?page="
                />
            </div>
        </div>
    )
}
