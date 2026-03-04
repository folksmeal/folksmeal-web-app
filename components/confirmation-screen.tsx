"use client"

import { useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, XCircle, ArrowLeft, LogOut } from "lucide-react"
import { format, parseISO } from "date-fns"

interface ConfirmationScreenProps {
  employeeCode: string
  officeName: string
  status: "OPT_IN" | "OPT_OUT"
  preference: "VEG" | "NONVEG" | null
  updatedAt: string
}

function getStatusConfig(
  status: "OPT_IN" | "OPT_OUT",
  preference: "VEG" | "NONVEG" | null
) {
  if (status === "OPT_OUT") {
    return {
      label: "Opted Out",
      icon: XCircle,
      iconClass: "text-muted-foreground",
      badgeBorder: null,
      badgeDot: null,
      badgeLabel: "No meal selected",
    }
  }

  if (preference === "NONVEG") {
    return {
      label: "Opted In (Non-Veg)",
      icon: CheckCircle2,
      iconClass: "text-nonveg",
      badgeBorder: "border-nonveg",
      badgeDot: "bg-nonveg",
      badgeLabel: "Non-Vegetarian",
    }
  }

  return {
    label: "Opted In (Veg)",
    icon: CheckCircle2,
    iconClass: "text-veg",
    badgeBorder: "border-veg",
    badgeDot: "bg-veg",
    badgeLabel: "Vegetarian",
  }
}

function formatTimestamp(iso: string) {
  return format(parseISO(iso), "dd MMM yyyy, hh:mm a")
}

export function ConfirmationScreen({
  officeName,
  status,
  preference,
  updatedAt,
}: ConfirmationScreenProps) {
  const router = useRouter()
  const cfg = getStatusConfig(status, preference)
  const Icon = cfg.icon

  const handleBack = useCallback(() => {
    router.push("/dashboard")
    router.refresh()
  }, [router])

  const handleLogout = useCallback(async () => {
    await signOut({ callbackUrl: "/" })
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-large.png"
              alt="FolksMeal"
              width={130}
              height={34}
              className="h-8 w-auto"
              priority
            />
            {/* Divider line */}
            <div className="h-8 w-px bg-border max-sm:hidden" />
            {/* Client Company Badge */}
            <div className="hidden h-8 items-center justify-center rounded-xl bg-secondary px-4 sm:flex">
              <span className="text-sm font-medium text-secondary-foreground">
                {officeName}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            aria-label="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </Button>
        </div>
        <div className="mx-auto flex max-w-7xl items-center px-6 pb-3 sm:hidden">
          <div className="flex h-8 items-center justify-center rounded-xl bg-secondary px-4">
            <span className="text-sm font-medium text-secondary-foreground">
              {officeName}
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">
        <div className="flex flex-col gap-6">
          <h1
            className="text-lg font-semibold text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Your Selection
          </h1>

          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <Icon
                className={`h-10 w-10 ${cfg.iconClass}`}
                strokeWidth={1.5}
              />
              <div className="flex flex-col gap-1.5">
                <p className="text-base font-semibold text-foreground">
                  {cfg.label}
                </p>
                {cfg.badgeBorder && (
                  <div className="flex items-center justify-center gap-2">
                    <span
                      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-2 ${cfg.badgeBorder}`}
                      aria-hidden="true"
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${cfg.badgeDot}`}
                      />
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {cfg.badgeLabel}
                    </span>
                  </div>
                )}
                {!cfg.badgeBorder && (
                  <p className="text-sm text-muted-foreground">
                    {cfg.badgeLabel}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            <p className="pt-4 text-center text-xs text-muted-foreground">
              Last updated: {formatTimestamp(updatedAt)}
            </p>
          </div>

          {/* Change selection button */}
          <Button
            variant="outline"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4" />
            Change Selection
          </Button>
        </div>
      </main>
      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-card/50 py-6">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-xs text-muted-foreground">
            Contact us at{" "}
            <a
              href="mailto:info@folksmeal.com"
              className="font-medium text-foreground hover:underline"
            >
              info@folksmeal.com
            </a>{" "}
            for support
          </p>
        </div>
      </footer>
    </div>
  )
}
