import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

interface PaginationFooterProps {
    page: number
    totalPages: number
    onPageChange?: (_page: number) => void
    hrefBuilder?: (_page: number) => string
    totalItems?: number
    pageSize?: number
}

export function PaginationFooter({ page, totalPages, onPageChange, hrefBuilder, totalItems, pageSize = 15 }: PaginationFooterProps) {
    const prevDisabled = page <= 1
    const nextDisabled = page >= totalPages

    const ArrowBtn = ({ direction }: { direction: "prev" | "next" }) => {
        const disabled = direction === "next" ? nextDisabled : prevDisabled
        const newPage = direction === "next" ? page + 1 : page - 1
        const Icon = direction === "next" ? ChevronRight : ChevronLeft

        const className = `inline-flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 transition-colors ${disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-slate-50 hover:text-slate-900"
            }`

        if (hrefBuilder && !disabled) {
            return (
                <Link href={hrefBuilder(newPage)} className={className}>
                    <Icon className="h-3.5 w-3.5" />
                </Link>
            )
        }

        return (
            <button onClick={() => onPageChange?.(newPage)} disabled={disabled} className={className}>
                <Icon className="h-3.5 w-3.5" />
            </button>
        )
    }

    // Calculate range: "1–15 of 47"
    const start = totalItems !== undefined ? (page - 1) * pageSize + 1 : null
    const end = totalItems !== undefined ? Math.min(page * pageSize, totalItems) : null

    return (
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2.5 mt-auto shrink-0">
            <span className="text-xs text-slate-500">
                {totalItems !== undefined && start !== null && end !== null
                    ? <>Showing <span className="font-medium text-slate-700">{start}–{end}</span> of <span className="font-medium text-slate-700">{totalItems}</span></>
                    : `Page ${page}`
                }
            </span>
            {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                    <ArrowBtn direction="prev" />
                    <span className="text-xs text-slate-500 tabular-nums min-w-12 text-center">
                        <span className="font-medium text-slate-700">{page}</span> of <span className="font-medium text-slate-700">{totalPages}</span>
                    </span>
                    <ArrowBtn direction="next" />
                </div>
            )}
        </div>
    )
}
