import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

interface PaginationFooterProps {
    page: number
    totalPages: number
    onPageChange?: (_page: number) => void
    hrefBuilder?: (_page: number) => string
    totalItems?: number
}

export function PaginationFooter({ page, totalPages, onPageChange, hrefBuilder, totalItems }: PaginationFooterProps) {
    if (totalPages <= 1) return null

    const prevDisabled = page <= 1
    const nextDisabled = page >= totalPages

    const renderButton = (isNext: boolean) => {
        const content = (
            <>
                {!isNext && <ChevronLeft className="h-4 w-4" />}
                <span className="sr-only sm:not-sr-only sm:inline">{isNext ? "Next" : "Prev"}</span>
                {isNext && <ChevronRight className="h-4 w-4" />}
            </>
        )
        const disabled = isNext ? nextDisabled : prevDisabled
        const newPage = isNext ? page + 1 : page - 1

        if (hrefBuilder && !disabled) {
            return (
                <Link href={hrefBuilder(newPage)} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-2 gap-1 py-0">
                    {content}
                </Link>
            )
        }

        return (
            <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 px-2 flex items-center gap-1"
                onClick={() => onPageChange?.(newPage)}
                disabled={disabled}
            >
                {content}
            </Button>
        )
    }

    return (
        <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-card mt-auto shrink-0">
            <div className="flex items-center text-xs text-muted-foreground">
                Page {page} of {totalPages} {totalItems !== undefined && `(${totalItems} total)`}
            </div>
            <div className="flex items-center gap-1">
                {renderButton(false)}
                {renderButton(true)}
            </div>
        </div>
    )
}
