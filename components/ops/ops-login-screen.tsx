"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2, ShieldCheck } from "lucide-react"

export function OpsLoginScreen() {
    const router = useRouter()
    const [employeeId, setEmployeeId] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)

        if (!employeeId.trim()) {
            setError("Please enter your Ops ID.")
            return
        }
        if (!password.trim()) {
            setError("Please enter your password.")
            return
        }

        setLoading(true)

        try {
            const result = await signIn("credentials", {
                employeeCode: employeeId.trim(),
                password: password.trim(),
                redirect: false,
            })

            if (result?.error) {
                setError("Invalid credentials or insufficient permissions.")
            } else {
                router.push("/ops/dashboard")
                router.refresh()
            }
        } catch {
            setError("Something went wrong. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5">
            <div className="w-full max-w-sm">
                {/* Header */}
                <div className="mb-10 flex flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                        <ShieldCheck className="h-7 w-7 text-primary" />
                    </div>
                    <div className="text-center">
                        <h1
                            className="text-xl font-semibold text-foreground"
                            style={{ fontFamily: "var(--font-heading)" }}
                        >
                            FolksMeal Operations
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Ops dashboard login
                        </p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="flex flex-col gap-1.5">
                        <Label
                            htmlFor="ops-id"
                            className="text-xs font-medium text-muted-foreground"
                        >
                            Ops ID
                        </Label>
                        <Input
                            id="ops-id"
                            type="text"
                            placeholder="e.g. OPS-001"
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            className="h-11 bg-card"
                            autoComplete="username"
                            disabled={loading}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label
                            htmlFor="ops-password"
                            className="text-xs font-medium text-muted-foreground"
                        >
                            Password
                        </Label>
                        <Input
                            id="ops-password"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-11 bg-card"
                            autoComplete="current-password"
                            disabled={loading}
                        />
                    </div>

                    {error && (
                        <p className="text-xs text-destructive" role="alert">
                            {error}
                        </p>
                    )}

                    <Button
                        type="submit"
                        className="mt-1 w-full"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            "Sign In to Ops"
                        )}
                    </Button>
                </form>

                <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground">
                    Operations team access only. Contact admin for credentials.
                </p>
            </div>
        </div>
    )
}
