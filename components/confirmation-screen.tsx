"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, XCircle, ArrowLeft, LogOut } from "lucide-react"
import type { MealChoice } from "@/components/menu-screen"

interface ConfirmationScreenProps {
  employeeId: string
  status: MealChoice | "opted-out"
  timestamp: string
  onBack: () => void
  onLogout: () => void
}

function getStatusConfig(status: MealChoice | "opted-out") {
  switch (status) {
    case "veg":
      return {
        label: "Opted In (Veg)",
        icon: CheckCircle2,
        iconClass: "text-veg",
        badgeBorder: "border-veg",
        badgeDot: "bg-veg",
        badgeLabel: "Vegetarian",
      }
    case "nonveg":
      return {
        label: "Opted In (Non-Veg)",
        icon: CheckCircle2,
        iconClass: "text-nonveg",
        badgeBorder: "border-nonveg",
        badgeDot: "bg-nonveg",
        badgeLabel: "Non-Vegetarian",
      }
    case "opted-out":
      return {
        label: "Opted Out",
        icon: XCircle,
        iconClass: "text-muted-foreground",
        badgeBorder: null,
        badgeDot: null,
        badgeLabel: "No meal selected",
      }
  }
}

export function ConfirmationScreen({
  employeeId,
  status,
  timestamp,
  onBack,
  onLogout,
}: ConfirmationScreenProps) {
  const cfg = getStatusConfig(status)
  const Icon = cfg.icon

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/images/logo-large.webp"
              alt="FolksMeal"
              width={130}
              height={34}
              className="h-7 w-auto"
              priority
            />
            <span className="hidden text-[11px] text-muted-foreground sm:inline">
              {"| LearnApp, Noida"}
            </span>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{employeeId}</span>
          </button>
        </div>
        <div className="mx-auto max-w-lg px-5 pb-2 sm:hidden">
          <p className="text-[11px] text-muted-foreground">LearnApp, Noida</p>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-lg flex-1 px-5 py-6">
        <div className="flex flex-col gap-6">
          <h1
            className="text-lg font-semibold text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {"Your Selection"}
          </h1>

          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <Icon className={`h-10 w-10 ${cfg.iconClass}`} strokeWidth={1.5} />
              <div className="flex flex-col gap-1.5">
                <p className="text-base font-semibold text-foreground">{cfg.label}</p>
                {cfg.badgeBorder && (
                  <div className="flex items-center justify-center gap-2">
                    <span
                      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-2 ${cfg.badgeBorder}`}
                      aria-hidden="true"
                    >
                      <span className={`h-2 w-2 rounded-full ${cfg.badgeDot}`} />
                    </span>
                    <span className="text-sm text-muted-foreground">{cfg.badgeLabel}</span>
                  </div>
                )}
                {!cfg.badgeBorder && (
                  <p className="text-sm text-muted-foreground">{cfg.badgeLabel}</p>
                )}
              </div>
            </div>

            <Separator />

            <p className="pt-4 text-center text-xs text-muted-foreground">
              {"Last updated: "}{timestamp}
            </p>
          </div>

          {/* Change selection button */}
          <Button
            variant="outline"
            size="lg"
            className="gap-2"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
            {"Change Selection"}
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-lg px-5 py-3">
          <p className="text-center text-[11px] text-muted-foreground">
            {"FolksMeal \u2014 Internal meal selection tool"}
          </p>
        </div>
      </footer>
    </div>
  )
}
