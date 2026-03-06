"use client"
import { useState } from "react"
import { useSession } from "next-auth/react"
import { Building, Check, ChevronRight, Loader2 } from "lucide-react"
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
    addressCity: string
}

interface CompanySwitcherProps {
    currentCompanyName: string
    managedCompanies: ManagedCompany[]
}

export function CompanySwitcher({
    currentCompanyName,
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
            <div className="flex h-10 items-center justify-between gap-3 rounded-xl border border-input bg-card px-4 py-2">
                <div className="flex items-center gap-2.5">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="max-w-[140px] truncate text-sm font-semibold text-foreground sm:max-w-[200px]">
                        {currentCompanyName}
                    </span>
                </div>
            </div>
        )
    }

    return (
        <>
            {isSwitching && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="mt-4 text-sm font-medium text-muted-foreground">Switching context...</p>
                </div>
            )}

            <Popover open={showSwitcher} onOpenChange={setShowSwitcher}>
                <PopoverTrigger asChild>
                    <button className="flex h-10 cursor-pointer items-center justify-between gap-3 rounded-xl border border-input bg-card px-4 py-2 transition-all hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20">
                        <div className="flex items-center gap-2.5">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span className="max-w-[140px] truncate text-sm font-semibold text-foreground sm:max-w-[200px]">
                                {currentCompanyName}
                            </span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90" />
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                    <Command className="rounded-xl border-none">
                        <CommandInput placeholder="Search location" className="h-11 border-none focus:ring-0" />
                        <CommandList className="max-h-[320px] p-1.5">
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
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-sm font-semibold tracking-tight">{company.companyName}</span>
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                                    {company.addressCity}
                                                </span>
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
