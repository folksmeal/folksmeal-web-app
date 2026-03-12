"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2, Eye, EyeOff } from "lucide-react"

export function AdminLoginScreen() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)

        if (!email.trim()) {
            setError("Please enter your Admin Email.")
            return
        }

        if (!password.trim()) {
            setError("Please enter your password.")
            return
        }

        setLoading(true)
        try {
            const result = await signIn("credentials", {
                identifier: email.trim(),
                password: password.trim(),
                portal: "admin",
                redirect: false,
            })
            if (result?.error) {
                setError("Invalid credentials")
            } else {
                router.push("/admin/dashboard")
                router.refresh()
            }
        } catch {
            setError("Something went wrong. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSubmit(e as unknown as React.FormEvent);
        }
    };


    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5">
            <div className="w-full max-w-sm">
                <div className="mb-10 flex flex-col items-center gap-3">
                    <Image
                        src="/logo-large.png"
                        alt="FolksMeal"
                        width={180}
                        height={46}
                        className="h-10 w-auto"
                        priority
                    />
                    <div className="text-center">
                        <h1
                            className="text-xl font-semibold text-foreground"
                            style={{ fontFamily: "var(--font-heading)" }}
                        >
                            Admin Portal
                        </h1>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5" autoComplete="off">
                    <div className="flex flex-col gap-1.5">
                        <Label
                            htmlFor="admin-email"
                            className="text-xs font-medium text-muted-foreground"
                        >
                            Admin Email
                        </Label>
                        <Input
                            id="admin-email"
                            type="email"
                            placeholder="e.g. admin@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-11 bg-card"
                            autoComplete="username"
                            disabled={loading}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label
                            htmlFor="admin-password"
                            className="text-xs font-medium text-muted-foreground"
                        >
                            Password
                        </Label>
                        <div className="relative">
                            <Input
                                id="admin-password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="h-11 bg-card"
                                autoComplete="current-password"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <p className="text-xs text-destructive" role="alert">
                            {error}
                        </p>
                    )}

                    <Button type="submit" className="mt-1 w-full" disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            "Sign In"
                        )}
                    </Button>
                </form>
            </div>
        </div>
    )
}
