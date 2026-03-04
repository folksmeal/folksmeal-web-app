"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Clock, Check, X, LogOut } from "lucide-react"

export type MealChoice = "veg" | "nonveg"

export interface MenuConfig {
  vegLabel: string
  vegDescription: string
  nonvegLabel: string
  nonvegDescription: string
  nonvegAvailable: boolean
  cutoffHour: number
  cutoffMinute: number
}

interface MenuScreenProps {
  employeeId: string
  config: MenuConfig
  onSubmit: (choice: MealChoice | "opted-out") => void
  onLogout: () => void
}

function formatTomorrow() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function isPastCutoff(hour: number, minute: number) {
  const now = new Date()
  return now.getHours() > hour || (now.getHours() === hour && now.getMinutes() >= minute)
}

function formatCutoff(hour: number, minute: number) {
  const h = hour % 12 || 12
  const m = minute.toString().padStart(2, "0")
  const ampm = hour >= 12 ? "PM" : "AM"
  return `${h}:${m} ${ampm}`
}

export function MenuScreen({ employeeId, config, onSubmit, onLogout }: MenuScreenProps) {
  const [selected, setSelected] = useState<MealChoice | null>(null)

  const pastCutoff = useMemo(
    () => isPastCutoff(config.cutoffHour, config.cutoffMinute),
    [config.cutoffHour, config.cutoffMinute]
  )

  const tomorrowDate = useMemo(() => formatTomorrow(), [])
  const cutoffLabel = useMemo(
    () => formatCutoff(config.cutoffHour, config.cutoffMinute),
    [config.cutoffHour, config.cutoffMinute]
  )

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
        <div className="flex flex-col gap-5">
          {/* Date and context */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {tomorrowDate}
            </p>
            <h1
              className="mt-1.5 text-lg font-semibold text-foreground"
              style={{ fontFamily: "var(--font-heading)" }}
            >
            {"Select your meal preference for tomorrow"}
          </h1>
          </div>

          {/* Cutoff notice */}
          {!pastCutoff ? (
            <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-accent px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-col">
                <p className="text-xs font-medium text-foreground">
                  {"Cutoff Time: "}{cutoffLabel}{" today"}
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
                  {"Cutoff time ("}{cutoffLabel}{") has passed"}
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
            disabled={pastCutoff}
            className="flex flex-col gap-3"
          >
            {/* Veg */}
            <Label
              htmlFor="veg"
              className={`flex cursor-pointer items-start gap-3.5 rounded-lg border p-4 transition-colors ${
                pastCutoff ? "cursor-not-allowed opacity-50" : ""
              } ${selected === "veg" ? "border-primary/40 bg-accent" : "border-border bg-card hover:bg-secondary"}`}
            >
              <RadioGroupItem value="veg" id="veg" disabled={pastCutoff} className="mt-0.5 shrink-0" />
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-2 border-veg"
                    aria-hidden="true"
                  >
                    <span className="h-2 w-2 rounded-full bg-veg" />
                  </span>
                  <span className="text-sm font-medium text-foreground">{config.vegLabel}</span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{config.vegDescription}</p>
              </div>
            </Label>

            {/* Non-Veg */}
            <Label
              htmlFor="nonveg"
              className={`flex items-start gap-3.5 rounded-lg border p-4 transition-colors ${
                !config.nonvegAvailable || pastCutoff
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer"
              } ${selected === "nonveg" ? "border-primary/40 bg-accent" : "border-border bg-card hover:bg-secondary"}`}
            >
              <RadioGroupItem
                value="nonveg"
                id="nonveg"
                disabled={!config.nonvegAvailable || pastCutoff}
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
                  <span className="text-sm font-medium text-foreground">{config.nonvegLabel}</span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {config.nonvegAvailable ? config.nonvegDescription : "Not available today"}
                </p>
              </div>
            </Label>
          </RadioGroup>

          <Separator />

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              size="lg"
              className={`flex-1 gap-2 ${
                !selected || pastCutoff
                  ? "cursor-not-allowed bg-muted text-muted-foreground hover:bg-muted"
                  : ""
              }`}
              disabled={!selected || pastCutoff}
              onClick={() => selected && onSubmit(selected)}
            >
              <Check className="h-4 w-4" />
              Opt In
            </Button>
            <Button
              size="lg"
              variant="outline"
              className={`flex-1 gap-2 ${
                pastCutoff
                  ? "cursor-not-allowed border-muted bg-muted text-muted-foreground hover:bg-muted hover:text-muted-foreground"
                  : ""
              }`}
              disabled={pastCutoff}
              onClick={() => onSubmit("opted-out")}
            >
              <X className="h-4 w-4" />
              Opt Out
            </Button>
          </div>
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
