"use client"
import Image from "next/image"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Building, LogOut } from "lucide-react"
import { useCallback } from "react"

interface EmployeeHeaderProps {
    companyName: string
    companyIcon?: string | null
}

export function EmployeeHeader({ companyName, companyIcon }: EmployeeHeaderProps) {
    const handleLogout = useCallback(async () => {
        await signOut({ callbackUrl: "/" })
    }, [])

    return (
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
                    <div className="hidden h-10 items-center gap-2.5 rounded-xl border border-input bg-card px-4 py-2 sm:flex">
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
                    className="h-10 rounded-xl border-input bg-card px-5 font-semibold transition-all hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30"
                >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out
                </Button>
            </div>
            {/* Mobile Company Info */}
            <div className="mx-auto flex max-w-7xl items-center px-6 pb-3 sm:hidden">
                <div className="flex h-10 w-full items-center justify-center gap-2.5 rounded-xl border border-input bg-card px-4 py-2 shadow-sm">
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
    )
}
