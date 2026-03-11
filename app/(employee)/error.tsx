"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function EmployeeError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error("[Employee Error Boundary]", error)
    }, [error])

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background px-4">
            <div className="mx-auto flex max-w-100 flex-col items-center justify-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 mb-6">
                    <span className="text-4xl">⚠️</span>
                </div>
                <h2 className="mb-2 text-2xl font-semibold text-foreground">
                    Something went wrong
                </h2>
                <p className="mb-6 text-sm text-muted-foreground">
                    We encountered an unexpected error while loading your data. Please try again.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <Button onClick={() => reset()} className="w-full sm:w-auto">
                        Try again
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => window.location.href = '/dashboard'}
                        className="w-full sm:w-auto"
                    >
                        Go to Dashboard
                    </Button>
                </div>
                {error.digest && (
                    <p className="mt-8 font-mono text-xs text-muted-foreground/50">
                        Error ID: {error.digest}
                    </p>
                )}
            </div>
        </div>
    )
}
