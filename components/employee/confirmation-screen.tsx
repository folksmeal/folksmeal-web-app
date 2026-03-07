"use client"
import { useState, useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, XCircle, ArrowLeft, LogOut, Building, Star, Loader2 } from "lucide-react"
import { format, parseISO } from "date-fns"

interface ConfirmationScreenProps {
  employeeCode: string
  companyName: string
  status: "OPT_IN" | "OPT_OUT"
  preference: "VEG" | "NONVEG" | null
  updatedAt: string
  mealDate: string
  existingRating?: { rating: number; comment: string | null } | null
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
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(!!existingRating)

  const handleSubmitRating = useCallback(async () => {
    if (rating === 0) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/meal-rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment || undefined, date: mealDate }),
      })
      if (res.ok) setSubmitted(true)
    } catch { /* silently fail */ } finally {
      setSubmitting(false)
    }
  }, [rating, comment, mealDate])

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="text-sm font-semibold text-foreground">
        {submitted ? "Thanks for your feedback!" : "Rate today's meal"}
      </p>
      <div className="mt-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => { setRating(star); setSubmitted(false) }}
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              className={`h-7 w-7 transition-colors ${star <= (hoveredStar || rating)
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/30"
                }`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-xs text-muted-foreground">{rating}/5</span>
        )}
      </div>
      {rating > 0 && !submitted && (
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Any feedback? (optional)"
            rows={2}
            maxLength={500}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
          <Button
            size="sm"
            onClick={handleSubmitRating}
            disabled={submitting}
            className="w-fit"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Submit Rating
          </Button>
        </div>
      )}
      {submitted && (
        <p className="mt-2 text-xs text-muted-foreground">
          You rated this meal {rating} star{rating !== 1 ? "s" : ""}.{" "}
          <button onClick={() => setSubmitted(false)} className="text-primary hover:underline">Edit</button>
        </p>
      )}
    </div>
  )
}

export function ConfirmationScreen({
  companyName,
  status,
  preference,
  updatedAt,
  mealDate,
  existingRating,
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
            <div className="hidden h-9 items-center justify-center gap-2 rounded-xl bg-primary/10 px-4 sm:flex">
              <Building className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">
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
          <div className="flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-primary/10 px-4">
            <Building className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary truncate max-w-[200px]">
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
                      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-2 ${cfg.badgeBorder}`}
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

          {status === "OPT_IN" && (
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