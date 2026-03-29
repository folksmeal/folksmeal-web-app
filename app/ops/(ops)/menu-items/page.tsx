import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { MenuItemUploadButton } from "@/components/ops/menu-item-upload-button"
import { MenuItemActions } from "@/components/ops/menu-item-actions"
import { PaginationFooter } from "@/components/ops/pagination-footer"
import { SearchInputContainer } from "./SearchInputContainer"

export default async function MenuItemsPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
    const session = await auth()
    if (!session?.user || session.user.role !== "SUPERADMIN") {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <h1 className="text-xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground">Only Super Admins can access Menu Items.</p>
            </div>
        )
    }

    const params = await searchParams

    const page = Number(params.page) || 1
    const query = params.q || ""
    const take = 15
    const skip = (page - 1) * take

    const where = query ? {
        OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { description: { contains: query, mode: "insensitive" as const } }
        ]
    } : {}

    const [items, totalItems] = await Promise.all([
        prisma.menuItem.findMany({
            where,
            orderBy: { name: "asc" },
            take,
            skip,
        }),
        prisma.menuItem.count({ where })
    ])

    const totalPages = Math.ceil(totalItems / take)

    return (
        <div className="flex flex-col h-full gap-6 overflow-hidden">
            <div className="rounded-lg border border-border bg-card px-4 py-3 sm:px-5 sm:py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 space-y-0.5">
                        <h1 className="text-lg font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                            Menu Items
                        </h1>
                        <p className="max-w-2xl text-sm text-muted-foreground">
                            Manage the global catalog of menu items and their descriptions.
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center justify-start lg:justify-end">
                        <MenuItemUploadButton />
                    </div>
                </div>
            </div>

            <div className="rounded-lg border border-border bg-card flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="shrink-0 border-b border-border bg-slate-50/80 px-4 py-3 sm:px-5 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>Menu Items</p>
                    </div>
                    <div className="w-full max-w-sm">
                        <SearchInputContainer initialQuery={query} />
                    </div>
                </div>
                <div className="shrink-0 border-b border-border bg-slate-50">
                    <table className="w-full text-sm">
                        <thead>
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-[30%]">Name</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-[55%]">Description</th>
                                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground w-[15%]">Actions</th>
                            </tr>
                        </thead>
                    </table>
                </div>
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm table-fixed">
                        <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-4 py-12 text-center text-sm text-muted-foreground">
                                        No menu items found
                                    </td>
                                </tr>
                            ) : (
                                items.map((item) => (
                                    <tr key={item.id} className="transition-colors hover:bg-muted/30 border-b border-border">
                                        <td className="px-4 py-3 font-medium text-foreground w-[30%]">
                                            {item.name}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground w-[55%] wrap-break-word">
                                            {item.description || <span className="text-muted-foreground/30 italic text-xs">No description</span>}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right w-[15%]">
                                            <MenuItemActions id={item.id} name={item.name} description={item.description} />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="shrink-0 border-t border-border bg-card">
                    <PaginationFooter
                        page={page}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        pageSize={take}
                        hrefPrefix="/ops/menu-items?page="
                    />
                </div>
            </div>
        </div>
    )
}
