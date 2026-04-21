"use client"
import { useState, useCallback, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, ArrowLeft, Star, Loader2, Edit2 } from "lucide-react"
import { format, parseISO } from "date-fns"
import { submitMealRating } from "@/app/actions/meal-rating"
import type { ConfirmationScreenProps, MealPreference, SelectionStatus } from "@/types/employee"

function getStatusConfig(
  status: SelectionStatus,
  preference: MealPreference | null
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
  // Use a local date for the "Last Updated" timestamp to show the user's actual relative time
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

    // Optimistic: show success immediately
    setSubmitted(true)
    setInCooldown(true)

    startTransition(async () => {
      const result = await submitMealRating({ rating, comment: comment || undefined, date: mealDate })
      if (result.success) {
        setTimeout(() => setInCooldown(false), 5000)
      } else {
        // Rollback on failure
        setSubmitted(false)
        setInCooldown(false)
        setErrorResult(result.error || "Failed to submit rating")
      }
    })
  }, [rating, comment, mealDate, inCooldown])

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex items-center justify-between">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">
            {submitted ? "Thank you for the rating!" : "Rate your meal"}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((star) => {
            const isActive = star <= (submitted ? rating : (hoveredStar || rating))
            return (
              <button
                key={star}
                type="button"
                disabled={submitted}
                onClick={() => {
                  if (!submitted) setRating(star)
                }}
                onMouseEnter={() => { if (!submitted) setHoveredStar(star) }}
                onMouseLeave={() => { if (!submitted) setHoveredStar(0) }}
                className={`p-0.5 ${submitted ? "cursor-default opacity-70" : "cursor-pointer"}`}
              >
                <Star
                  className={`h-8 w-8 transition-all duration-150 ease-out ${isActive
                    ? "fill-amber-400 text-amber-400"
                    : "fill-transparent text-muted-foreground/30"
                    }`}
                  style={{ transitionDelay: `${(star - 1) * 30}ms` }}
                />
              </button>
            )
          })}
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
  )
}

export function ConfirmationScreen({
  status,
  preference,
  updatedAt,
  mealDate,
  existingRating,
  promptRating = false,
  addons = [],
}: ConfirmationScreenProps) {
  const router = useRouter()
  const cfg = getStatusConfig(status, preference)
  const Icon = cfg.icon

  const handleBack = useCallback(() => {
    router.push("/dashboard?edit=true")
    router.refresh()
  }, [router])


  return (
    <div className="flex flex-col flex-1">
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">
        <div className="flex flex-col gap-6">
          <h1
            className="text-lg font-semibold text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Your Selection
          </h1>

          <div className="relative overflow-hidden rounded-xl border border-border bg-card">
            <div className="bg-muted/30 px-6 py-4 border-b border-border/50 flex justify-between items-center">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-widest pl-1">Order Details</h3>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 border border-emerald-100">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold text-emerald-700 uppercase">Confirmed</span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex flex-col items-center gap-4 py-2 text-center">
                <Icon
                  className={`h-10 w-10 ${cfg.iconClass}`}
                  strokeWidth={1.5}
                />
                <div className="flex flex-col gap-1.5">
                  <p className="text-base font-bold text-foreground">
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
                      <span className="text-sm text-muted-foreground font-medium">
                        {cfg.badgeLabel}
                      </span>
                    </div>
                  )}
                  {!cfg.badgeBorder && (
                    <p className="text-sm text-muted-foreground font-medium">
                      {cfg.badgeLabel}
                    </p>
                  )}
                </div>
              </div>

              {addons.length > 0 && (
                <div className="w-full space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Extra Add-ons</h3>
                    <div className="px-2 py-1 rounded-md bg-amber-50 border border-amber-100">
                      <span className="text-[10px] font-bold text-amber-700 uppercase">Payroll Deduction</span>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    {addons.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center rounded-xl border border-border bg-muted/5 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">{item.quantity}x</span>
                          <span className="text-sm font-medium text-foreground/80">{item.addon.name}</span>
                        </div>
                        <span className="text-sm font-bold text-foreground">₹{item.priceAtSelection * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <footer className="pt-4 border-t border-border mt-4">
                <p className="text-center text-[10px] font-medium text-muted-foreground uppercase tracking-tight">
                  Selection updated: {formatTimestamp(updatedAt)}
                </p>
              </footer>
            </div>
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