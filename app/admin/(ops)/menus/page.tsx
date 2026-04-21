import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getEffectiveAddressId } from "@/lib/auth-helpers"
import { isCompanyAdminFeatureEnabled } from "@/lib/company-admin-features"
import { redirect } from "next/navigation"
import {
    formatISTDisplayDayName,
    formatISTDisplayMonthDay,
    formatISTDisplayMonthDayYear,
    formatISTDisplayRange,
    formatInIST,
    getISTDate,
    getISTDateString
} from "@/lib/utils/time"

export default async function MenusPage() {
    const session = await auth()
    if (!session?.user) return null
    const hasMenuAccess = await isCompanyAdminFeatureEnabled(session.user, "menu")
    if (!hasMenuAccess) redirect("/admin/dashboard")

    const effectiveAddressId = await getEffectiveAddressId(session.user)

    const istDate = getISTDate()
    const now = new Date(Date.UTC(istDate.year, istDate.month, istDate.day))
    const todayStr = getISTDateString()

    // Use UTC-safe start/end of week logic
    const startOfWk = new Date(now)
    const day = now.getUTCDay()
    const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1) // Adjust for week starting Monday (1)
    startOfWk.setUTCDate(diff)
    startOfWk.setUTCHours(0, 0, 0, 0)

    const endOfWk = new Date(startOfWk)
    endOfWk.setUTCDate(startOfWk.getUTCDate() + 6)
    endOfWk.setUTCHours(23, 59, 59, 999)

    const start = startOfWk
    const end = endOfWk

    const [activeAddress, menus] = await Promise.all([
        effectiveAddressId
            ? prisma.companyAddress.findUnique({
                where: { id: effectiveAddressId },
                include: { company: true },
            })
            : null,
        prisma.menu.findMany({
            where: {
                ...(effectiveAddressId ? { addressId: effectiveAddressId } : {}),
                date: {
                    gte: start,
                    lte: end,
                },
            },
            orderBy: { date: "asc" },
        })
    ])

    const workingDays = activeAddress?.workingDays?.length ? activeAddress.workingDays : [1, 2, 3, 4, 5]

    // Manual interval generation to keep UTC-midnight objects
    const weekDays: Date[] = []
    for (let i = 0; i < 7; i++) {
        const d = new Date(start)
        d.setUTCDate(start.getUTCDate() + i)
        if (workingDays.includes(d.getUTCDay())) {
            weekDays.push(d)
        }
    }

    const menuByDate = new Map(menus.map((menu) => [menu.date.toISOString().split("T")[0], menu]))
    const locationLabel = activeAddress ? `${activeAddress.company.name} - ${activeAddress.city}` : "Selected location"

    return (
        <div className="flex flex-col h-full gap-6 overflow-hidden">
            <div className="rounded-lg border border-border bg-card px-4 py-3 sm:px-5 sm:py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 space-y-0.5">
                        <h1 className="text-lg font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                            Menu
                        </h1>
                        <p className="max-w-2xl text-sm text-muted-foreground">
                            This week&apos;s menu for {locationLabel}.
                        </p>
                    </div>
                    <div className="shrink-0 self-start rounded-xl border border-border bg-muted/30 px-4 py-2 text-center lg:self-auto">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            This Week
                        </p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                            {formatISTDisplayRange(start, end)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-auto">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {weekDays.map((day) => {
                        const key = getISTDateString(day)
                        const menu = menuByDate.get(key)
                        const today = key === todayStr

                        return (
                            <div
                                key={key}
                                className={[
                                    "rounded-lg border bg-card p-5 shadow-sm transition-colors",
                                    today ? "border-primary bg-primary/5" : "border-border",
                                ].join(" ")}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="space-y-1">
                                        <p
                                            className="text-sm font-semibold text-foreground"
                                            style={{ fontFamily: "var(--font-heading)" }}
                                        >
                                            {formatISTDisplayDayName(day, "long")}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatISTDisplayMonthDayYear(day)}
                                        </p>
                                    </div>
                                    {today && (
                                        <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                                            Today
                                        </span>
                                    )}
                                </div>

                                {menu ? (
                                    <div className="mt-5 space-y-4">
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Veg</p>
                                            <p className="text-sm font-medium text-foreground">{menu.vegItem}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Non-Veg</p>
                                            <p className="text-sm text-foreground">{menu.nonvegItem || "Not available"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Side / Beverage</p>
                                            <p className="text-sm text-foreground">{menu.sideBeverage || "Not available"}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
                                        <p className="text-sm font-medium text-muted-foreground">No menu published</p>
                                        <p className="mt-1 text-xs text-muted-foreground">Nothing has been uploaded for this day yet.</p>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {weekDays.length === 0 && (
                    <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
                        No working days are configured for this location.
                    </div>
                )}

                {weekDays.length > 0 && menus.length === 0 && (
                    <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground mt-4">
                        No menus uploaded for this week.
                    </div>
                )}
            </div>
        </div>
    )
}
