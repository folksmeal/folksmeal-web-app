"use client"
import { useState, useCallback, useTransition } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, XCircle, ArrowLeft, LogOut, Building, Star, Loader2, Edit2 } from "lucide-react"
import { format, parseISO } from "date-fns"
import { submitMealRating } from "@/app/actions/meal-rating"

interface ConfirmationScreenProps {
  employeeCode: string
  companyName: string
  companyIcon?: string | null
  status: "OPT_IN" | "OPT_OUT"
  preference: "VEG" | "NONVEG" | null
  updatedAt: string
  mealDate: string
  existingRating?: { rating: number; comment: string | null } | null
  promptRating?: boolean
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

function StarRating({ mealDate, existingRating }: { mealDate: string; existingRating?: { rating: number; comment: string | null } | null }) {
  const [rating, setRating] = useState(existingRating?.rating ?? 0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [comment, setComment] = useState(existingRating?.comment ?? "")
  const [submitting, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(!!existingRating)
  const [inCooldown, setInCooldown] = useState(false)
  const [errorResult, setErrorResult] = useState<string | null>(null)

  const handleSubmitRating = useCallback(async () => {
    if (rating === 0 || inCooldown) return
    setErrorResult(null)

    startTransition(async () => {
      const result = await submitMealRating({ rating, comment: comment || undefined, date: mealDate })
      if (result.success) {
        setSubmitted(true)
        setInCooldown(true)
        setTimeout(() => setInCooldown(false), 5000)
      } else {
        setErrorResult(result.error || "Failed to submit rating")
      }
    })
  }, [rating, comment, mealDate, inCooldown])

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="space-y-4">
        <div className="flex h-9 items-center justify-between">
          <p className="text-sm font-semibold text-foreground">
            {submitted ? "Thank you for the rating!" : "Rate your meal"}
          </p>
          {submitted && (
            <Button
              variant="outline"
              onClick={() => setSubmitted(false)}
              disabled={inCooldown}
            >
              <Edit2 className="h-2.5 w-2.5 text-primary" />
              <span>Edit</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => {
                setRating(star)
                if (submitted) setSubmitted(false)
              }}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              className="p-0.5 cursor-pointer"
            >
              <Star
                className={`h-8 w-8 transition-colors duration-200 ${star <= (hoveredStar || rating)
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/30"
                  }`}
              />
            </button>
          ))}
        </div>

        {rating > 0 && !submitted && (
          <div className="pt-2 space-y-4">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Any feedback? (optional)"
              rows={3}
              maxLength={500}
              className="w-full rounded-xl border border-input bg-muted/20 px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            />
            <Button
              onClick={handleSubmitRating}
              disabled={submitting}
              className="relative w-full sm:w-32 rounded-xl h-10 overflow-hidden"
            >
              {submitting ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
                </div>
              ) : (
                "Submit"
              )}
            </Button>
          </div>
        )}

        {errorResult && (
          <p className="text-xs font-medium text-destructive mt-1">
            {errorResult}
          </p>
        )}

        {submitted && comment && (
          <p className="text-sm text-muted-foreground italic bg-muted/30 p-3 rounded-xl border border-border/50">
            "{comment}"
          </p>
        )}
      </div>
    </div>
  )
}

export function ConfirmationScreen({
  companyName,
  companyIcon,
  status,
  preference,
  updatedAt,
  mealDate,
  existingRating,
  promptRating = false,
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
            <div className="h-8 w-px bg-border max-sm:hidden" />
            <div className="hidden h-10 items-center justify-center gap-2.5 rounded-xl border border-input bg-card px-4 py-2 sm:flex shadow-sm">
              {companyIcon ? (
                <div className="relative h-5 w-5 shrink-0 overflow-hidden rounded-md border border-border/50 bg-muted/30">
                  <Image
                    src={companyIcon}
                    alt={companyName}
                    fill
                    className="object-contain p-0.5"
                    unoptimized
                  />
                </div>
              ) : (
                <Building className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="text-sm font-semibold text-foreground">
                {companyName}
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
          <div className="flex h-10 w-full items-center justify-center gap-2.5 rounded-xl border border-input bg-card px-4 py-2">
            {companyIcon ? (
              <div className="relative h-5 w-5 shrink-0 overflow-hidden rounded-md border border-border/50 bg-muted/30">
                <Image
                  src={companyIcon}
                  alt={companyName}
                  fill
                  className="object-contain p-0.5"
                  unoptimized
                />
              </div>
            ) : (
              <Building className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="text-sm font-semibold text-foreground truncate max-w-50">
              {companyName}
            </span>
          </div>
        </div>
      </header>

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
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-2 ${cfg.badgeBorder}`}
                      aria-hidden="true"
                    >
                      <span className={`h-2 w-2 rounded-full ${cfg.badgeDot}`} />
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

          {promptRating && (
            <StarRating mealDate={mealDate} existingRating={existingRating} />
          )}

          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
            Change Selection
          </Button>
        </div>
      </main>

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