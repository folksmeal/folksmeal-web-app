"use client"
import { useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, Loader2, Building2, MapPin } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface Address {
    id: string
    city: string
    state: string | null
    address: string | null
    cutoffTime: string
    timezone: string
    workingDays: number[]
}

interface Company {
    id: string
    name: string
    domain: string | null
    employeeCount: number
    addresses: Address[]
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function CompanyManagement() {
    const { data, mutate, isLoading } = useSWR("/api/ops/companies", fetcher)
    const companies: Company[] = data?.companies ?? []
    const [companyDialogOpen, setCompanyDialogOpen] = useState(false)
    const [editingCompany, setEditingCompany] = useState<Company | null>(null)
    const [addressDialogOpen, setAddressDialogOpen] = useState(false)
    const [editingAddress, setEditingAddress] = useState<{ address: Address; companyId: string } | null>(null)
    const [addAddressCompanyId, setAddAddressCompanyId] = useState<string | null>(null)

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-lg font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                    Company Management
                </h1>
                <Dialog open={companyDialogOpen} onOpenChange={(open) => { setCompanyDialogOpen(open); if (!open) setEditingCompany(null) }}>
                    <DialogTrigger asChild>
                        <Button><Plus className="h-3.5 w-3.5" /> Add Company</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>{editingCompany ? "Edit Company" : "Add Company"}</DialogTitle>
                        </DialogHeader>
                        <CompanyForm company={editingCompany} onSuccess={() => { setCompanyDialogOpen(false); setEditingCompany(null); mutate() }} />
                    </DialogContent>
                </Dialog>
            </div>

            <Dialog open={addressDialogOpen} onOpenChange={(open) => { setAddressDialogOpen(open); if (!open) { setEditingAddress(null); setAddAddressCompanyId(null) } }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingAddress ? "Edit Address" : "Add Address"}</DialogTitle>
                    </DialogHeader>
                    <AddressForm
                        address={editingAddress?.address ?? null}
                        companyId={editingAddress?.companyId ?? addAddressCompanyId ?? ""}
                        onSuccess={() => { setAddressDialogOpen(false); setEditingAddress(null); setAddAddressCompanyId(null); mutate() }}
                    />
                </DialogContent>
            </Dialog>

            {isLoading ? (
                <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
                </div>
            ) : companies.length === 0 ? (
                <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
                    No companies found
                </div>
            ) : (
                <div className="space-y-4">
                    {companies.map((company) => (
                        <div key={company.id} className="rounded-lg border border-border bg-card">
                            <div className="flex items-center justify-between border-b border-border px-5 py-4">
                                <div className="flex items-center gap-3">
                                    <Building2 className="h-5 w-5 text-primary" />
                                    <div>
                                        <p className="font-semibold text-foreground">{company.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {company.employeeCount} employees · {company.addresses.length} location{company.addresses.length !== 1 ? "s" : ""}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => { setEditingCompany(company); setCompanyDialogOpen(true) }}>
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <DeleteCompanyButton id={company.id} onDelete={() => mutate()} />
                                </div>
                            </div>
                            <div className="divide-y divide-border">
                                {company.addresses.map((addr) => (
                                    <div key={addr.id} className="flex items-center justify-between px-5 py-3">
                                        <div className="flex items-center gap-3">
                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{addr.city}{addr.state ? `, ${addr.state}` : ""}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Cutoff: {addr.cutoffTime} · {addr.timezone} · Days: {addr.workingDays.map((d) => dayLabels[d]).join(", ")}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => { setEditingAddress({ address: addr, companyId: company.id }); setAddressDialogOpen(true) }}>
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <DeleteAddressButton id={addr.id} onDelete={() => mutate()} />
                                        </div>
                                    </div>
                                ))}
                                <div className="px-5 py-3">
                                    <Button variant="ghost" size="sm" className="text-primary" onClick={() => { setAddAddressCompanyId(company.id); setAddressDialogOpen(true) }}>
                                        <Plus className="h-3.5 w-3.5" /> Add Location
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function DeleteCompanyButton({ id, onDelete }: { id: string; onDelete: () => void }) {
    const [loading, setLoading] = useState(false)
    return (
        <Button variant="ghost" size="sm" className="text-destructive" disabled={loading}
            onClick={async () => {
                if (!confirm("Delete this company and all associated data?")) return
                setLoading(true)
                await fetch(`/api/ops/companies?id=${id}`, { method: "DELETE" })
                onDelete()
                setLoading(false)
            }}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
    )
}

function DeleteAddressButton({ id, onDelete }: { id: string; onDelete: () => void }) {
    const [loading, setLoading] = useState(false)
    return (
        <Button variant="ghost" size="sm" className="text-destructive" disabled={loading}
            onClick={async () => {
                if (!confirm("Delete this location?")) return
                setLoading(true)
                await fetch(`/api/ops/companies?id=${id}&type=address`, { method: "DELETE" })
                onDelete()
                setLoading(false)
            }}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
    )
}

function CompanyForm({ company, onSuccess }: { company: Company | null; onSuccess: () => void }) {
    const [name, setName] = useState(company?.name ?? "")
    const [domain, setDomain] = useState(company?.domain ?? "")
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        setError("")
        const body: Record<string, unknown> = { name, domain: domain || undefined }
        if (company) body.id = company.id
        const res = await fetch("/api/ops/companies", { method: company ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        if (res.ok) onSuccess()
        else { const d = await res.json(); setError(d.error || "Failed") }
        setSubmitting(false)
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2"><Label>Company Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
            <div className="flex flex-col gap-2"><Label>Domain (optional)</Label><Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" /></div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2 justify-end">
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit" disabled={submitting}>{submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{company ? "Update" : "Create"}</Button>
            </div>
        </form>
    )
}

function AddressForm({ address, companyId, onSuccess }: { address: Address | null; companyId: string; onSuccess: () => void }) {
    const [city, setCity] = useState(address?.city ?? "")
    const [state, setState] = useState(address?.state ?? "")
    const [fullAddress, setFullAddress] = useState(address?.address ?? "")
    const [cutoffTime, setCutoffTime] = useState(address?.cutoffTime ?? "18:00")
    const [timezone, setTimezone] = useState(address?.timezone ?? "Asia/Kolkata")
    const [workingDays, setWorkingDays] = useState<number[]>(address?.workingDays ?? [1, 2, 3, 4, 5])
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")

    const toggleDay = (day: number) => {
        setWorkingDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort())
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        setError("")
        const body: Record<string, unknown> = {
            type: "address",
            city,
            state: state || undefined,
            address: fullAddress || undefined,
            cutoffTime,
            timezone,
            workingDays,
        }
        if (address) body.id = address.id
        else body.companyId = companyId
        const res = await fetch("/api/ops/companies", { method: address ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        if (res.ok) onSuccess()
        else { const d = await res.json(); setError(d.error || "Failed") }
        setSubmitting(false)
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2"><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} required /></div>
                <div className="flex flex-col gap-2"><Label>State</Label><Input value={state} onChange={(e) => setState(e.target.value)} /></div>
            </div>
            <div className="flex flex-col gap-2"><Label>Full Address</Label><Input value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2"><Label>Cutoff Time</Label><Input type="time" value={cutoffTime} onChange={(e) => setCutoffTime(e.target.value)} /></div>
                <div className="flex flex-col gap-2"><Label>Timezone</Label><Input value={timezone} onChange={(e) => setTimezone(e.target.value)} /></div>
            </div>
            <div className="flex flex-col gap-2">
                <Label>Working Days</Label>
                <div className="flex gap-1">
                    {dayLabels.map((label, i) => (
                        <button key={i} type="button" onClick={() => toggleDay(i)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${workingDays.includes(i) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2 justify-end">
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit" disabled={submitting}>{submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{address ? "Update" : "Create"}</Button>
            </div>
        </form>
    )
}
