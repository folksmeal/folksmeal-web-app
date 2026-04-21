"use client"
import { useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  addDaysToISTDateString,
  formatISTDisplayDate,
  getISTDateString,
  isPastCutoffInTimezone,
} from "@/lib/utils/time"
import { Clock, X, Loader2, AlertCircle, Info, ArrowRight, ArrowLeft, Plus, Minus, Receipt } from "lucide-react"
import { submitMealSelection } from "@/app/actions/meal-selection"
import type { MealPreference, SelectionStatus } from "@/types/employee"

export type MealChoice = MealPreference
type AddonType = "MAIN_REPEAT" | "PROTEIN_SIDE" | "BEVERAGE" | "SIDE_DESSERT" | "BREAD_ADDITION"

export interface Addon {
  id: string
  name: string
  unitPrice: number
  maxQty: number
  isRepeatable: boolean
  isLinkedToMenu: boolean
  type: AddonType
  active: boolean
}

export interface MenuData {
  date: string
  day: string | null
  vegItem: string | null
  vegItemDescription: string | null
  nonvegItem: string | null
  nonvegItemDescription: string | null
  sideBeverage: string | null
  notes: string | null
  available: boolean
  isWorkingDay?: boolean
}

export interface ExistingSelection {
  status: SelectionStatus
  preference: MealChoice | null
  updatedAt: string
  addons?: { addonId: string; quantity: number }[]
}

interface MenuScreenProps {
  employeeCode: string
  employeeName: string
  timezone: string
  cutoffTime: string
  menu: MenuData | null
  existingSelection: ExistingSelection | null
  availableAddons?: Addon[]
  addonsEnabled?: boolean
}

