"use client"

import { useState, useMemo, useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Clock, Check, X, LogOut, Loader2, AlertCircle } from "lucide-react"
import { format, parseISO } from "date-fns"

export type MealChoice = "VEG" | "NONVEG"

export interface MenuData {
  date: string
  day: string | null
  vegItem: string | null
  nonvegItem: string | null
  sideBeverage: string | null
  notes: string | null
  available: boolean
}

export interface ExistingSelection {
  status: "OPT_IN" | "OPT_OUT"
  preference: MealChoice | null
  updatedAt: string
}

interface MenuScreenProps {
  employeeCode: string
  officeName: string
  cutoffTime: string // "HH:MM"
  menu: MenuData | null
  existingSelection: ExistingSelection | null
}

function formatDate(dateStr: string) {
  return format(parseISO(dateStr), "EEEE, dd MMM yyyy")
}

function isPastCutoff(cutoffTime: string) {
  const [h, m] = cutoffTime.split(":").map(Number)
  const now = new Date()
  return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m)
}

function formatCutoff(cutoffTime: string) {
  const [h, m] = cutoffTime.split(":").map(Number)
  const hour = h % 12 || 12
  const min = m.toString().padStart(2, "0")
  const ampm = h >= 12 ? "PM" : "AM"
  return `${hour}:${min} ${ampm}`
}

export function MenuScreen({
  employeeCode,
  officeName,
  cutoffTime,
  menu,
  existingSelection,
}: MenuScreenProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<MealChoice | null>(
    existingSelection?.status === "OPT_IN" ? existingSelection.preference : null
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pastCutoff = useMemo(() => isPastCutoff(cutoffTime), [cutoffTime])
  const cutoffLabel = useMemo(() => formatCutoff(cutoffTime), [cutoffTime])

  const tomorrowLabel = useMemo(() => {
    if (menu?.date) return formatDate(menu.date)
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return formatDate(d.toISOString())
  }, [menu?.date])

  const handleSubmit = useCallback(
    async (status: "OPT_IN" | "OPT_OUT") => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch("/api/meal-selection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            preference: status === "OPT_IN" ? selected : null,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || "Failed to submit selection")
          return
        }

        // Redirect to confirmation
        router.push("/dashboard?submitted=true")
        router.refresh()
      } catch {
        setError("Network error. Please try again.")
      } finally {
        setLoading(false)
      }
    },
    [selected, router]
  )

  const handleLogout = useCallback(async () => {
    await signOut({ callbackUrl: "/" })
  }, [])

  const nonvegAvailable = Boolean(menu?.nonvegItem)

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
        <div className="flex flex-col gap-5">
          {/* Date and context */}
          <div>
            <p className="text-xl font-medium uppercase tracking-wider text-muted-foreground">
              {tomorrowLabel}
            </p>
            <h1
              className="uppercase mt-2 text-2xl font-semibold text-foreground"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Select your meal preference for tomorrow
            </h1>
          </div>

          {/* No menu available */}
          {!menu?.available && (
            <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">
                No menu has been set for {tomorrowLabel} yet. Please check back later.
              </p>
            </div>
          )}

          {/* Cutoff notice */}
          {menu?.available && (
            <>
              {!pastCutoff ? (
                <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-white px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-xs font-medium text-foreground">
                      Cutoff Time: {cutoffLabel} today
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Submit your selection before the deadline
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                    <Clock className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-xs font-medium text-destructive">
                      Cutoff time ({cutoffLabel}) has passed
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Selection is locked. Contact the cafeteria for assistance.
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Meal options */}
              <RadioGroup
                value={selected ?? ""}
                onValueChange={(v) => setSelected(v as MealChoice)}
                disabled={pastCutoff || loading}
                className="flex flex-col gap-3"
              >
                {/* Veg */}
                <Label
                  htmlFor="veg"
                  className={`flex items-center gap-3.5 rounded-lg border p-4 transition-colors ${pastCutoff ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                    } ${selected === "VEG"
                      ? "border-primary/40 bg-accent/10"
                      : "border-border bg-card " + (!pastCutoff ? "hover:bg-secondary" : "")
                    }`}
                >
                  <RadioGroupItem
                    value="VEG"
                    id="veg"
                    disabled={pastCutoff}
                    className="mt-0.5 shrink-0"
                  />
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-2 border-veg"
                        aria-hidden="true"
                      >
                        <span className="h-2 w-2 rounded-full bg-veg" />
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        Veg Meal
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {menu.vegItem}
                    </p>
                    {menu.sideBeverage && (
                      <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                        Included: {menu.sideBeverage}
                      </p>
                    )}
                  </div>
                </Label>

                {/* Non-Veg */}
                <Label
                  htmlFor="nonveg"
                  className={`flex items-center gap-3.5 rounded-lg border p-4 transition-colors ${!nonvegAvailable || pastCutoff
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer"
                    } ${selected === "NONVEG"
                      ? "border-primary/40 bg-accent/10"
                      : "border-border bg-card " + (!pastCutoff && nonvegAvailable ? "hover:bg-secondary" : "")
                    }`}
                >
                  <RadioGroupItem
                    value="NONVEG"
                    id="nonveg"
                    disabled={!nonvegAvailable || pastCutoff}
                    className="mt-0.5 shrink-0"
                  />
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-2 border-nonveg"
                        aria-hidden="true"
                      >
                        <span className="h-2 w-2 rounded-full bg-nonveg" />
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        Non-Veg Meal
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {nonvegAvailable
                        ? menu.nonvegItem
                        : "Not available tomorrow"}
                    </p>
                    {nonvegAvailable && menu.sideBeverage && (
                      <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                        Included: {menu.sideBeverage}
                      </p>
                    )}
                  </div>
                </Label>
              </RadioGroup>

              <Separator />

              {/* Notes */}
              {menu?.notes && (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Note: </span>
                    {menu.notes}
                  </p>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
                  <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  disabled={!selected || pastCutoff || loading}
                  onClick={() => handleSubmit("OPT_IN")}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Opt In
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={pastCutoff || loading}
                  onClick={() => handleSubmit("OPT_OUT")}
                >
                  <X className="h-4 w-4" />
                  Opt Out
                </Button>
              </div>
            </>
          )}
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
