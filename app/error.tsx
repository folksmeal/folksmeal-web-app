"use client"

import { useEffect } from "react"

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error("[GlobalError]", error)
    }, [error])

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
            <div className="mx-auto max-w-md text-center">
                <div className="mb-6 text-6xl">⚠️</div>
                <h1 className="mb-2 text-2xl font-bold text-foreground">
                    Something went wrong
                </h1>
                <p className="mb-6 text-muted-foreground">
                    An unexpected error occurred. Please try again or contact support if the problem persists.
                </p>
                {error.digest && (
                    <p className="mb-4 font-mono text-xs text-muted-foreground">
                        Error ID: {error.digest}
                    </p>
                )}
                <button
                    onClick={reset}
                    className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                    Try again
                </button>
            </div>
        </div>
    )
}
