"use client"
import { useState, useEffect, useMemo } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Pencil, Trash2, Loader2, Search } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PaginationFooter } from "@/components/ops/pagination-footer"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface Employee {
    id: string
    name: string
    employeeCode: string
    defaultPreference: string
    companyId: string
    addressId: string
    companyName: string
    addressCity: string
    createdAt: string
}

interface User {
    id: string
    name: string
    email: string
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

import { fetcher } from "@/lib/fetcher"

export function UserManagement({
    effectiveAddressId,
    initialEmployees,
    totalEmployees,
    initialUsers,
    totalUsers
}: {
    effectiveAddressId?: string
    initialEmployees: Employee[]
    totalEmployees: number
    initialUsers: User[]
    totalUsers: number
}) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const search = searchParams.get("search") || ""
    const tabParam = searchParams.get("tab") || "employees"
    const empPage = Math.max(1, parseInt(searchParams.get("empPage") || "1"))
    const adminPage = Math.max(1, parseInt(searchParams.get("adminPage") || "1"))

    const empQuery = new URLSearchParams()
    if (search) empQuery.set("search", search)
    empQuery.set("page", empPage.toString())
    empQuery.set("limit", "15")

    const adminQuery = new URLSearchParams()
    if (search) adminQuery.set("search", search)
    adminQuery.set("page", adminPage.toString())
    adminQuery.set("limit", "15")

    const { data: empData, mutate: mutateEmp } = useSWR<{ employees: Employee[], pagination?: { total: number } }>(
        `/api/ops/employees?${empQuery.toString()}`,
        fetcher,
        { fallbackData: { employees: initialEmployees, pagination: { total: totalEmployees } } }
    )
    const { data: userData, mutate: mutateUser } = useSWR<{ users: User[], pagination?: { total: number } }>(
        `/api/ops/users?${adminQuery.toString()}`,
        fetcher,
        { fallbackData: { users: initialUsers, pagination: { total: totalUsers } } }
    )

    const employees = empData?.employees ?? initialEmployees
    const users = userData?.users ?? initialUsers
    const finalTotalEmployees = empData?.pagination?.total ?? totalEmployees
    const finalTotalUsers = userData?.pagination?.total ?? totalUsers

    const [searchInput, setSearchInput] = useState(search)
    const [empDialogOpen, setEmpDialogOpen] = useState(false)
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
    const [userDialogOpen, setUserDialogOpen] = useState(false)

    // Debounce pushing search to URL
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

    const handleTabChange = (val: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set("tab", val)
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }

