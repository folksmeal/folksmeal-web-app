"use client"
import { useState, useMemo, useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { isPastCutoffInTimezone } from "@/lib/utils/time"
import { Clock, Check, X, LogOut, Loader2, AlertCircle, Building } from "lucide-react"
import { format, parseISO } from "date-fns"
import { submitMealSelection } from "@/app/actions/meal-selection"

export type MealChoice = "VEG" | "NONVEG"
export interface MenuData {
  date: string
  day: string | null
  vegItem: string | null
  nonvegItem: string | null
  sideBeverage: string | null
  notes: string | null
  available: boolean
  isWorkingDay?: boolean
}
export interface ExistingSelection {
  status: "OPT_IN" | "OPT_OUT"
  preference: MealChoice | null
  updatedAt: string
}
interface MenuScreenProps {
  employeeCode: string
  employeeName: string
  companyName: string
  companyIcon?: string | null
  timezone: string
  cutoffTime: string
  menu: MenuData | null
  existingSelection: ExistingSelection | null
}
function formatDate(dateStr: string) {
  return format(parseISO(dateStr), "EEEE, dd MMM yyyy")
}

function formatCutoff(cutoffTime: string) {
  const [h, m] = cutoffTime.split(":").map(Number)
  const hour = h % 12 || 12
  const min = m.toString().padStart(2, "0")
  const ampm = h >= 12 ? "PM" : "AM"
  return `${hour}:${min} ${ampm}`
}
export function MenuScreen({
  employeeName,
  companyName,
  companyIcon,
  timezone,
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

  const pastCutoff = useMemo(() => isPastCutoffInTimezone(cutoffTime, timezone), [cutoffTime, timezone])
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
        const result = await submitMealSelection({
          status,
          preference: status === "OPT_IN" ? selected : null,
        })

        if (!result.success) {
          setError(result.error || "Failed to submit selection")
          return
        }

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
      { }
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
            { }
            <div className="h-8 w-px bg-border max-sm:hidden" />
            <div className="hidden h-10 items-center gap-2.5 rounded-xl border border-input bg-card px-4 sm:flex">
              {companyIcon ? (
                <Image src={companyIcon} alt={companyName} width={20} height={20} className="h-5 w-5 object-contain" />
              ) : (
                <Building className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-semibold text-foreground">
                {companyName}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="h-10 rounded-xl border-input bg-card px-5 font-semibold transition-all hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </Button>
        </div>
        <div className="mx-auto flex max-w-7xl items-center px-6 pb-3 sm:hidden">
          <div className="flex h-10 w-full items-center justify-center gap-2.5 rounded-xl border border-input bg-card px-4">
            {companyIcon ? (
              <Image src={companyIcon} alt={companyName} width={20} height={20} className="h-5 w-5 object-contain" />
            ) : (
              <Building className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm font-semibold text-foreground truncate max-w-[200px]">
              {companyName}
            </span>
          </div>
        </div>
      </header>
      { }
      <main
        className={`mx-auto w-full max-w-7xl flex-1 px-6 py-6 ${menu?.isWorkingDay === false ? "flex flex-col justify-center items-center" : ""
          }`}
      >
        <div className={`flex flex-col gap-5 w-full ${menu?.isWorkingDay === false ? "max-w-md" : ""}`}>
          { }
          {/* Header */}
          <div className={menu?.isWorkingDay === false ? "text-center mb-2" : ""}>
            <p className={`${menu?.isWorkingDay === false ? "text-2xl pb-2" : "text-xl"} text-muted-foreground`}>
              Welcome, <span className="font-medium text-foreground">{employeeName}</span>
            </p>
            {menu?.isWorkingDay !== false && (
              <h1
                className="mt-2 text-2xl font-semibold text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Select your meal preference for {tomorrowLabel}
              </h1>
            )}
          </div>

          {/* Loading State */}
          {!menu && (
            <div className="flex flex-col gap-5">
              <Skeleton className="h-14 w-full rounded-lg" />
              <Separator />
              <div className="flex flex-col gap-3">
                <Skeleton className="h-[104px] w-full rounded-lg" />
                <Skeleton className="h-[104px] w-full rounded-lg" />
              </div>
              <Separator />
              <div className="flex gap-3">
                <Skeleton className="h-10 flex-1 rounded-md" />
                <Skeleton className="h-10 flex-1 rounded-md" />
              </div>
            </div>
          )}

          {/* Holiday Card State */}
          {menu && menu.isWorkingDay === false && (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg sm:max-w-md mx-auto w-full transition-all duration-300 hover:shadow-xl">
              <div className="flex flex-col items-center gap-4 p-8 text-center bg-card">
                <h3 className="text-2xl font-bold tracking-tight text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                  It's a Holiday!
                </h3>
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Take a break and recharge! Meal selections are paused for <span className="font-semibold text-foreground">{tomorrowLabel}</span>.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 px-4 py-2 bg-muted/50 rounded-lg inline-block mx-auto border border-border/50">
                    Enjoy your time off! We'll see you on the next working day.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Menu Not Available State */}
          {menu && menu.isWorkingDay !== false && !menu.available && (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg sm:max-w-md mx-auto w-full transition-all duration-300 hover:shadow-xl mt-6">
              <div className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 mb-2">
                  <AlertCircle className="h-8 w-8 text-amber-500" />
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-semibold text-foreground">
                    Menu Not Available
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-[300px] mx-auto">
                    No menu has been posted for {tomorrowLabel} yet. Please check back later.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Menu Available State */}
          {menu && menu.isWorkingDay !== false && menu.available && (
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
                      Selection is locked. Contact support for assistance.
                    </p>
                  </div>
                </div>
              )}
              <Separator />

              <RadioGroup
                value={selected ?? ""}
                onValueChange={(v) => setSelected(v as MealChoice)}
                disabled={pastCutoff || loading}
                className="flex flex-col gap-3"
              >
                <Label
                  htmlFor="veg"
                  className={`group relative flex items-start gap-4 rounded-xl border-2 p-5 transition-all outline-none ${pastCutoff ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:shadow-md"
                    } ${selected === "VEG"
                      ? "border-veg bg-veg/5 ring-1 ring-veg/20"
                      : `border-transparent bg-card shadow-sm ${!pastCutoff ? "hover:border-veg/30" : ""}`
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

                <Label
                  htmlFor="nonveg"
                  className={`group relative flex items-start gap-4 rounded-xl border-2 p-5 transition-all outline-none ${!nonvegAvailable || pastCutoff
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer hover:shadow-md"
                    } ${selected === "NONVEG"
                      ? "border-nonveg bg-nonveg/5 ring-1 ring-nonveg/20"
                      : `border-transparent bg-card shadow-sm ${(!pastCutoff && nonvegAvailable) ? "hover:border-nonveg/30" : ""}`
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



              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
                  <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}

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
      { }
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
