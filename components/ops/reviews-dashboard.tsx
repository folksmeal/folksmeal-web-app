"use client"
import useSWR from "swr"
import { Star, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format, parseISO } from "date-fns"
import { cn } from "@/lib/utils"
import { PaginationFooter } from "@/components/ops/pagination-footer"

interface Review {
    id: string
    employeeName: string
    employeeCode: string
    rating: number
    comment: string | null
    date: string
    createdAt: string
}

interface ReviewsData {
    averageRating: number
    totalRatings: number
    distribution: { star: number; count: number }[]
    reviews: Review[]
    pagination?: { total: number }
}

import { fetcher } from "@/lib/fetcher"

import { useRouter, useSearchParams, usePathname } from "next/navigation"

export function ReviewsDashboard({ initialDays, initialData, basePath = "/ops" }: { initialDays: number; initialData: ReviewsData; basePath?: string }) {
    const headingFontStyle = { fontFamily: "var(--font-heading)" } as const
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const daysParam = Math.max(1, parseInt(searchParams.get("days") || initialDays.toString()))
    const pageParam = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const itemsPerPage = 15

    const query = new URLSearchParams()
    query.set("days", daysParam.toString())
    query.set("page", pageParam.toString())
    query.set("limit", itemsPerPage.toString())

    const { data } = useSWR<ReviewsData>(`/api${basePath}/reviews?${query.toString()}`, fetcher, { fallbackData: initialData })

    const reviews = data?.reviews ?? []

    // Total pages logic must use backend total, not reviews array length
    const totalCount = data?.pagination?.total ?? initialData.totalRatings
    const totalPages = Math.ceil(totalCount / itemsPerPage)

    const maxCount = data ? Math.max(...data.distribution.map(d => d.count), 1) : 1

    const handleDaysChange = (d: number) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set("days", d.toString())
        params.set("page", "1") // Reset page on filter change
        router.push(`${pathname}?${params.toString()}`)
    }

    const handlePageChange = (p: number) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set("page", p.toString())
        router.push(`${pathname}?${params.toString()}`)
    }

    return (
        <div className="flex flex-col h-full gap-6 overflow-hidden">
            <div className="rounded-lg border border-border bg-card px-4 py-3 sm:px-5 sm:py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-0.5">
                        <h1 className="text-lg font-semibold text-foreground" style={headingFontStyle}>
                            Meal Reviews
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Track satisfaction trends and recent meal feedback by time range.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                        {[7, 30, 90].map((d) => (
                            <Button
                                key={d}
                                variant={daysParam === d ? "default" : "outline"}
                                className="h-10 rounded-xl px-5 text-xs"
                                onClick={() => handleDaysChange(d)}
                            >
                                {d} days
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
                <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center justify-center gap-2">
                    <div className="flex items-center gap-2">
                        <Star className="h-8 w-8 fill-amber-400 text-amber-400" />
                        <span className="text-4xl font-bold text-foreground">{data?.averageRating ?? 0}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{data?.totalRatings ?? 0} ratings</p>
                </div>

                <div className="rounded-lg border border-border bg-card p-6">
                    <p className="mb-3 text-sm font-semibold text-foreground" style={headingFontStyle}>Rating Distribution</p>
                    <div className="space-y-2">
                        {[5, 4, 3, 2, 1].map((star) => {
                            const entry = data?.distribution.find(d => d.star === star)
                            const count = entry?.count ?? 0
                            const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
                            return (
                                <div key={star} className="flex items-center gap-2">
                                    <span className="w-3 text-xs text-muted-foreground">{star}</span>
                                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                        <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="w-6 text-right text-xs text-muted-foreground">{count}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            <div className="rounded-lg border border-border bg-card flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm table-fixed">
                        <thead className="sticky top-0 z-10 bg-slate-50">
                            <tr className="border-b border-border">
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-[25%]">Employee</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-[20%]">Rating</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-[40%]">Comment</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-[15%]">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!data?.reviews.length ? (
                                <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">No reviews yet</td></tr>
                            ) : (
                                reviews.map((review: Review, _i: number) => (
                                    <tr key={review.id} className="transition-colors hover:bg-muted/30 border-b border-border">
                                        <td className="truncate px-4 py-3 w-[25%]">
                                            <p className="font-medium text-foreground truncate">{review.employeeName}</p>
                                            <p className="text-[10px] text-muted-foreground truncate">{review.employeeCode}</p>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 w-[20%]">
                                            <div className="flex items-center gap-1">
                                                {[1, 2, 3, 4, 5].map((s) => (
                                                    <Star key={s} className={cn("h-3 w-3", s <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20")} />
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 w-[40%]">
                                            {review.comment ? (
                                                <div className="flex items-start gap-2">
                                                    <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/70" />
                                                    <p className="text-xs text-muted-foreground truncate">{review.comment}</p>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-muted-foreground/40">—</span>
                                            )}
                                        </td>
                                        <td className="truncate px-4 py-3 text-muted-foreground text-[11px] w-[15%]">
                                            {format(parseISO(review.date), "EEE, dd MMM yyyy")}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="shrink-0 border-t border-border bg-card">
                    <PaginationFooter
                        page={pageParam}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        totalItems={totalCount}
                    />
                </div>
            </div>
        </div>
    )
}