    const handleEmpPageChange = (page: number) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set("empPage", page.toString())
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }

    const handleAdminPageChange = (page: number) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set("adminPage", page.toString())
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }

    const itemsPerPage = 15
    const totalEmpPages = Math.ceil(finalTotalEmployees / itemsPerPage)
    const totalAdminPages = Math.ceil(finalTotalUsers / itemsPerPage)

    return (
        <div className="flex flex-col flex-1 gap-6 min-h-0">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
                <h1 className="text-lg font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                    User Management
                </h1>
                <div className="flex gap-2">
                    <Dialog open={empDialogOpen} onOpenChange={(open) => { setEmpDialogOpen(open); if (!open) setEditingEmployee(null) }}>
                        <DialogTrigger asChild>
                            <Button variant="outline"><Plus className="h-3.5 w-3.5 mr-2" /> Add Employee</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>{editingEmployee ? "Edit Employee" : "Add Employee"}</DialogTitle>
                            </DialogHeader>
                            <EmployeeForm
                                employee={editingEmployee}
                                defaultAddressId={effectiveAddressId}
                                onSuccess={() => { setEmpDialogOpen(false); setEditingEmployee(null); mutateEmp() }}
                            />
                        </DialogContent>
                    </Dialog>

                    <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                        <DialogTrigger asChild>
                            <Button><Plus className="h-3.5 w-3.5 mr-2" /> Create User</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Create Admin User</DialogTitle>
                            </DialogHeader>
                            <UserForm onSuccess={() => { setUserDialogOpen(false); mutateUser() }} />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="relative shrink-0">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search by name, ID, or email..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-10"
                />
            </div>

            <Tabs value={tabParam} onValueChange={handleTabChange} className="w-full flex-1 flex flex-col min-h-0">
                <TabsList className="mb-4 shrink-0">
                    <TabsTrigger value="employees">Employees</TabsTrigger>
                    <TabsTrigger value="admins">Admin Users</TabsTrigger>
                </TabsList>

                <TabsContent value="employees" className="flex-1 flex flex-col min-h-0 data-[state=inactive]:hidden data-[state=active]:flex m-0">
                    <div className="rounded-lg border border-border bg-card flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="overflow-auto flex-1">
                            <table className="w-full text-sm relative">
                                <thead className="sticky top-0 bg-muted z-10 shadow-sm">
                                    <tr className="border-b border-border">
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Employee ID</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Preference</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Company & Location</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {employees.length === 0 ? (
                                        <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">No employees found</td></tr>
                                    ) : (
                                        employees.map((emp) => (
                                            <tr key={emp.id} className="transition-colors hover:bg-muted/30">
                                                <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{emp.name}</td>
                                                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{emp.employeeCode}</td>
                                                <td className="whitespace-nowrap px-4 py-3">
                                                    <div className="inline-flex items-center gap-2">
                                                        <span className={cn("inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-2", emp.defaultPreference === "VEG" ? "border-veg" : "border-nonveg")}>
                                                            <span className={cn("block h-2 w-2 rounded-full", emp.defaultPreference === "VEG" ? "bg-veg" : "bg-nonveg")} />
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">{emp.defaultPreference === "VEG" ? "Veg" : "Non-Veg"}</span>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{emp.companyName} - {emp.addressCity}</td>
                                                <td className="whitespace-nowrap px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button variant="ghost" size="sm" onClick={() => { setEditingEmployee(emp); setEmpDialogOpen(true) }}>
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <DeleteButton id={emp.id} endpoint="/api/ops/employees" onDelete={() => mutateEmp()} />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <PaginationFooter
                            page={empPage}
                            totalPages={totalEmpPages}
                            onPageChange={handleEmpPageChange}
                            totalItems={finalTotalEmployees}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="admins" className="flex-1 flex flex-col min-h-0 data-[state=inactive]:hidden data-[state=active]:flex m-0">
                    <div className="rounded-lg border border-border bg-card flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="overflow-auto flex-1">
                            <table className="w-full text-sm relative">
                                <thead className="sticky top-0 bg-muted z-10 shadow-sm">
                                    <tr className="border-b border-border">
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {users.length === 0 ? (
                                        <tr><td colSpan={3} className="px-4 py-12 text-center text-sm text-muted-foreground">No admin users found</td></tr>
                                    ) : (
                                        users.map((user) => (
                                            <tr key={user.id} className="transition-colors hover:bg-muted/30">
                                                <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{user.name}</td>
                                                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{user.email}</td>
                                                <td className="whitespace-nowrap px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <DeleteButton id={user.id} endpoint="/api/ops/users" onDelete={() => mutateUser()} />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <PaginationFooter
                            page={adminPage}
                            totalPages={totalAdminPages}
                            onPageChange={handleAdminPageChange}
                            totalItems={finalTotalUsers}
                        />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}

function DeleteButton({ id, endpoint, onDelete }: { id: string; endpoint: string; onDelete: () => void }) {
    const [deleting, setDeleting] = useState(false)
    return (
        <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={deleting}
            onClick={async () => {
                if (!confirm("Are you sure you want to delete this record?")) return
                setDeleting(true)
                try {
                    const res = await fetch(`${endpoint}?id=${id}`, { method: "DELETE" })
                    if (!res.ok) {
                        const data = await res.json()
                        alert(data.error || "Failed to delete")
                    } else {
                        onDelete()
                    }
                } catch {
                    alert("Network error")
                }
                setDeleting(false)
            }}
        >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
    )
}

// ----------------------------------------------------
// Employee Form
// ----------------------------------------------------
function EmployeeForm({ employee, defaultAddressId, onSuccess }: { employee: Employee | null; defaultAddressId?: string; onSuccess: () => void }) {
    const { data: companyData } = useSWR<{ companies: Company[] }>("/api/ops/companies", fetcher)
    const companies = companyData?.companies ?? []

    // Attempt to map the requested defaultAddressId to its parent companyId
    const defaultCompanyId = useMemo(() => {
        if (!defaultAddressId) return ""
        for (const company of companies) {
            if (company.addresses.some(a => a.id === defaultAddressId)) {
                return company.id
            }
        }
        return ""
    }, [defaultAddressId, companies])

    const [name, setName] = useState(employee?.name ?? "")
    const [employeeCode, setEmployeeCode] = useState(employee?.employeeCode ?? "")
    const [password, setPassword] = useState("")
    const [preference, setPreference] = useState(employee?.defaultPreference ?? "VEG")

    // Use employee's existing IDs, OR the active effectiveAddressId defaults, OR empty string as a last resort
    const [companyId, setCompanyId] = useState(employee?.companyId ?? defaultCompanyId)
    const [addressId, setAddressId] = useState(employee?.addressId ?? defaultAddressId ?? "")

    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")

    const selectedCompany = useMemo(() => companies.find(c => c.id === companyId), [companyId, companies])
    const addresses = selectedCompany?.addresses ?? []

    // Maintain companyId fallback sync as data loads in async
    useEffect(() => {
        if (!employee && !companyId && defaultCompanyId) {
            setCompanyId(defaultCompanyId)
        }
    }, [defaultCompanyId, companyId, employee])

    // Maintain addressId fallback sync as data loads in async
    useEffect(() => {
        if (!employee && !addressId && defaultAddressId && addresses.some(a => a.id === defaultAddressId)) {
            setAddressId(defaultAddressId)
        }
    }, [defaultAddressId, addressId, employee, addresses])

    // Reset address if company strictly changes to something else entirely
    useEffect(() => {
        if (!employee && companyId && addresses.length > 0 && !addresses.find(a => a.id === addressId)) {
            setAddressId(addresses[0].id)
        }
    }, [companyId, addresses, addressId, employee])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        setError("")

        if (!companyId || !addressId) {
            setError("Company and Location are required.")
            setSubmitting(false)
            return
        }

        const body: Record<string, unknown> = { name, employeeCode, defaultPreference: preference, companyId, addressId }
        if (password) body.password = password
        if (employee) body.id = employee.id

        const res = await fetch("/api/ops/employees", {
            method: employee ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(employee ? body : { ...body, password: password || undefined }),
        })

        if (res.ok) {
            onSuccess()
        } else {
            const data = await res.json()
            setError(data.error || "Something went wrong")
        }
        setSubmitting(false)
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <Label>Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="flex flex-col gap-2">
                    <Label>Employee ID</Label>
                    <Input value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} required disabled={!!employee} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <Label>{employee ? "New Password" : "Password"}</Label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!employee} minLength={6} placeholder={employee ? "Leave blank to keep" : ""} />
                </div>
                <div className="flex flex-col gap-2">
                    <Label>Preference</Label>
                    <Select value={preference} onValueChange={setPreference}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="VEG">Veg</SelectItem>
                            <SelectItem value="NONVEG">Non-Veg</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <Label>Company</Label>
                    <Select value={companyId} onValueChange={setCompanyId} disabled={!!employee}>
                        <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                        <SelectContent>
                            {companies.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex flex-col gap-2">
                    <Label>Location</Label>
                    <Select value={addressId} onValueChange={setAddressId} disabled={!companyId || !!employee}>
                        <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                        <SelectContent>
                            {addresses.map(a => (
                                <SelectItem key={a.id} value={a.id}>{a.city}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2 justify-end">
                <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {employee ? "Update" : "Create"}
                </Button>
            </div>
        </form>
    )
}

// ----------------------------------------------------
// Admin User Form
// ----------------------------------------------------
function UserForm({ onSuccess }: { onSuccess: () => void }) {
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        setError("")

        const res = await fetch("/api/ops/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
        })

        if (res.ok) {
            onSuccess()
        } else {
            const data = await res.json()
            setError(data.error || "Something went wrong")
        }
        setSubmitting(false)
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-2">
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2 justify-end">
                <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Create
                </Button>
            </div>
        </form>
    )
}
