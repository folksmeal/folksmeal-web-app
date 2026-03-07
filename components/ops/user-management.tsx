"use client"
import { useState, useEffect, useMemo } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Pencil, Trash2, Loader2, Search } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

export function UserManagement() {
    const { data: empData, mutate: mutateEmp, isLoading: loadingEmp } = useSWR<{ employees: Employee[] }>("/api/ops/employees", fetcher)
    const { data: userData, mutate: mutateUser, isLoading: loadingUser } = useSWR<{ users: User[] }>("/api/ops/users", fetcher)

    const employees = empData?.employees ?? []
    const users = userData?.users ?? []

    const [search, setSearch] = useState("")
    const [empDialogOpen, setEmpDialogOpen] = useState(false)
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
    const [userDialogOpen, setUserDialogOpen] = useState(false)

    const filteredEmp = employees.filter((e) =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.employeeCode.toLowerCase().includes(search.toLowerCase())
    )

    const filteredUsers = users.filter((u) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search by name, ID, or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                />
            </div>

            <Tabs defaultValue="employees" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="employees">Employees</TabsTrigger>
                    <TabsTrigger value="admins">Admin Users</TabsTrigger>
                </TabsList>

                <TabsContent value="employees">
                    <div className="rounded-lg border border-border bg-card">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/50">
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Employee ID</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Preference</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Company & Location</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {loadingEmp ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i}><td className="px-4 py-4" colSpan={5}><Skeleton className="h-4 w-full" /></td></tr>
                                        ))
                                    ) : filteredEmp.length === 0 ? (
                                        <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">No employees found</td></tr>
                                    ) : (
                                        filteredEmp.map((emp) => (
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
                    </div>
                </TabsContent>

                <TabsContent value="admins">
                    <div className="rounded-lg border border-border bg-card">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/50">
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {loadingUser ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i}><td className="px-4 py-4" colSpan={3}><Skeleton className="h-4 w-full" /></td></tr>
                                        ))
                                    ) : filteredUsers.length === 0 ? (
                                        <tr><td colSpan={3} className="px-4 py-12 text-center text-sm text-muted-foreground">No admin users found</td></tr>
                                    ) : (
                                        filteredUsers.map((user) => (
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
                } catch (e) {
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
function EmployeeForm({ employee, onSuccess }: { employee: Employee | null; onSuccess: () => void }) {
    const [name, setName] = useState(employee?.name ?? "")
    const [employeeCode, setEmployeeCode] = useState(employee?.employeeCode ?? "")
    const [password, setPassword] = useState("")
    const [preference, setPreference] = useState(employee?.defaultPreference ?? "VEG")
    const [companyId, setCompanyId] = useState(employee?.companyId ?? "")
    const [addressId, setAddressId] = useState(employee?.addressId ?? "")

    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")

    const { data: companyData } = useSWR<{ companies: Company[] }>("/api/ops/companies", fetcher)
    const companies = companyData?.companies ?? []

    const selectedCompany = useMemo(() => companies.find(c => c.id === companyId), [companyId, companies])
    const addresses = selectedCompany?.addresses ?? []

    // Reset address if company changes
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