const TYPE_LABELS: Record<AddonType, string> = {
  MAIN_REPEAT: "Repeat Mains",
  PROTEIN_SIDE: "Protein Add-ons",
  BEVERAGE: "Beverages",
  SIDE_DESSERT: "Sides & Desserts",
  BREAD_ADDITION: "Breads",
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
  timezone,
  cutoffTime,
  menu,
  existingSelection,
  availableAddons = [],
  addonsEnabled = false,
}: MenuScreenProps) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)

  const [selected, setSelected] = useState<MealChoice | null>(
    existingSelection?.status === "OPT_IN" ? existingSelection.preference : null
  )

  const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    if (existingSelection?.addons) {
      existingSelection.addons.forEach(a => init[a.addonId] = a.quantity)
    }
    return init
  })

  const [loadingAction, setLoadingAction] = useState<SelectionStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Clear mismatched MAIN_REPEAT addons when selection changes
  const handleSelectionChange = (choice: MealChoice) => {
    setSelected(choice)
    setAddonQuantities(prev => {
      const next = { ...prev }
      let changed = false
      Object.keys(next).forEach(addonId => {
        const addon = availableAddons.find(a => a.id === addonId)
        if (addon?.type === "MAIN_REPEAT") {
          const isVeg = addon.name.toLowerCase().includes("veg") && !addon.name.toLowerCase().includes("non")
          const isNonVeg = addon.name.toLowerCase().includes("non")
          if ((choice === "VEG" && isNonVeg) || (choice === "NONVEG" && isVeg)) {
            delete next[addonId]
            changed = true
          }
        }
      })
      return changed ? next : prev
    })
  }

  const pastCutoff = useMemo(() => isPastCutoffInTimezone(cutoffTime, timezone), [cutoffTime, timezone])
  const cutoffLabel = useMemo(() => formatCutoff(cutoffTime), [cutoffTime])
  const tomorrowLabel = useMemo(() => {
    const ymd = menu?.date ? menu.date.split("T")[0] : addDaysToISTDateString(getISTDateString(), 1)
    return formatISTDisplayDate(ymd)
  }, [menu?.date])

  const nonvegAvailable = Boolean(menu?.nonvegItem)

  const handleNextToStep2 = () => {
    if (!selected) return
    setStep(2)
  }

  const handleNextToStep3 = () => {
    setStep(3)
  }

  const handleBackToStep1 = () => {
    setStep(1)
  }

  const handleBackToStep2 = () => {
    setStep(2)
  }

  const updateAddonQuantity = (addonId: string, delta: number, maxQty: number) => {
    setAddonQuantities(prev => {
      const current = prev[addonId] || 0
      const next = Math.max(0, Math.min(current + delta, maxQty))
      if (next === 0) {
        const copy = { ...prev }
        delete copy[addonId]
        return copy
      }
      return { ...prev, [addonId]: next }
    })
  }

  const handleSubmit = useCallback(
    async (status: SelectionStatus) => {
      setLoadingAction(status)
      setError(null)
      try {
        const addonsPayload = Object.entries(addonQuantities).map(([addonId, quantity]) => ({
          addonId,
          quantity
        }))

        const result = await submitMealSelection({
          status,
          preference: status === "OPT_IN" ? selected : null,
          addons: status === "OPT_IN" ? addonsPayload : [],
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
        setLoadingAction(null)
      }
    },
    [selected, addonQuantities, router]
  )

  const filteredAddons = useMemo(() => {
    return availableAddons.filter(addon => {
      if (addon.type !== "MAIN_REPEAT") return true
      if (selected === "VEG") {
        // If Veg is selected, show only Veg repeat mains
        return addon.name.toLowerCase().includes("veg") && !addon.name.toLowerCase().includes("non")
      }
      if (selected === "NONVEG") {
        // If Non-Veg is selected, show only Non-Veg repeat mains
        return addon.name.toLowerCase().includes("non")
      }
      return true
    })
  }, [availableAddons, selected])

  const groupedAddons = useMemo(() => {
    const groups: Partial<Record<AddonType, Addon[]>> = {}
    filteredAddons.forEach(a => {
      if (!groups[a.type]) groups[a.type] = []
      groups[a.type]!.push(a)
    })
    return groups
  }, [filteredAddons])

  const totalAddonPrice = useMemo(() => {
    return Object.entries(addonQuantities).reduce((acc, [addonId, qty]) => {
      const addon = availableAddons.find(a => a.id === addonId)
      return acc + (addon ? addon.unitPrice * qty : 0)
    }, 0)
  }, [addonQuantities, availableAddons])

  const renderHoliday = () => (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg sm:max-w-md mx-auto w-full transition-all duration-300 hover:shadow-xl">
      <div className="flex flex-col items-center gap-4 p-8 text-center bg-card">
        <h3 className="text-2xl font-bold tracking-tight text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          It's a Holiday!
        </h3>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Take a break and recharge! Meal selections are paused for <span className="font-semibold text-foreground">{tomorrowLabel}</span>.
          </p>
        </div>
      </div>
    </div>
  )

  const renderNotAvailable = () => (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg sm:max-w-md mx-auto w-full transition-all duration-300 hover:shadow-xl mt-6">
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 mb-2">
          <AlertCircle className="h-8 w-8 text-amber-500" />
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-semibold text-foreground">Menu Not Available</h3>
          <p className="text-sm text-muted-foreground max-w-75 mx-auto">
            No menu has been posted for {tomorrowLabel} yet. Please check back later.
          </p>
        </div>
      </div>
    </div>
  )

  const renderStep1 = () => (
    <>
      <RadioGroup
        value={selected ?? ""}
        onValueChange={(v) => handleSelectionChange(v as MealChoice)}
        disabled={pastCutoff || loadingAction !== null}
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
          <RadioGroupItem value="VEG" id="veg" disabled={pastCutoff} className="mt-0.5 shrink-0" />
          <div className="flex flex-col gap-1 w-full">
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-2 border-veg">
                  <span className="h-2 w-2 rounded-full bg-veg" />
                </span>
                <span className="text-sm font-medium text-foreground">Veg Meal</span>
              </div>
              {menu?.vegItemDescription?.trim() && (
                <Dialog>
                  <DialogTrigger asChild>
                    <button type="button" className="rounded-full p-1.5 hover:bg-veg/10 transition-colors cursor-pointer text-muted-foreground hover:text-veg">
                      <Info className="h-4 w-4" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl sm:max-w-md p-0 overflow-hidden border-none shadow-2xl">
                    <div className="bg-veg/5 p-6 pb-4 border-b border-veg/10">
                      <DialogHeader>
                        <DialogTitle className="text-foreground text-xl font-bold tracking-tight">{menu.vegItem}</DialogTitle>
                      </DialogHeader>
                    </div>
                    <ScrollArea className="max-h-[60vh] p-6 pt-4">
                      <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                        {menu.vegItemDescription}
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{menu?.vegItem}</p>
            {menu?.sideBeverage && <p className="mt-1 text-[11px] font-medium text-muted-foreground">Included: {menu.sideBeverage}</p>}
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
          <RadioGroupItem value="NONVEG" id="nonveg" disabled={!nonvegAvailable || pastCutoff} className="mt-0.5 shrink-0" />
          <div className="flex flex-col gap-1 w-full">
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-2 border-nonveg">
                  <span className="h-2 w-2 rounded-full bg-nonveg" />
                </span>
                <span className="text-sm font-medium text-foreground">Non-Veg Meal</span>
              </div>
              {menu?.nonvegItemDescription?.trim() && (
                <Dialog>
                  <DialogTrigger asChild>
                    <button type="button" className="rounded-full p-1.5 hover:bg-nonveg/10 transition-colors cursor-pointer text-muted-foreground hover:text-nonveg">
                      <Info className="h-4 w-4" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl sm:max-w-md p-0 overflow-hidden border-none shadow-2xl">
                    <div className="bg-nonveg/5 p-6 pb-4 border-b border-nonveg/10">
                      <DialogHeader>
                        <DialogTitle className="text-foreground text-xl font-bold tracking-tight">{menu.nonvegItem}</DialogTitle>
                      </DialogHeader>
                    </div>
                    <ScrollArea className="max-h-[60vh] p-6 pt-4">
                      <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                        {menu.nonvegItemDescription}
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {nonvegAvailable ? menu?.nonvegItem : "Not available tomorrow"}
            </p>
            {nonvegAvailable && menu?.sideBeverage && (
              <p className="mt-1 text-[11px] font-medium text-muted-foreground">Included: {menu.sideBeverage}</p>
            )}
          </div>
        </Label>
      </RadioGroup>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 mt-4">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      <div className="flex gap-3 mt-auto pt-4">
        <Button
          variant="outline"
          className="flex-1"
          disabled={pastCutoff || loadingAction !== null}
          onClick={() => handleSubmit("OPT_OUT")}
        >
          {loadingAction === "OPT_OUT" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          Opt Out
        </Button>
        {addonsEnabled ? (
          <Button
            className="flex-1 gap-2"
            disabled={!selected || pastCutoff || loadingAction !== null}
            onClick={handleNextToStep2}
          >
            Next: Add-ons
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            className="flex-1 gap-2"
            disabled={!selected || pastCutoff || loadingAction !== null}
            onClick={() => handleSubmit("OPT_IN")}
          >
            {loadingAction === "OPT_IN" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Opt In
          </Button>
        )}
      </div>
    </>
  )

  const renderStep2 = () => {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2 text-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
          <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-heading)" }}>Select Add-ons</h2>
        </div>

        {availableAddons.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No add-ons available for this location.</p>
        ) : (
          <ScrollArea className="h-[45vh]">
            <div className="px-1 py-1 space-y-6">
              {Object.entries(groupedAddons).map(([type, addons]) => (
                <div key={type} className="space-y-4">
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">{TYPE_LABELS[type as AddonType]}</h3>
                  <div className="grid gap-3">
                    {addons?.map(addon => {
                      let displayName = addon.name
                      if (addon.isLinkedToMenu) {
                        if (addon.name.toLowerCase().includes('veg') && !addon.name.toLowerCase().includes('non-veg') && menu?.vegItem) {
                          displayName = `${addon.name} (${menu.vegItem})`
                        } else if (addon.name.toLowerCase().includes('non') && menu?.nonvegItem) {
                          displayName = `${addon.name} (${menu.nonvegItem})`
                        }
                      }

                      const quantity = addonQuantities[addon.id] || 0
                      const isSelected = quantity > 0

                      return (
                        <div
                          key={addon.id}
                          className={`group relative flex items-center justify-between rounded-xl border p-4 mr-3 transition-all duration-200 ${isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary/10"
                            : "border-border/60 bg-card hover:border-primary/30"
                            }`}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-semibold text-foreground">{displayName}</span>
                            <span className="text-xs font-medium text-muted-foreground">₹{addon.unitPrice}</span>
                          </div>
                          <div className="flex items-center gap-1 bg-muted/30 rounded-full p-1 border border-border/50">
                            <button
                              type="button"
                              onClick={() => updateAddonQuantity(addon.id, -1, addon.maxQty)}
                              disabled={!quantity}
                              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground cursor-pointer transition-all hover:bg-white hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-8 text-center text-sm font-bold text-foreground cursor-pointer select-none">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateAddonQuantity(addon.id, 1, addon.maxQty)}
                              disabled={quantity >= addon.maxQty}
                              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground cursor-pointer transition-all hover:bg-white hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {totalAddonPrice > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-primary/5 p-3 px-4 border border-primary/10">
            <span className="text-sm font-medium text-foreground">Add-on Total:</span>
            <span className="text-base font-bold text-primary">₹{totalAddonPrice}</span>
          </div>
        )}

        <div className="flex gap-3 mt-auto">
          <Button variant="outline" className="flex-1 gap-2" onClick={handleBackToStep1}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button className="flex-1 gap-2" onClick={handleNextToStep3}>
            Next: Summary <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  const renderStep3 = () => {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2 text-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
          <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-heading)" }}>Order Summary</h2>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-border bg-card">
          <div className="bg-muted/30 px-6 py-4 border-b border-border/50">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-widest pl-1">Review Order</h3>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest pl-1">Selection</h4>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 border border-emerald-100">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">Paid by Company</span>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/20 p-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 ${selected === "VEG" ? "border-veg bg-white" : "border-nonveg bg-white"}`}>
                  <div className={`h-3 w-3 rounded-full ${selected === "VEG" ? "bg-veg" : "bg-nonveg"}`} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-foreground">{selected === "VEG" ? "Vegetarian" : "Non-Vegetarian"}</span>
                  <span className="text-xs text-muted-foreground line-clamp-1">
                    {selected === "VEG" ? menu?.vegItem : menu?.nonvegItem}
                  </span>
                </div>
              </div>
            </div>

            {Object.keys(addonQuantities).length > 0 && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest pl-1">Extra Add-ons</h4>
                <div className="grid gap-2">
                  {Object.entries(addonQuantities).map(([addonId, qty]) => {
                    const addon = availableAddons.find(a => a.id === addonId)
                    if (!addon) return null
                    let displayName = addon.name
                    if (addon.isLinkedToMenu) {
                      if (addon.name.toLowerCase().includes('veg') && !addon.name.toLowerCase().includes('non-veg') && menu?.vegItem) {
                        displayName = `${addon.name} (${menu.vegItem})`
                      } else if (addon.name.toLowerCase().includes('non') && menu?.nonvegItem) {
                        displayName = `${addon.name} (${menu.nonvegItem})`
                      }
                    }
                    return (
                      <div key={addonId} className="flex justify-between items-center rounded-xl border border-border bg-muted/5 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">{qty}x</span>
                          <span className="text-sm font-medium text-foreground/80">{displayName}</span>
                        </div>
                        <span className="text-sm font-bold text-foreground">₹{addon.unitPrice * qty}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-border flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Add-on Cost</span>
                <span className="text-xl font-black text-foreground">₹{totalAddonPrice}</span>
              </div>
              {totalAddonPrice > 0 && (
                <div className="flex flex-col items-end gap-1">
                  <div className="px-2 py-1 rounded bg-amber-50 border border-amber-100">
                    <span className="text-[10px] font-bold text-amber-700 uppercase">Payroll Deduction</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        <div className="flex gap-3 mt-auto">
          <Button variant="outline" className="flex-1 gap-2" onClick={handleBackToStep2} disabled={loadingAction !== null}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleSubmit("OPT_IN")} disabled={loadingAction !== null}>
            {loadingAction === "OPT_IN" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
            Confirm Selection
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1">
      <main className={`mx-auto w-full max-w-7xl flex-1 px-6 py-6 ${menu?.isWorkingDay === false ? "flex flex-col justify-center items-center" : ""}`}>
        <div className={`flex flex-col gap-5 w-full ${menu?.isWorkingDay === false ? "max-w-md" : (step === 1 ? "" : "max-w-lg mx-auto")}`}>
          {/* Header */}
          <div className={menu?.isWorkingDay === false ? "text-center mb-2" : "mb-2"}>
            {step === 1 && (
              <p className={`${menu?.isWorkingDay === false ? "text-2xl pb-2" : "text-xl"} text-muted-foreground`}>
                Welcome, <span className="font-medium text-foreground">{employeeName}</span>
              </p>
            )}
            {menu?.isWorkingDay !== false && step === 1 && (
              <h1 className="mt-2 text-2xl font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                Select your meal preference for {tomorrowLabel}
              </h1>
            )}
          </div>

          {!menu && (
            <div className="flex flex-col gap-5">
              <Skeleton className="h-14 w-full rounded-lg" />
              <Separator />
              <div className="flex flex-col gap-3">
                <Skeleton className="h-26 w-full rounded-lg" />
                <Skeleton className="h-26 w-full rounded-lg" />
              </div>
            </div>
          )}

          {menu && menu.isWorkingDay === false && renderHoliday()}
          {menu && menu.isWorkingDay !== false && !menu.available && renderNotAvailable()}

          {menu && menu.isWorkingDay !== false && menu.available && (
            <>
              {step === 1 && (
                <>
                  {!pastCutoff ? (
                    <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-white px-4 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <p className="text-xs font-medium text-foreground">Cutoff Time: {cutoffLabel} today</p>
                        <p className="text-[11px] text-muted-foreground">Submit your selection before the deadline</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                        <Clock className="h-4 w-4 text-destructive" />
                      </div>
                      <div className="flex flex-col">
                        <p className="text-xs font-medium text-destructive">Cutoff time ({cutoffLabel}) has passed</p>
                        <p className="text-[11px] text-muted-foreground">Selection is locked. Contact support for assistance.</p>
                      </div>
                    </div>
                  )}
                  <Separator />
                </>
              )}

              <div className="pt-2">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="mt-auto border-t border-border bg-card/50 py-6">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-xs text-muted-foreground">
            Contact us at{" "}
            <a href="mailto:info@folksmeal.com" className="font-medium text-foreground hover:underline">
              info@folksmeal.com
            </a>{" "}
            for support
          </p>
        </div>
      </footer>
    </div>
  )
}
