"use client"

import { useEffect } from "react"

export default function OpsError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error("[Ops Error Boundary]", error)
    }, [error])

    return (
        <div className="flex h-[calc(100vh-4rem)] w-full flex-col items-center justify-center p-6">
            <div className="mx-auto flex max-w-md flex-col items-center text-center border rounded-xl p-8 bg-card shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
                    <svg
                        className="h-6 w-6 text-destructive"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                </div>
                <h2 className="mb-2 text-xl font-semibold text-foreground">
                    Admin Dashboard Error
                </h2>
                <p className="mb-6 text-sm text-muted-foreground">
                    An unexpected error occurred while loading this view.
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={reset}
                        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        Try again
                    </button>
                    <button
                        onClick={() => window.location.href = '/ops/dashboard'}
                        className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        Return Home
                    </button>
                </div>
            </div>
        </div>
    )
}
