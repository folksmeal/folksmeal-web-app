"use client"
import { useState } from "react"
import useSWR from "swr"
import { Star, MessageSquare } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { format, parseISO } from "date-fns"
import { cn } from "@/lib/utils"

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
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function ReviewsDashboard() {
    const [days, setDays] = useState(30)
    const { data, isLoading } = useSWR<ReviewsData>(`/api/ops/reviews?days=${days}`, fetcher)

    const maxCount = data ? Math.max(...data.distribution.map(d => d.count), 1) : 1

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-lg font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                    Meal Reviews
                </h1>
                <div className="flex gap-1">
                    {[7, 30, 90].map((d) => (
                        <Button
                            key={d}
                            variant={days === d ? "default" : "outline"}
                            size="sm"
                            className="rounded-full text-xs"
                            onClick={() => setDays(d)}
                        >
                            {d} days
                        </Button>
                    ))}
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center justify-center gap-2">
                    {isLoading ? (
                        <Skeleton className="h-12 w-20" />
                    ) : (
                        <>
                            <div className="flex items-center gap-2">
                                <Star className="h-8 w-8 fill-amber-400 text-amber-400" />
                                <span className="text-4xl font-bold text-foreground">{data?.averageRating ?? 0}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{data?.totalRatings ?? 0} ratings</p>
                        </>
                    )}
                </div>

                <div className="rounded-lg border border-border bg-card p-6">
                    <p className="text-sm font-medium text-foreground mb-3">Rating Distribution</p>
                    {isLoading ? (
                        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}</div>
                    ) : (
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
                    )}
                </div>
            </div>

            <div className="rounded-lg border border-border bg-card">
                <div className="border-b border-border px-5 py-3">
                    <p className="text-sm font-medium text-foreground">Recent Reviews</p>
                </div>
                <div className="divide-y divide-border">
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="px-5 py-4"><Skeleton className="h-4 w-full" /></div>
                        ))
                    ) : !data?.reviews.length ? (
                        <div className="px-5 py-12 text-center text-sm text-muted-foreground">No reviews yet</div>
                    ) : (
                        data.reviews.map((review) => (
                            <div key={review.id} className="px-5 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-foreground">{review.employeeName}</p>
                                        <span className="text-xs text-muted-foreground">({review.employeeCode})</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <Star key={s} className={cn("h-3.5 w-3.5", s <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                                        ))}
                                    </div>
                                </div>
                                {review.comment && (
                                    <div className="mt-2 flex items-start gap-2">
                                        <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                                    </div>
                                )}
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {format(parseISO(review.date), "dd MMM yyyy")}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
