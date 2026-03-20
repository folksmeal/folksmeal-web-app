"use client"
import { useState, useEffect, useMemo, useCallback } from "react"
import useSWR from "swr"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus, Pencil, Trash2, Loader2, Search, Eye, EyeOff,
    Upload, Download, X, AlertCircle
} from "lucide-react"
import ExcelJS from "exceljs"

import { SearchInput } from "@/components/ui/search-input"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogTrigger, DialogClose
} from "@/components/ui/dialog"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PaginationFooter } from "@/components/ops/pagination-footer"
import { cn } from "@/lib/utils"
import { fetcher } from "@/lib/fetcher"
import { toast } from "sonner"

export type MealPreference = "VEG" | "NONVEG"

interface Employee {
    id: string
    name: string
    employeeCode: string
    email?: string | null
    defaultPreference: MealPreference
    companyId: string
    addressId: string
    companyName: string
    addressCity: string
    password?: string | null
    createdAt: string
}

interface User {
    id: string
    name: string
    email: string
    role: "SUPERADMIN" | "ADMIN"
    companyId: string | null
    companyName: string | null
    password?: string | null
    createdAt: string
}

interface Address {
    id: string
    city: string
    state: string | null
    address: string | null
}

interface Company {
    id: string
    name: string
    addresses: Address[]
}

