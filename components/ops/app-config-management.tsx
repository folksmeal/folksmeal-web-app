"use client"

import useSWR from "swr"
import { useState, useTransition } from "react"
import { Settings2, Users, Building2 } from "lucide-react"
import { toast } from "sonner"
import { fetcher } from "@/lib/fetcher"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"

interface CompanyConfigRow {
    id: string
    name: string
    domain: string | null
    icon: string | null
    counts: {
        employees: number
        admins: number
        locations: number
    }
    features: {
        employeeManagementEnabled: boolean
        menuEnabled: boolean
        reviewsEnabled: boolean
    }
}

export function AppConfigManagement() {
    const headingFontStyle = { fontFamily: "var(--font-heading)" } as const
    const { data, mutate } = useSWR<{ companies: CompanyConfigRow[] }>("/api/ops/app-config", fetcher)
    const [pendingCompanyId, setPendingCompanyId] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    const companies = data?.companies ?? []

    const handleFeatureToggle = (
        companyId: string,
        feature: "employeeManagementEnabled" | "menuEnabled" | "reviewsEnabled",
        nextValue: boolean
    ) => {
        setPendingCompanyId(companyId)

        startTransition(async () => {
            const optimistic = companies.map((company) =>
                company.id === companyId
                    ? {
                        ...company,
                        features: {
                            ...company.features,
                            [feature]: nextValue,
                        },
                    }
                    : company
            )

            mutate({ companies: optimistic }, { revalidate: false })

            try {
                const response = await fetch("/api/ops/app-config", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        companyId,
                        employeeManagementEnabled:
                            feature === "employeeManagementEnabled"
                                ? nextValue
                                : companies.find((company) => company.id === companyId)?.features.employeeManagementEnabled ?? true,
                        menuEnabled:
                            feature === "menuEnabled"
                                ? nextValue
                                : companies.find((company) => company.id === companyId)?.features.menuEnabled ?? true,
                        reviewsEnabled:
                            feature === "reviewsEnabled"
                                ? nextValue
                                : companies.find((company) => company.id === companyId)?.features.reviewsEnabled ?? true,
                    }),
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    throw new Error(errorData.error || "Failed to update app config")
                }

                toast.success("App config updated")
                mutate()
            } catch (error) {
                mutate()
                toast.error(error instanceof Error ? error.message : "Failed to update app config")
            } finally {
                setPendingCompanyId(null)
            }
        })
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="rounded-lg border border-border bg-card px-4 py-3 sm:px-5 sm:py-4">
                <div className="space-y-0.5">
                    <h1 className="text-lg font-semibold text-foreground" style={headingFontStyle}>
                        App Config
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Control which admin features are available to company admins.
                    </p>
                </div>
            </div>

            <div className="grid gap-4">
                {companies.map((company) => {
                    const isUpdating = isPending && pendingCompanyId === company.id

                    return (
                        <div key={company.id} className="rounded-lg border border-border bg-card p-5">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="space-y-1">
                                    <p className="text-base font-semibold text-foreground">{company.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {company.domain || "No domain configured"}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
                                        <span className="inline-flex items-center gap-1.5">
                                            <Users className="h-3.5 w-3.5" />
                                            {company.counts.employees} employees
                                        </span>
                                        <span className="inline-flex items-center gap-1.5">
                                            <Settings2 className="h-3.5 w-3.5" />
                                            {company.counts.admins} admin users
                                        </span>
                                        <span className="inline-flex items-center gap-1.5">
                                            <Building2 className="h-3.5 w-3.5" />
                                            {company.counts.locations} locations
                                        </span>
                                    </div>
                                </div>

                                <div className="w-full rounded-xl border border-border bg-muted/20 p-4 lg:max-w-md">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">Employee Management</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Allow company admins to access employee management, bulk upload, and exports.
                                                </p>
                                            </div>
                                            <Switch
                                                checked={company.features.employeeManagementEnabled}
                                                disabled={isUpdating}
                                                onCheckedChange={(checked) => handleFeatureToggle(company.id, "employeeManagementEnabled", checked)}
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <p className="text-sm font-semibold text-foreground">Menu</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Allow company admins to view the weekly menu page for their selected location.
                                                    </p>
                                                </div>
                                                <Switch
                                                    checked={company.features.menuEnabled}
                                                    disabled={isUpdating}
                                                    onCheckedChange={(checked) => handleFeatureToggle(company.id, "menuEnabled", checked)}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">Reviews</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Allow company admins to access meal review analytics and feedback history.
                                                </p>
                                            </div>
                                            <Switch
                                                checked={company.features.reviewsEnabled}
                                                disabled={isUpdating}
                                                onCheckedChange={(checked) => handleFeatureToggle(company.id, "reviewsEnabled", checked)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}

                {companies.length === 0 && (
                    <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
                        No companies found.
                    </div>
                )}
            </div>
        </div>
    )
}
