"use client"
import { useState, useCallback } from "react"
import Image from "next/image"
import { signOut } from "next-auth/react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
    LogOut,
    Download,
    Upload,
    Users,
    Leaf,
    Drumstick,
    XCircle,
    Loader2,
    CalendarDays,
} from "lucide-react"
import { MenuUploader } from "@/components/ops/menu-uploader"
import { format, parseISO } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { CompanySwitcher, type ManagedCompany } from "@/components/ops/company-switcher"

interface SelectionRow {
    employeeName: string
    employeeCode: string
    company: string
    status: string
    preference: string | null
    date: string
    updatedAt: string
}

interface Stats {
    total: number
    optedIn: number
    optedOut: number
    vegCount: number
    nonvegCount: number
}

interface OpsDashboardProps {
    userName: string
    companyName: string
    initialDate: string
    initialRows: SelectionRow[]
    initialStats: Stats
    initialManagedCompanies: ManagedCompany[]
}

const emptyStats: Stats = { total: 0, optedIn: 0, optedOut: 0, vegCount: 0, nonvegCount: 0 }

export function OpsDashboard({
    companyName,
    initialDate,
    initialRows,
    initialStats,
    initialManagedCompanies,
}: OpsDashboardProps) {
    const [date, setDate] = useState(initialDate)
    const [showUploader, setShowUploader] = useState(false)
    const [managedCompanies] = useState<ManagedCompany[]>(initialManagedCompanies)

    const fetcher = (url: string) => fetch(url).then(res => res.json())

    const { data, error, isLoading } = useSWR(
        `/api/ops/selections?date=${date}`,
        fetcher,
        {
            fallbackData: date === initialDate
                ? { rows: initialRows, stats: initialStats }
                : undefined,
            refreshInterval: 10000,
            revalidateOnFocus: true,
        }
    )

    const rows: SelectionRow[] = data?.rows ?? []
    const stats: Stats = data?.stats ?? emptyStats
    const showSkeletons = !data && isLoading

    const handleExportCSV = useCallback(() => {
        if (!rows.length) return
        const headers = [
            "Employee Name",
            "Employee ID",
            "Company",
            "Opt Status",
            "Veg/NonVeg",
            "Date",
            "Last Updated",
        ]
        const csvRows = rows.map((r) => [
            r.employeeName,
            r.employeeCode,
            r.company,
            r.status === "OPT_IN" ? "Opted In" : "Opted Out",
            r.preference || "-",
            format(parseISO(r.date), "dd MMM yyyy"),
            format(parseISO(r.updatedAt), "dd MMM yyyy, hh:mm a"),
        ])
        csvRows.push([])
        csvRows.push(["--- SUMMARY ---"])
        csvRows.push(["Total Selections", String(stats.total)])
        csvRows.push(["Opted In", String(stats.optedIn)])
        csvRows.push(["Veg Count", String(stats.vegCount)])
        csvRows.push(["Non-Veg Count", String(stats.nonvegCount)])
        csvRows.push(["Opted Out", String(stats.optedOut)])
        const csv = [headers, ...csvRows]
            .map((row) =>
                (row as string[])
                    .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
                    .join(",")
            )
            .join("\n")
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `folksmeal-prep-sheet-${date}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }, [rows, stats, date])

    const handleLogout = useCallback(async () => {
        await signOut({ callbackUrl: "/ops" })
    }, [])

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-border bg-card">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Image
                            src="/logo-large.png"
                            alt="FolksMeal"
                            width={130}
                            height={34}
                            className="h-8 w-auto"
                            priority
                        />
                        <div className="h-8 w-px bg-border max-sm:hidden" />
                        <CompanySwitcher
                            currentCompanyName={companyName}
                            managedCompanies={managedCompanies}
                        />
                    </div>
                    <Button
                        variant="outline"
                        onClick={handleLogout}
                        className="h-10 rounded-xl border-input bg-card px-5 font-semibold transition-all hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30"
                    >
                        <LogOut className="h-3.5 w-3.5" />
                        Sign Out
                    </Button>
                </div>
            </header>
            <main className="mx-auto max-w-7xl px-6 py-6">
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-[160px] justify-start text-left font-normal bg-card rounded-xl",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarDays className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                                        {date ? format(parseISO(date), "dd MMM yyyy") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 rounded-xl overflow-hidden" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={parseISO(date)}
                                        onSelect={(val) => {
                                            if (val) {
                                                const d = new Date(val)
                                                d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
                                                setDate(d.toISOString().split("T")[0])
                                            }
                                        }}
                                        initialFocus
                                        className="rounded-xl"
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowUploader(!showUploader)}
                            >
                                <Upload className="h-3.5 w-3.5" />
                                Upload Menu
                            </Button>
                            <Button
                                onClick={handleExportCSV}
                                disabled={!rows.length}
                            >
                                <Download className="h-3.5 w-3.5" />
                                Export CSV
                            </Button>
                        </div>
                    </div>

                    {showUploader && (
                        <MenuUploader onClose={() => setShowUploader(false)} />
                    )}

                    {error && (
                        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
                            <XCircle className="h-5 w-5 text-destructive" />
                            <p className="text-sm text-destructive">
                                Failed to fetch live updates. Using cached data.
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                            { label: "Total Opted In", icon: Users, color: "text-primary", value: stats.optedIn },
                            { label: "Veg Count", icon: Leaf, color: "text-veg", value: stats.vegCount },
                            { label: "Non-Veg Count", icon: Drumstick, color: "text-nonveg", value: stats.nonvegCount },
                            { label: "Opted Out", icon: XCircle, color: "text-muted-foreground", value: stats.optedOut },
                        ].map((stat, i) => (
                            <div key={i} className="rounded-lg border border-border bg-card p-4 h-[100px] flex flex-col justify-between">
                                <div className="flex items-center gap-2">
                                    <stat.icon className={cn("h-4 w-4", stat.color)} />
                                    <p className="text-xs font-medium text-muted-foreground">
                                        {stat.label}
                                    </p>
                                </div>
                                {showSkeletons ? (
                                    <Skeleton className="h-8 w-16" />
                                ) : (
                                    <p className="text-2xl font-bold text-foreground">
                                        {stat.value}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                    <Separator />

                    <div className="rounded-lg border border-border bg-card">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/50">
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                            Employee Name
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                            Employee ID
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                            Company
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                            Opt Status
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                            Veg/NonVeg
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                            Date
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {showSkeletons ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={`skeleton-${i}`} className="border-b border-border last:border-0">
                                                <td className="px-4 py-4"><Skeleton className="h-4 w-32" /></td>
                                                <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                                                <td className="px-4 py-4"><Skeleton className="h-4 w-40" /></td>
                                                <td className="px-4 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                                                <td className="px-4 py-4"><Skeleton className="h-4 w-28" /></td>
                                                <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                                            </tr>
                                        ))
                                    ) : rows.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="px-4 py-12 text-center text-sm text-muted-foreground"
                                            >
                                                No selections found for {format(parseISO(date), "dd MMM yyyy")}
                                            </td>
                                        </tr>
                                    ) : (
                                        rows.map((row, i) => (
                                            <tr
                                                key={i}
                                                className="transition-colors hover:bg-muted/30"
                                            >
                                                <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                                                    {row.employeeName}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                                                    {row.employeeCode}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                                                    {row.company}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3">
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${row.status === "OPT_IN"
                                                            ? "bg-primary/10 text-primary"
                                                            : "bg-muted text-muted-foreground"
                                                            }`}
                                                    >
                                                        {row.status === "OPT_IN" ? "Opted In" : "Opted Out"}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3">
                                                    {row.preference ? (
                                                        <div className="inline-flex items-center gap-2">
                                                            <span
                                                                className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-2 ${row.preference === "VEG"
                                                                    ? "border-veg"
                                                                    : "border-nonveg"
                                                                    }`}
                                                            >
                                                                <span
                                                                    className={`block h-2 w-2 rounded-full ${row.preference === "VEG"
                                                                        ? "bg-veg"
                                                                        : "bg-nonveg"
                                                                        }`}
                                                                />
                                                            </span>
                                                            <span className="text-xs leading-none text-muted-foreground">
                                                                {row.preference === "VEG" ? "Veg" : "Non-Veg"}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">
                                                            —
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                                                    {format(parseISO(row.date), "dd MMM yyyy")}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}