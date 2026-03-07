"use client"
import { useState, useEffect } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Pencil, Trash2, Loader2, Search } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface Employee {
    id: string
    name: string
    employeeCode: string
    defaultPreference: string
    role: string
    companyName: string
    addressCity: string
    createdAt: string
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function UserManagement() {
    const { data, mutate, isLoading } = useSWR("/api/ops/employees", fetcher)
    const employees: Employee[] = data?.employees ?? []
    const [search, setSearch] = useState("")
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)

    const filtered = employees.filter((e) =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.employeeCode.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-lg font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                    User Management
                </h1>
                <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingEmployee(null) }}>
                    <DialogTrigger asChild>
                        <Button><Plus className="h-3.5 w-3.5" /> Add Employee</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>{editingEmployee ? "Edit Employee" : "Add Employee"}</DialogTitle>
                        </DialogHeader>
                        <EmployeeForm
                            employee={editingEmployee}
                            onSuccess={() => { setDialogOpen(false); setEditingEmployee(null); mutate() }}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search by name or ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                />
            </div>

            <div className="rounded-lg border border-border bg-card">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/50">
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Employee ID</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Preference</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Role</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Location</th>
                                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}><td className="px-4 py-4" colSpan={6}><Skeleton className="h-4 w-full" /></td></tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">No employees found</td></tr>
                            ) : (
                                filtered.map((emp) => (
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
                                        <td className="whitespace-nowrap px-4 py-3">
                                            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", emp.role === "SUPERADMIN" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                                                {emp.role === "SUPERADMIN" ? "Admin" : "Employee"}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{emp.companyName} - {emp.addressCity}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => { setEditingEmployee(emp); setDialogOpen(true) }}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <DeleteButton id={emp.id} onDelete={() => mutate()} />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function DeleteButton({ id, onDelete }: { id: string; onDelete: () => void }) {
    const [deleting, setDeleting] = useState(false)
    return (
        <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={deleting}
            onClick={async () => {
                if (!confirm("Are you sure you want to delete this employee?")) return
                setDeleting(true)
                await fetch(`/api/ops/employees?id=${id}`, { method: "DELETE" })
                onDelete()
                setDeleting(false)
            }}
        >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
    )
}

function EmployeeForm({ employee, onSuccess }: { employee: Employee | null; onSuccess: () => void }) {
    const [name, setName] = useState(employee?.name ?? "")
    const [employeeCode, setEmployeeCode] = useState(employee?.employeeCode ?? "")
    const [password, setPassword] = useState("")
    const [preference, setPreference] = useState(employee?.defaultPreference ?? "VEG")
    const [role, setRole] = useState(employee?.role ?? "EMPLOYEE")
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        if (employee) {
            setName(employee.name)
            setEmployeeCode(employee.employeeCode)
            setPreference(employee.defaultPreference)
            setRole(employee.role)
        }
    }, [employee])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        setError("")

        const body: Record<string, unknown> = { name, employeeCode, defaultPreference: preference, role }
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
            <div className="flex flex-col gap-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-2">
                <Label>Employee ID</Label>
                <Input value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} required disabled={!!employee} />
            </div>
            <div className="flex flex-col gap-2">
                <Label>{employee ? "New Password (leave blank to keep)" : "Password"}</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!employee} minLength={6} />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
                <div className="flex flex-col gap-2">
                    <Label>Role</Label>
                    <Select value={role} onValueChange={setRole}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="EMPLOYEE">Employee</SelectItem>
                            <SelectItem value="SUPERADMIN">Admin</SelectItem>
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
