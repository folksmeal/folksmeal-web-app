"use client"
import { useCallback } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
    Download,
    Users,
    Leaf,
    Drumstick,
    XCircle,
    CalendarDays,
    AlertTriangle,
    Filter,
} from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { format, parseISO } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { PaginationFooter } from "@/components/ops/pagination-footer"

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
    totalEmployees: number
    missingInput: number
}

interface OpsDashboardProps {
    userName: string
    companyName: string
    initialDate: string
    initialRows: SelectionRow[]
    totalRows: number
    initialStats: Stats
}

type StatusFilter = "all" | "opted_in" | "opted_out" | "no_selection"

const emptyStats: Stats = { total: 0, optedIn: 0, optedOut: 0, vegCount: 0, nonvegCount: 0, totalEmployees: 0, missingInput: 0 }

import { fetcher } from "@/lib/fetcher"

import { useRouter, useSearchParams, usePathname } from "next/navigation"

export function OpsDashboard({
    initialDate,
    initialRows,
    totalRows,
    initialStats,
}: OpsDashboardProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const dateParam = searchParams.get("date")
    const date = dateParam || initialDate

    const statusFilter = (searchParams.get("status") || "all") as StatusFilter
    const pageParam = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const itemsPerPage = 15

    const query = new URLSearchParams()
    query.set("date", date)
    query.set("status", statusFilter)
    query.set("page", pageParam.toString())
    query.set("limit", itemsPerPage.toString())

    const { data, error, isLoading } = useSWR<{ rows: SelectionRow[]; stats: Stats; pagination?: { total: number } }>(
        `/api/ops/selections?${query.toString()}`,
        fetcher,
        {
            fallbackData: { rows: initialRows, stats: initialStats, pagination: { total: totalRows } },
            refreshInterval: 10000,
            revalidateOnFocus: true,
        }
    )

    const rows: SelectionRow[] = data?.rows ?? []
    const stats: Stats = data?.stats ?? emptyStats
    const showSkeletons = !data && isLoading

    const totalCount = data?.pagination?.total ?? totalRows
    const totalPages = Math.ceil(totalCount / itemsPerPage)

    const handleDateChange = (newDate: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set("date", newDate)
        params.set("page", "1")
        router.push(`${pathname}?${params.toString()}`)
    }

    const handleStatusChange = (newStatus: StatusFilter) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set("status", newStatus)
        params.set("page", "1")
        router.push(`${pathname}?${params.toString()}`)
    }

    const handlePageChange = (p: number) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set("page", p.toString())
        router.push(`${pathname}?${params.toString()}`)
    }

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
            r.status === "OPT_IN" ? "Opted In" : r.status === "OPT_OUT" ? "Opted Out" : "No Selection",
            r.preference || "-",
            format(parseISO(r.date), "dd MMM yyyy"),
            r.updatedAt ? format(parseISO(r.updatedAt), "dd MMM yyyy, hh:mm a") : "-",
        ])
        csvRows.push([])
        csvRows.push(["--- SUMMARY ---"])
        csvRows.push(["Total Employees", String(stats.totalEmployees)])
        csvRows.push(["Opted In", String(stats.optedIn)])
        csvRows.push(["Veg Count", String(stats.vegCount)])
        csvRows.push(["Non-Veg Count", String(stats.nonvegCount)])
        csvRows.push(["Opted Out", String(stats.optedOut)])
        csvRows.push(["Missing Input", String(stats.missingInput)])
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

    const filterOptions: { value: StatusFilter; label: string }[] = [
        { value: "all", label: "All Employees" },
        { value: "opted_in", label: "Opted In" },
        { value: "opted_out", label: "Opted Out" },
        { value: "no_selection", label: "No Selection" },
    ]

    return (
        <div className="flex flex-col flex-1 gap-6 min-h-0">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
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
                                        handleDateChange(d.toISOString().split("T")[0])
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
                        onClick={handleExportCSV}
                        disabled={!rows.length}
                    >
                        <Download className="h-3.5 w-3.5" />
                        Export CSV
                    </Button>
                </div>
            </div>



            {error && (
                <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
                    <XCircle className="h-5 w-5 text-destructive" />
                    <p className="text-sm text-destructive">
                        Failed to fetch live updates. Using cached data.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {[
                    { label: "Total Opted In", icon: Users, color: "text-primary", value: stats.optedIn },
                    { label: "Veg Count", icon: Leaf, color: "text-veg", value: stats.vegCount },
                    { label: "Non-Veg Count", icon: Drumstick, color: "text-nonveg", value: stats.nonvegCount },
                    { label: "Opted Out", icon: XCircle, color: "text-muted-foreground", value: stats.optedOut },
                    { label: "Missing Input", icon: AlertTriangle, color: "text-amber-500", value: stats.missingInput },
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

            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Filter className="h-4 w-4" />
                    <span className="text-xs font-medium">Filter by Status:</span>
                </div>
                <Select
                    value={statusFilter}
                    onValueChange={(val) => handleStatusChange(val as StatusFilter)}
                >
                    <SelectTrigger className="h-9 w-[180px] bg-card rounded-lg border-border">
                        <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        {filterOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="rounded-lg border border-border bg-card flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm relative">
                        <thead className="sticky top-0 bg-slate-50 z-10">
                            <tr className="border-b border-border">
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
                                        No employees found for {format(parseISO(date), "dd MMM yyyy")}
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
                                                className={cn(
                                                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                                    row.status === "OPT_IN" && "bg-primary/10 text-primary",
                                                    row.status === "OPT_OUT" && "bg-muted text-muted-foreground",
                                                    row.status === "NO_SELECTION" && "bg-amber-500/10 text-amber-600"
                                                )}
                                            >
                                                {row.status === "OPT_IN" ? "Opted In" : row.status === "OPT_OUT" ? "Opted Out" : "No Selection"}
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
                                                <span className="text-xs text-muted-foreground">—</span>
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
                <PaginationFooter
                    page={pageParam}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    totalItems={totalCount}
                />
            </div>
        </div>
    )
}