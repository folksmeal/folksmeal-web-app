"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { signOut } from "next-auth/react"
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
    RefreshCw,
    CalendarDays,
    Building,
} from "lucide-react"
import { MenuUploader } from "@/components/ops/menu-uploader"
import { format, parseISO } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface SelectionRow {
    employeeName: string
    employeeCode: string
    office: string
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
    officeName: string
}

export function OpsDashboard({ userName, officeName }: OpsDashboardProps) {
    const [date, setDate] = useState(() => {
        const d = new Date()
        d.setDate(d.getDate() + 1)
        return d.toISOString().split("T")[0]
    })
    const [rows, setRows] = useState<SelectionRow[]>([])
    const [stats, setStats] = useState<Stats>({
        total: 0,
        optedIn: 0,
        optedOut: 0,
        vegCount: 0,
        nonvegCount: 0,
    })
    const [loading, setLoading] = useState(true)
    const [showUploader, setShowUploader] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/ops/selections?date=${date}`)
            if (!res.ok) throw new Error("Failed to fetch")
            const data = await res.json()
            setRows(data.rows)
            setStats(data.stats)
        } catch (error) {
            console.error("Failed to fetch selections:", error)
        } finally {
            setLoading(false)
        }
    }, [date])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleExportCSV = useCallback(() => {
        if (!rows.length) return

        const headers = [
            "Employee Name",
            "Employee ID",
            "Office",
            "Opt Status",
            "Veg/NonVeg",
            "Date",
            "Last Updated",
        ]

        const csvRows = rows.map((r) => [
            r.employeeName,
            r.employeeCode,
            r.office,
            r.status === "OPT_IN" ? "Opted In" : "Opted Out",
            r.preference || "-",
            format(parseISO(r.date), "dd MMM yyyy"),
            format(parseISO(r.updatedAt), "dd MMM yyyy, hh:mm a"),
        ])

        // Add summary rows
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
            {/* Header */}
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
                        {/* Divider line */}
                        <div className="h-8 w-px bg-border max-sm:hidden" />
                        {/* Client Company Badge */}
                        <div className="hidden h-9 items-center justify-center gap-2 rounded-xl bg-primary/10 px-4 sm:flex">
                            <Building className="h-4 w-4 text-primary" />
                            <span className="text-sm font-semibold text-primary">
                                {officeName}
                            </span>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        onClick={handleLogout}
                    >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Sign Out</span>
                    </Button>
                </div>
                <div className="mx-auto flex max-w-7xl items-center px-6 pb-3 sm:hidden">
                    <div className="flex h-9 items-center justify-center gap-2 rounded-xl bg-primary/10 px-4">
                        <Building className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-primary">
                            {officeName}
                        </span>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-6 py-6">
                <div className="flex flex-col gap-6">
                    {/* Controls */}
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
                                                // Adjust for local timezone offset when formatting to YYYY-MM-DD
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
                            <Button
                                variant="outline"
                                onClick={fetchData}
                                disabled={loading}
                            >
                                <RefreshCw
                                    className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                                />
                                Refresh
                            </Button>
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

                    {/* Menu Uploader */}
                    {showUploader && (
                        <MenuUploader onClose={() => setShowUploader(false)} />
                    )}

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-lg border border-border bg-card p-4">
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-primary" />
                                <p className="text-xs font-medium text-muted-foreground">
                                    Total Opted In
                                </p>
                            </div>
                            <p className="mt-2 text-2xl font-bold text-foreground">
                                {stats.optedIn}
                            </p>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-4">
                            <div className="flex items-center gap-2">
                                <Leaf className="h-4 w-4 text-veg" />
                                <p className="text-xs font-medium text-muted-foreground">
                                    Veg Count
                                </p>
                            </div>
                            <p className="mt-2 text-2xl font-bold text-foreground">
                                {stats.vegCount}
                            </p>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-4">
                            <div className="flex items-center gap-2">
                                <Drumstick className="h-4 w-4 text-nonveg" />
                                <p className="text-xs font-medium text-muted-foreground">
                                    Non-Veg Count
                                </p>
                            </div>
                            <p className="mt-2 text-2xl font-bold text-foreground">
                                {stats.nonvegCount}
                            </p>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-4">
                            <div className="flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-muted-foreground" />
                                <p className="text-xs font-medium text-muted-foreground">
                                    Opted Out
                                </p>
                            </div>
                            <p className="mt-2 text-2xl font-bold text-foreground">
                                {stats.optedOut}
                            </p>
                        </div>
                    </div>

                    <Separator />

                    {/* Data Table */}
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
                                            Office
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
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-12 text-center">
                                                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Loading...
                                                </div>
                                            </td>
                                        </tr>
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
                                                    {row.office}
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
                                                        <div className="flex items-center gap-1.5">
                                                            <span
                                                                className={`inline-flex h-3 w-3 items-center justify-center rounded-sm border-2 ${row.preference === "VEG"
                                                                    ? "border-veg"
                                                                    : "border-nonveg"
                                                                    }`}
                                                            >
                                                                <span
                                                                    className={`h-1.5 w-1.5 rounded-full ${row.preference === "VEG"
                                                                        ? "bg-veg"
                                                                        : "bg-nonveg"
                                                                        }`}
                                                                />
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
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
            </main >
        </div >
    )
}
