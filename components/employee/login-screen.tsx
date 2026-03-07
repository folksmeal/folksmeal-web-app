"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

export function LoginScreen() {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!employeeId.trim()) {
      setError("Please enter your Employee ID.")
      return
    }

    if (!password.trim()) {
      setError("Please enter your password.")
      return
    }

    setLoading(true)
    try {
      const result = await signIn("credentials", {
        identifier: employeeId.trim(),
        password: password.trim(),
        redirect: false,
      })
      if (result?.error) {
        setError("Invalid Employee ID or password.")
      } else {
        router.push("/dashboard")
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
        <div className="mb-10 flex flex-col items-center gap-3">
          <Image
            src="/logo-large.png"
            alt="FolksMeal"
            width={180}
            height={46}
            className="h-10 w-auto"
            priority
          />
          <p className="text-sm font-medium text-foreground">
            FolksMeal Employee Portal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="employee-id"
              className="text-xs font-medium text-muted-foreground"
            >
              Employee ID
            </Label>
            <Input
              id="employee-id"
              type="text"
              placeholder="e.g. EMP-1042"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="h-11 bg-card"
              autoComplete="username"
              disabled={loading}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="password"
              className="text-xs font-medium text-muted-foreground"
            >
              Password
            </Label>
            <Input
              id="password"
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

        <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground">
          Use your company credentials to sign in.
        </p>
      </div>
    </div>
  )
}