export function UserManagement({
    effectiveAddressId,
    initialEmployees,
    totalEmployees,
    initialUsers,
    totalUsers,
    isAdminPortal = false
}: {
    effectiveAddressId?: string
    initialEmployees: Employee[]
    totalEmployees: number
    initialUsers: User[]
    totalUsers: number
    isAdminPortal?: boolean
}) {
    const headingFontStyle = { fontFamily: "var(--font-heading)" } as const
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const search = searchParams.get("search") || ""
    const tabParam = searchParams.get("tab") || "employees"
    const empPage = Math.max(1, parseInt(searchParams.get("empPage") || "1"))
    const adminPage = Math.max(1, parseInt(searchParams.get("adminPage") || "1"))

    const empQuery = useMemo(() => {
        const query = new URLSearchParams()
        if (search) query.set("search", search)
        query.set("page", empPage.toString())
        query.set("limit", "15")
        return query.toString()
    }, [search, empPage])

    const adminQuery = useMemo(() => {
        const query = new URLSearchParams()
        if (search) query.set("search", search)
        query.set("page", adminPage.toString())
        query.set("limit", "15")
        return query.toString()
    }, [search, adminPage])

    const { data: empData, mutate: mutateEmp } = useSWR<{ employees: Employee[], pagination?: { total: number } }>(
        `/api/ops/employees?${empQuery}`,
        fetcher,
        { fallbackData: { employees: initialEmployees, pagination: { total: totalEmployees } }, revalidateOnFocus: false }
    )
    const { data: userData, mutate: mutateUser } = useSWR<{ users: User[], pagination?: { total: number } }>(
        isAdminPortal ? null : `/api/ops/users?${adminQuery}`,
        fetcher,
        { fallbackData: { users: initialUsers, pagination: { total: totalUsers } }, revalidateOnFocus: false }
    )

    const employees = empData?.employees ?? initialEmployees
    const users = userData?.users ?? initialUsers
    const finalTotalEmployees = empData?.pagination?.total ?? totalEmployees
    const finalTotalUsers = userData?.pagination?.total ?? totalUsers

    const [searchInput, setSearchInput] = useState(search)
    const [empDialogOpen, setEmpDialogOpen] = useState(false)
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
    const [userDialogOpen, setUserDialogOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [activeTab, setActiveTab] = useState(tabParam)

    useEffect(() => {
        setActiveTab(tabParam)
    }, [tabParam])

    useEffect(() => {
        const handler = setTimeout(() => {
            if (searchInput !== search) {
                const params = new URLSearchParams(searchParams.toString())
                if (searchInput) params.set("search", searchInput)
                else params.delete("search")
                params.set("empPage", "1")
                params.set("adminPage", "1")
                router.replace(`${pathname}?${params.toString()}`, { scroll: false })
            }
        }, 300)
        return () => clearTimeout(handler)
    }, [searchInput, search, pathname, router, searchParams])

    const handleTabChange = useCallback((val: string) => {
        setActiveTab(val)
        const params = new URLSearchParams(searchParams.toString())
        params.set("tab", val)
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }, [pathname, router, searchParams])

    const itemsPerPage = 15
    const totalEmpPages = Math.ceil(finalTotalEmployees / itemsPerPage)
    const totalAdminPages = Math.ceil(finalTotalUsers / itemsPerPage)

    return (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex h-full flex-col gap-6 overflow-hidden">
            <div className="rounded-xl border border-border bg-card shadow-sm px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-xl font-bold tracking-tight text-foreground" style={headingFontStyle}>
                            {isAdminPortal ? "Employee Management" : "User Management"}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {isAdminPortal
                                ? "Manage employee records, credentials, and location assignments."
                                : "Manage employees and admin users from one shared control surface."}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <ExportButton effectiveAddressId={effectiveAddressId} />

                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="h-10 rounded-xl px-4">
                                    <Upload className="mr-2 h-4 w-4" />
                                    Bulk Upload
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Bulk Upload Employees</DialogTitle>
                                </DialogHeader>
                                <BulkUploadForm defaultAddressId={effectiveAddressId} onSuccess={mutateEmp} isAdminPortal={isAdminPortal} />
                            </DialogContent>
                        </Dialog>

                        <Dialog open={empDialogOpen} onOpenChange={(open) => { setEmpDialogOpen(open); if (!open) setEditingEmployee(null) }}>
                            <DialogTrigger asChild>
                                <Button variant={isAdminPortal ? "default" : "outline"} className="h-10 rounded-xl px-4">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Employee
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>{editingEmployee ? "Edit Employee" : "Add Employee"}</DialogTitle>
                                </DialogHeader>
                                <EmployeeForm
                                    employee={editingEmployee}
                                    defaultAddressId={effectiveAddressId}
                                    onSuccess={() => { setEmpDialogOpen(false); setEditingEmployee(null); mutateEmp() }}
                                    isAdminPortal={isAdminPortal}
                                />
                            </DialogContent>
                        </Dialog>

                        {!isAdminPortal && (
                            <Dialog open={userDialogOpen} onOpenChange={(open) => { setUserDialogOpen(open); if (!open) setEditingUser(null) }}>
                                <DialogTrigger asChild>
                                    <Button className="h-10 rounded-xl px-4 shadow-sm">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create User
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>{editingUser ? "Edit User" : "Create User"}</DialogTitle>
                                    </DialogHeader>
                                    <AdminUserForm user={editingUser} onSuccess={() => { setUserDialogOpen(false); setEditingUser(null); mutateUser() }} />
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
                <TabsContent value="employees" className="m-0 flex min-h-0 flex-1 flex-col">
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                        <div className="shrink-0 border-b border-border bg-slate-50/80 px-4 py-3 sm:px-6 flex items-center justify-between gap-4">
                            <p className="text-sm font-bold text-foreground shrink-0" style={headingFontStyle}>Employees</p>

                            <div className="flex items-center gap-3 flex-1 justify-end max-w-2xl">
                                <div className="w-full max-w-xs">
                                    <SearchInput
                                        placeholder="Search employees..."
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        onClear={() => setSearchInput("")}
                                    />
                                </div>

                                {!isAdminPortal && (
                                    <TabsList className="h-9 rounded-lg border border-border bg-muted/50 p-1">
                                        {["employees", "admins"].map((tab) => {
                                            const isSelected = activeTab === tab
                                            return (
                                                <TabsTrigger
                                                    key={tab}
                                                    value={tab}
                                                    className="relative h-7 rounded-md px-4 text-xs font-semibold text-muted-foreground transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                                                >
                                                    {isSelected && (
                                                        <motion.div
                                                            layoutId="activeTabHeader"
                                                            className="absolute inset-0 rounded-md border border-border bg-background"
                                                            transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                                                        />
                                                    )}
                                                    <span className="relative z-10" style={headingFontStyle}>
                                                        {tab === "employees" ? "Employees" : "Admins"}
                                                    </span>
                                                </TabsTrigger>
                                            )
                                        })}
                                    </TabsList>
                                )}
                            </div>
                        </div>
                        <EmployeeTable
                            employees={employees}
                            onEdit={(emp) => { setEditingEmployee(emp); setEmpDialogOpen(true) }}
                            onDelete={mutateEmp}
                            isAdminPortal={isAdminPortal}
                        />
                        <div className="shrink-0 border-t border-border bg-card">
                            <PaginationFooter
                                page={empPage}
                                totalPages={totalEmpPages}
                                onPageChange={(p) => {
                                    const params = new URLSearchParams(searchParams.toString())
                                    params.set("empPage", p.toString())
                                    router.push(`${pathname}?${params.toString()}`, { scroll: false })
                                }}
                                totalItems={finalTotalEmployees}
                            />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="admins" className="m-0 flex min-h-0 flex-1 flex-col">
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                        <div className="shrink-0 border-b border-border bg-slate-50/80 px-4 py-3 sm:px-6 flex items-center justify-between gap-4">
                            <p className="text-sm font-bold text-foreground shrink-0" style={headingFontStyle}>Admins</p>

                            <div className="flex items-center gap-3 flex-1 justify-end max-w-2xl">
                                <div className="w-full max-w-xs">
                                    <SearchInput
                                        placeholder="Search admins..."
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        onClear={() => setSearchInput("")}
                                    />
                                </div>

                                <TabsList className="h-9 rounded-lg border border-border bg-muted/50 p-1">
                                    {["employees", "admins"].map((tab) => {
                                        const isSelected = activeTab === tab
                                        return (
                                            <TabsTrigger
                                                key={tab}
                                                value={tab}
                                                className="relative h-7 rounded-md px-4 text-xs font-semibold text-muted-foreground transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                                            >
                                                {isSelected && (
                                                    <motion.div
                                                        layoutId="activeTabHeaderAdmins"
                                                        className="absolute inset-0 rounded-md border border-border bg-background"
                                                        transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                                                    />
                                                )}
                                                <span className="relative z-10" style={headingFontStyle}>
                                                    {tab === "employees" ? "Employees" : "Admins"}
                                                </span>
                                            </TabsTrigger>
                                        )
                                    })}
                                </TabsList>
                            </div>
                        </div>
                        <AdminUserTable
                            users={users}
                            onEdit={(u) => { setEditingUser(u); setUserDialogOpen(true) }}
                            onDelete={mutateUser}
                        />
                        <div className="shrink-0 border-t border-border bg-card">
                            <PaginationFooter
                                page={adminPage}
                                totalPages={totalAdminPages}
                                onPageChange={(p) => {
                                    const params = new URLSearchParams(searchParams.toString())
                                    params.set("adminPage", p.toString())
                                    router.push(`${pathname}?${params.toString()}`, { scroll: false })
                                }}
                                totalItems={finalTotalUsers}
                            />
                        </div>
                    </div>
                </TabsContent>
            </div>
        </Tabs>
    )
}

function EmployeeTable({ employees, onEdit, onDelete, isAdminPortal }: { employees: Employee[], onEdit: (_employee: Employee) => void, onDelete: () => void, isAdminPortal?: boolean }) {
    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-border bg-slate-50/80">
                <table className="w-full min-w-190 text-sm table-fixed">
                    <thead>
                        <tr>
                            <th className="w-[22%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                            <th className="w-[14%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Code</th>
                            <th className="w-[22%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</th>
                            <th className="w-[10%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Pref</th>
                            {!isAdminPortal && <th className="w-[20%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Company</th>}
                            <th className="w-[17%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Password</th>
                            <th className="w-[9%] px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
                        </tr>
                    </thead>
                </table>
            </div>
            <div className="flex-1 overflow-auto">
                <table className="w-full min-w-190 text-sm table-fixed">
                    <tbody className="divide-y divide-border">
                        {employees.length === 0 ? (
                            <tr><td colSpan={isAdminPortal ? 6 : 7} className="px-4 py-16 text-center text-sm text-muted-foreground">{isAdminPortal ? "No employees found." : "No employees found matching your search."}</td></tr>
                        ) : (
                            employees.map((emp) => (
                                <tr key={emp.id} className="transition-colors hover:bg-muted/30">
                                    <td className="w-[22%] px-4 py-3">
                                        <p className="truncate font-medium text-foreground">{emp.name}</p>
                                    </td>
                                    <td className="w-[14%] px-4 py-3 text-sm text-muted-foreground">
                                        <p className="truncate font-medium text-foreground/90">{emp.employeeCode}</p>
                                    </td>
                                    <td className="w-[22%] px-4 py-3 text-muted-foreground">
                                        <p className="truncate">{emp.email || "-"}</p>
                                    </td>
                                    <td className="w-[10%] px-4 py-3">
                                        <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                            <span className={cn("h-2.5 w-2.5 rounded-full", emp.defaultPreference === "VEG" ? "bg-veg" : "bg-nonveg")} />
                                            <span className="text-[13px]">{emp.defaultPreference === "VEG" ? "Veg" : "Non-Veg"}</span>
                                        </div>
                                    </td>
                                    {!isAdminPortal && (
                                        <td className="w-[20%] px-4 py-3 text-muted-foreground">
                                            <p className="truncate">{emp.companyName} - {emp.addressCity}</p>
                                        </td>
                                    )}
                                    <td className="w-[17%] px-4 py-3">
                                        <PasswordCell password={emp.password} />
                                    </td>
                                    <td className="w-[9%] px-4 py-3 text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => onEdit(emp)}>
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <DeleteButton id={emp.id} endpoint="/api/ops/employees" onDelete={onDelete} />
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function AdminUserTable({ users, onEdit, onDelete }: { users: User[], onEdit: (_user: User) => void, onDelete: () => void }) {
    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-border bg-slate-50/80">
                <table className="w-full min-w-190 text-sm table-fixed">
                    <thead>
                        <tr>
                            <th className="w-[24%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                            <th className="w-[28%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</th>
                            <th className="w-[14%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Role</th>
                            <th className="w-[24%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Company</th>
                            <th className="w-[20%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Password</th>
                            <th className="w-[10%] px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
                        </tr>
                    </thead>
                </table>
            </div>
            <div className="flex-1 overflow-auto">
                <table className="w-full min-w-190 text-sm table-fixed">
                    <tbody className="divide-y divide-border">
                        {users.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-16 text-center text-sm text-muted-foreground">No admin users found matching your search.</td></tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user.id} className="transition-colors hover:bg-muted/30">
                                    <td className="w-[24%] px-4 py-3">
                                        <p className="truncate font-medium text-foreground">{user.name}</p>
                                    </td>
                                    <td className="w-[28%] px-4 py-3 text-muted-foreground">
                                        <p className="truncate">{user.email}</p>
                                    </td>
                                    <td className="w-[14%] px-4 py-3">
                                        <p className="truncate text-sm text-foreground">{user.role === "SUPERADMIN" ? "Super Admin" : "Company Admin"}</p>
                                    </td>
                                    <td className="w-[24%] px-4 py-3 text-muted-foreground">
                                        <p className="truncate">{user.companyName ?? "All companies"}</p>
                                    </td>
                                    <td className="w-[20%] px-4 py-3">
                                        <PasswordCell password={user.password} />
                                    </td>
                                    <td className="w-[10%] px-4 py-3 text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => onEdit(user)}>
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <DeleteButton id={user.id} endpoint="/api/ops/users" onDelete={onDelete} />
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function DeleteButton({ id, endpoint, onDelete }: { id: string; endpoint: string; onDelete: () => void }) {
    const [deleting, setDeleting] = useState(false)
    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this record? This action cannot be undone.")) return
        setDeleting(true)
        try {
            const res = await fetch(`${endpoint}?id=${id}`, { method: "DELETE" })
            if (res.ok) {
                toast.success("Record deleted successfully")
                onDelete()
            } else {
                const data = await res.json()
                toast.error(data.error || "Failed to delete record")
            }
        } catch {
            toast.error("Network error. Please try again.")
        } finally {
            setDeleting(false)
        }
    }
    return (
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" disabled={deleting} onClick={handleDelete}>
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
    )
}

function PasswordCell({ password }: { password?: string | null }) {
    const [revealed, setRevealed] = useState(false)
    if (!password) return <span className="text-muted-foreground text-xs italic">N/A</span>
    return (
        <div className="flex items-center gap-1.5">
            <span className="truncate font-mono text-[13px] tracking-tight">{revealed ? password : "••••••••"}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground" onClick={() => setRevealed(!revealed)}>
                {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
        </div>
    )
}

function EmployeeForm({ employee, defaultAddressId, onSuccess, isAdminPortal }: { employee: Employee | null; defaultAddressId?: string; onSuccess: () => void, isAdminPortal?: boolean }) {
    const { data } = useSWR<{ companies: Company[] }>("/api/ops/companies", fetcher)
    const companies = data?.companies ?? []

    const [form, setForm] = useState({
        name: employee?.name ?? "",
        employeeCode: employee?.employeeCode ?? "",
        email: employee?.email ?? "",
        password: "",
        preference: employee?.defaultPreference ?? "VEG",
        companyId: employee?.companyId ?? "",
        addressId: employee?.addressId ?? defaultAddressId ?? ""
    })

    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        if (!employee && !form.companyId && defaultAddressId && companies.length > 0) {
            const company = companies.find(c => c.addresses.some(a => a.id === defaultAddressId))
            if (company) setForm(prev => ({ ...prev, companyId: company.id }))
        }
    }, [defaultAddressId, companies, employee, form.companyId])

    const selectedCompany = useMemo(() => companies.find(c => c.id === form.companyId), [form.companyId, companies])
    const addresses = selectedCompany?.addresses ?? []

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        setError("")

        try {
            const body = {
                ...form,
                id: employee?.id,
                defaultPreference: form.preference,
                password: form.password || undefined
            }
            const res = await fetch("/api/ops/employees", {
                method: employee ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            })
            if (res.ok) {
                toast.success(employee ? "Employee updated" : "Employee created")
                onSuccess()
            } else {
                const data = await res.json()
                setError(data.error || "Failed to save employee information")
            }
        } catch {
            setError("Network error. Please check your connection.")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-2" autoComplete="off">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label>Full Name</Label>
                    <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. John Doe" autoComplete="off" />
                </div>
                <div className="space-y-1.5">
                    <Label>Employee ID</Label>
                    <Input value={form.employeeCode} onChange={e => setForm({ ...form, employeeCode: e.target.value })} required disabled={!!employee} placeholder="e.g. EMP001" autoComplete="off" />
                </div>
            </div>
            <div className="space-y-1.5">
                <Label>Email Address</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@company.com" autoComplete="off" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label>{employee ? "Change Password" : "Password"}</Label>
                    <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={employee ? "Leave blank to keep" : "Optional"} autoComplete="new-password" />
                </div>
                <div className="space-y-1.5">
                    <Label>Preference</Label>
                    <Select value={form.preference} onValueChange={v => setForm({ ...form, preference: v as MealPreference })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="VEG">Vegetarian</SelectItem>
                            <SelectItem value="NONVEG">Non-Vegetarian</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                {!isAdminPortal && (
                    <div className="space-y-1.5">
                        <Label>Company</Label>
                        <Select value={form.companyId} onValueChange={v => setForm({ ...form, companyId: v, addressId: "" })} disabled={!!employee}>
                            <SelectTrigger><SelectValue placeholder="Select Company" /></SelectTrigger>
                            <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                )}
                <div className={cn("space-y-1.5", isAdminPortal ? "col-span-2" : "")}>
                    <Label>Location</Label>
                    <Select value={form.addressId} onValueChange={v => setForm({ ...form, addressId: v })} disabled={(!isAdminPortal && !form.companyId) || !!employee}>
                        <SelectTrigger><SelectValue placeholder="Select Location" /></SelectTrigger>
                        <SelectContent>{addresses.map(a => <SelectItem key={a.id} value={a.id}>{a.city}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>
            {error && (
                <div className="flex items-center gap-2 p-3 text-xs font-medium text-destructive bg-destructive/10 rounded-md">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {employee ? "Update Employee" : "Create Employee"}
                </Button>
            </div>
        </form>
    )
}

function AdminUserForm({ user, onSuccess }: { user: User | null; onSuccess: () => void }) {
    const { data } = useSWR<{ companies: Company[] }>("/api/ops/companies", fetcher)
    const companies = data?.companies ?? []
    const [form, setForm] = useState({
        name: user?.name ?? "",
        email: user?.email ?? "",
        role: user?.role ?? "ADMIN",
        companyId: user?.companyId ?? "",
        password: ""
    })
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        if (form.role === "SUPERADMIN" && form.companyId) {
            setForm((prev) => ({ ...prev, companyId: "" }))
        }
    }, [form.role, form.companyId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        setError("")
        try {
            const body = {
                ...form,
                id: user?.id,
                companyId: form.role === "ADMIN" ? form.companyId : undefined,
                password: form.password || undefined
            }
            const res = await fetch("/api/ops/users", {
                method: user ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            })
            if (res.ok) {
                toast.success(user ? "User updated" : "User created")
                onSuccess()
            } else {
                const data = await res.json()
                setError(data.error || "Failed to save user")
            }
        } catch {
            setError("Network error")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-2" autoComplete="off">
            <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Admin User" autoComplete="off" />
            </div>
            <div className="space-y-1.5">
                <Label>Email Address</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required placeholder="admin@folksmeal.com" autoComplete="off" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label>Role</Label>
                    <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value as "SUPERADMIN" | "ADMIN" })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="SUPERADMIN">Super Admin</SelectItem>
                            <SelectItem value="ADMIN">Company Admin</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label>Company</Label>
                    <Select
                        value={form.companyId}
                        onValueChange={(value) => setForm({ ...form, companyId: value })}
                        disabled={form.role !== "ADMIN"}
                    >
                        <SelectTrigger><SelectValue placeholder={form.role === "ADMIN" ? "Select Company" : "Not required"} /></SelectTrigger>
                        <SelectContent>
                            {companies.map((company) => (
                                <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="space-y-1.5">
                <Label>{user ? "Change Password" : "Password"}</Label>
                <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={user ? "Leave blank to keep" : "Optional"} autoComplete="new-password" />
            </div>
            {error && (
                <div className="flex items-center gap-2 p-3 text-xs font-medium text-destructive bg-destructive/10 rounded-md">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {user ? "Update User" : "Create User"}
                </Button>
            </div>
        </form>
    )
}

function BulkUploadForm({ defaultAddressId, onSuccess, isAdminPortal }: { defaultAddressId?: string; onSuccess: () => void; isAdminPortal?: boolean }) {
    const { data } = useSWR<{ companies: Company[] }>("/api/ops/companies", fetcher)
    const companies = data?.companies ?? []

    const [file, setFile] = useState<File | null>(null)
    const [companyId, setCompanyId] = useState("")
    const [addressId, setAddressId] = useState(defaultAddressId ?? "")
    const [submitting, setSubmitting] = useState(false)
    const [result, setResult] = useState<{ summary: { total: number; created: number; skipped: number; failed: number }; errors: string[] } | null>(null)
    const [error, setError] = useState("")

    useEffect(() => {
        if (!companyId && defaultAddressId) {
            const company = companies.find(c => c.addresses.some(a => a.id === defaultAddressId))
            if (company) setCompanyId(company.id)
        }
    }, [defaultAddressId, companies, companyId])

    const addresses = useMemo(() => companies.find(c => c.id === companyId)?.addresses ?? [], [companyId, companies])

    const handleDownloadTemplate = useCallback(async () => {
        try {
            const workbook = new ExcelJS.Workbook()
            const worksheet = workbook.addWorksheet("Template")
            worksheet.addRow(["Employee Code", "Full Name", "Email", "Meal Preference (VEG/NONVEG)"])
            worksheet.addRow(["EMP001", "John Doe", "john@example.com", "VEG"])
            worksheet.getRow(1).font = { bold: true }
            const buffer = await workbook.xlsx.writeBuffer()
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = "folksmeal_upload_template.xlsx"
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
        } catch {
            toast.error("Failed to generate template")
        }
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file || !companyId || !addressId) return
        setSubmitting(true)
        setError("")
        setResult(null)
        const fd = new FormData()
        fd.append("file", file)
        fd.append("companyId", companyId)
        fd.append("addressId", addressId)
        try {
            const res = await fetch("/api/ops/employees/bulk", { method: "POST", body: fd })
            const data = await res.json()
            if (res.ok) {
                setResult(data)
                toast.success(`Successfully processed ${data.summary.total} records`)
                onSuccess()
            }
            else setError(data.error || "Upload failed")
        } catch { setError("Network error") } finally { setSubmitting(false) }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
                <Label>Excel File (.xlsx)</Label>
                <div className="flex gap-2">
                    <Input type="file" accept=".xlsx" className="cursor-pointer" onChange={e => setFile(e.target.files?.[0] || null)} required />
                    <Button type="button" variant="outline" size="icon" onClick={handleDownloadTemplate} title="Download Template">
                        <Download className="h-4 w-4" />
                    </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">Follow the template format: Code, Name, Email, Preference.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
                {!isAdminPortal && (
                    <div className="space-y-1.5">
                        <Label>Target Company</Label>
                        <Select value={companyId} onValueChange={setCompanyId}>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                )}
                <div className={cn("space-y-1.5", isAdminPortal ? "col-span-2" : "")}>
                    <Label>Location</Label>
                    <Select value={addressId} onValueChange={setAddressId} disabled={(!isAdminPortal && !companyId)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{addresses.map(a => <SelectItem key={a.id} value={a.id}>{a.city}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>
            <AnimatePresence>
                {error && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        <div className="flex items-center gap-2 p-3 text-xs font-medium text-destructive bg-destructive/10 rounded-md">
                            <AlertCircle className="h-4 w-4" />{error}
                        </div>
                    </motion.div>
                )}
                {result && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                        <div className="p-4 rounded-lg bg-slate-50 border border-border space-y-3">
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="p-2 rounded bg-background border border-border">
                                    <div className="text-xs text-muted-foreground">Processed</div>
                                    <div className="text-lg font-bold">{result.summary.total}</div>
                                </div>
                                <div className="p-2 rounded bg-green-50 border border-green-100">
                                    <div className="text-xs text-green-600">Created</div>
                                    <div className="text-lg font-bold text-green-700">{result.summary.created}</div>
                                </div>
                                <div className="p-2 rounded bg-amber-50 border border-amber-100">
                                    <div className="text-xs text-amber-600">Skipped</div>
                                    <div className="text-lg font-bold text-amber-700">{result.summary.skipped}</div>
                                </div>
                            </div>
                            {result.errors.length > 0 && (
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Errors & Warnings</Label>
                                    <div className="max-h-32 overflow-auto text-[11px] p-2 bg-background border rounded divide-y divide-border">
                                        {result.errors.map((errorText: string, i: number) => <p key={i} className="py-1 text-destructive flex items-center gap-1.5"><X className="h-3 w-3" /> {errorText}</p>)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="flex justify-end gap-2 pt-2">
                <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                {!result && (
                    <Button type="submit" disabled={submitting || !file}>
                        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                        Start Upload
                    </Button>
                )}
            </div>
        </form>
    )
}

function ExportButton({ effectiveAddressId }: { effectiveAddressId?: string }) {
    const [exporting, setExporting] = useState(false)
    const handleExport = useCallback(async () => {
        setExporting(true)
        try {
            const res = await fetch(`/api/ops/employees/export${effectiveAddressId ? `?addressId=${effectiveAddressId}` : ""}`)
            if (!res.ok) throw new Error("Export failed")
            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            const istDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            a.download = `employee_credentials_${istDate}.xlsx`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
            toast.success("Credentials exported successfully")
        } catch {
            toast.error("Failed to export credentials")
        } finally {
            setExporting(false)
        }
    }, [effectiveAddressId])

    return (
        <Button variant="outline" className="h-10 rounded-xl px-4" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export Credentials
        </Button>
    )
}
