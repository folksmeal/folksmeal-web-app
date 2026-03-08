"use client"
import { useState } from "react"
import { useSession } from "next-auth/react"
import { Building, Check, ChevronRight, Loader2 } from "lucide-react"
import Image from "next/image"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

export interface ManagedCompany {
    id: string
    name: string
    companyName: string
    companyIcon?: string | null
    addressCity: string
}

interface CompanySwitcherProps {
    currentCompanyName: string
    currentCompanyIcon?: string | null
    managedCompanies: ManagedCompany[]
}

export function CompanySwitcher({
    currentCompanyName,
    currentCompanyIcon,
    managedCompanies,
}: CompanySwitcherProps) {
    const { update } = useSession()
    const [isSwitching, setIsSwitching] = useState(false)
    const [showSwitcher, setShowSwitcher] = useState(false)

    const handleSwitchCompany = async (companyId: string) => {
        setIsSwitching(true)
        setShowSwitcher(false)
        try {
            const res = await fetch('/api/ops/switch-company', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyId })
            })
            if (!res.ok) throw new Error("Failed to switch company")
            const data = await res.json()
            await update({ newLocation: data.newLocation })
            window.location.reload()
        } catch (error) {
            console.error("Switch failed", error)
            setIsSwitching(false)
        }
    }

    if (managedCompanies.length <= 1) {
        return (
            <div className="flex w-full h-10 items-center justify-between gap-3 rounded-xl border border-input bg-card px-4 py-2">
                <div className="flex flex-1 items-center gap-2.5 min-w-0">
                    {currentCompanyIcon ? (
                        <div className="relative h-5 w-5 shrink-0 overflow-hidden rounded-md border border-border/50 bg-muted/30">
                            <Image
                                src={currentCompanyIcon}
                                alt={currentCompanyName}
                                fill
                                className="object-contain p-0.5"
                                unoptimized
                            />
                        </div>
                    ) : (
                        <Building className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate text-sm font-semibold text-foreground">
                        {currentCompanyName}
                    </span>
                </div>
            </div>
        )
    }

    return (
        <>
            {isSwitching && (
                <div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="mt-4 text-sm font-medium text-muted-foreground">Switching context...</p>
                </div>
            )}

            <Popover open={showSwitcher} onOpenChange={setShowSwitcher}>
                <PopoverTrigger asChild>
                    <button className="flex w-full h-10 cursor-pointer items-center justify-between gap-3 rounded-xl border border-input bg-card px-4 py-2 transition-all hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20">
                        <div className="flex flex-1 items-center gap-2.5 min-w-0">
                            {currentCompanyIcon ? (
                                <div className="relative h-5 w-5 shrink-0 overflow-hidden rounded-md border border-border/50 bg-muted/30">
                                    <Image
                                        src={currentCompanyIcon}
                                        alt={currentCompanyName}
                                        fill
                                        className="object-contain p-0.5"
                                        unoptimized
                                    />
                                </div>
                            ) : (
                                <Building className="h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                            <span className="truncate text-sm font-semibold text-foreground">
                                {currentCompanyName}
                            </span>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90" />
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-75 p-0" align="start">
                    <Command className="rounded-xl border-none">
                        <CommandInput placeholder="Search location" className="h-11 border-none focus:ring-0" />
                        <CommandList className="max-h-80 p-1.5">
                            <CommandEmpty className="py-6 text-xs text-muted-foreground">No location found.</CommandEmpty>
                            <CommandGroup>
                                {managedCompanies.map((company) => {
                                    const isActive = currentCompanyName === company.name
                                    return (
                                        <CommandItem
                                            key={company.id}
                                            onSelect={() => {
                                                if (!isActive) handleSwitchCompany(company.id)
                                            }}
                                            disabled={isSwitching}
                                            className={cn(
                                                "group flex cursor-pointer items-center justify-between rounded-xl px-3.5 py-3 transition-all text-foreground mt-1",
                                                isActive ? "bg-primary/15 font-semibold text-primary shadow-sm" : "hover:bg-accent/50"
                                            )}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                {company.companyIcon ? (
                                                    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-muted/30">
                                                        <Image
                                                            src={company.companyIcon}
                                                            alt={company.companyName}
                                                            fill
                                                            className="object-contain p-1"
                                                            unoptimized
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/30">
                                                        <Building className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <div className="flex flex-col gap-0.5 truncate">
                                                    <span className="text-sm font-semibold tracking-tight truncate">{company.companyName}</span>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                                        {company.addressCity}
                                                    </span>
                                                </div>
                                            </div>
                                            {isActive ? (
                                                <Check className="h-4 w-4 text-primary" strokeWidth={3} />
                                            ) : (
                                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
                                            )}
                                        </CommandItem>
                                    )
                                })}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </>
    )
}
