"use client"
import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
    LayoutDashboard,
    UtensilsCrossed,
    Star,
    LogOut,
    Menu,
    Users,
    X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { CompanySwitcher, type ManagedCompany } from "@/components/ops/company-switcher"

const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/menus", label: "Menu", icon: UtensilsCrossed },
    { href: "/admin/employees", label: "Employees", icon: Users },
    { href: "/admin/reviews", label: "Reviews", icon: Star },
]

interface AdminSidebarProps {
    companyName: string
    companyIcon?: string | null
    managedCompanies: ManagedCompany[]
}

export function AdminSidebar({ companyName, companyIcon, managedCompanies }: AdminSidebarProps) {
    const pathname = usePathname()
    const [mobileOpen, setMobileOpen] = useState(false)

    const sidebarContent = (
        <div className="flex h-full flex-col">
            <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                <Image
                    src="/logo-large.png"
                    alt="FolksMeal"
                    width={110}
                    height={28}
                    className="h-7 w-auto"
                    priority
                />
            </div>

            <div className="px-3 py-3">
                <CompanySwitcher
                    currentCompanyName={companyName}
                    currentCompanyIcon={companyIcon}
                    managedCompanies={managedCompanies}
                />
            </div>

            <nav className="flex-1 space-y-1 px-3 py-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <item.icon className="h-4 w-4 shrink-0" />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            <div className="border-t border-border p-3">
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
                    onClick={() => signOut({ callbackUrl: "/admin" })}
                >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                </Button>
            </div>
        </div>
    )

    return (
        <>
            <button
                onClick={() => setMobileOpen(true)}
                className="fixed left-4 top-4 z-40 rounded-lg border border-border bg-card p-2 shadow-sm lg:hidden cursor-pointer"
            >
                <Menu className="h-5 w-5" />
            </button>

            {mobileOpen && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setMobileOpen(false)}
                    />
                    <div className="relative z-50 h-full w-64 bg-card shadow-xl">
                        <button
                            onClick={() => setMobileOpen(false)}
                            className="absolute right-3 top-4 rounded-lg p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        {sidebarContent}
                    </div>
                </div>
            )}

            <aside className="hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-border lg:bg-card">
                {sidebarContent}
            </aside>
        </>
    )
}
