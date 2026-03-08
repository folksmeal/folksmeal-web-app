"use client"
import { useState, useRef, useCallback, useEffect } from "react"
import useSWRInfinite from "swr/infinite"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, Loader2, Building2, MapPin, Search } from "lucide-react"

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
    icon: string | null
    domain: string | null
    employeeCount: number
    addresses: Address[]
}

interface CompaniesResponse {
    companies: Company[]
    pagination: { total: number; page: number; limit: number; totalPages: number }
}

import { fetcher } from "@/lib/fetcher"

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const PAGE_SIZE = 10

export function CompanyManagement({ initialCompanies, totalCompanies }: { initialCompanies: Company[], totalCompanies: number }) {
    const [search, setSearch] = useState("")
    const [debouncedSearch, setDebouncedSearch] = useState("")
    const sentinelRef = useRef<HTMLDivElement>(null)

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300)
        return () => clearTimeout(timer)
    }, [search])

    const getKey = (pageIndex: number, previousPageData: CompaniesResponse | null) => {
        if (previousPageData && previousPageData.companies.length === 0) return null
        const params = new URLSearchParams()
        params.set("page", (pageIndex + 1).toString())
        params.set("limit", PAGE_SIZE.toString())
        if (debouncedSearch) params.set("search", debouncedSearch)
        return `/api/ops/companies?${params.toString()}`
    }

    const { data, size, setSize, mutate, isValidating } = useSWRInfinite<CompaniesResponse>(
        getKey,
        fetcher,
        {
            fallbackData: !debouncedSearch ? [{ companies: initialCompanies, pagination: { total: totalCompanies, page: 1, limit: PAGE_SIZE, totalPages: Math.ceil(totalCompanies / PAGE_SIZE) } }] : undefined,
            revalidateFirstPage: false,
        }
    )

    const companies = data ? data.flatMap(d => d.companies) : initialCompanies
    const totalLoaded = companies.length
    const totalAvailable = data?.[0]?.pagination?.total ?? totalCompanies
    const hasMore = totalLoaded < totalAvailable
    const isLoadingMore = isValidating && data && typeof data[size - 1] === "undefined"

    // IntersectionObserver for infinite scroll
    useEffect(() => {
        const sentinel = sentinelRef.current
        if (!sentinel) return

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isValidating) {
                    setSize(s => s + 1)
                }
            },
            { threshold: 0.1 }
        )
        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [hasMore, isValidating, setSize])

    const [companyDialogOpen, setCompanyDialogOpen] = useState(false)
    const [editingCompany, setEditingCompany] = useState<Company | null>(null)
    const [addressDialogOpen, setAddressDialogOpen] = useState(false)
    const [editingAddress, setEditingAddress] = useState<{ address: Address; companyId: string } | null>(null)
    const [addAddressCompanyId, setAddAddressCompanyId] = useState<string | null>(null)

    const handleMutate = useCallback(() => mutate(), [mutate])

    return (
        <div className="flex flex-col flex-1 gap-4 min-h-0">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
                <h1 className="text-lg font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                    Company Management
                </h1>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search companies..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-9 w-[200px] pl-8 text-sm"
                        />
                    </div>
                    <Dialog open={companyDialogOpen} onOpenChange={(open) => { setCompanyDialogOpen(open); if (!open) setEditingCompany(null) }}>
                        <DialogTrigger asChild>
                            <Button size="sm"><Plus className="h-3.5 w-3.5" /> Add Company</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>{editingCompany ? "Edit Company" : "Add Company"}</DialogTitle>
                            </DialogHeader>
                            <CompanyForm company={editingCompany} onSuccess={() => { setCompanyDialogOpen(false); setEditingCompany(null); handleMutate() }} />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Dialog open={addressDialogOpen} onOpenChange={(open) => { setAddressDialogOpen(open); if (!open) { setEditingAddress(null); setAddAddressCompanyId(null) } }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingAddress ? "Edit Address" : "Add Address"}</DialogTitle>
                    </DialogHeader>
                    <AddressForm
                        address={editingAddress?.address ?? null}
                        companyId={editingAddress?.companyId ?? addAddressCompanyId ?? ""}
                        onSuccess={() => { setAddressDialogOpen(false); setEditingAddress(null); setAddAddressCompanyId(null); handleMutate() }}
                    />
                </DialogContent>
            </Dialog>

            {companies.length === 0 && !isValidating ? (
                <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground flex-1">
                    {debouncedSearch ? `No companies matching "${debouncedSearch}"` : "No companies found"}
                </div>
            ) : (
                <div className="overflow-auto flex-1 flex flex-col gap-4 min-h-0">
                    {companies.map((company) => (
                        <div key={company.id} className="rounded-lg border border-border bg-card overflow-hidden">
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
                                    <DeleteCompanyButton id={company.id} onDelete={handleMutate} />
                                </div>
                            </div>
                            <div className="divide-y divide-border">
                                {company.addresses.map((addr) => (
                                    <div key={addr.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
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
                                            <DeleteAddressButton id={addr.id} onDelete={handleMutate} />
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

                    {/* Infinite scroll sentinel */}
                    <div ref={sentinelRef} className="py-2 text-center shrink-0">
                        {isLoadingMore && (
                            <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                        )}
                    </div>
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
    const [iconPreview, setIconPreview] = useState<string | null>(company?.icon ?? null)
    const [iconFile, setIconFile] = useState<File | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 2 * 1024 * 1024) {
            setError("Image must be under 2MB")
            return
        }
        if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type)) {
            setError("Only PNG, JPEG, WebP, or SVG allowed")
            return
        }
        setError("")
        setIconFile(file)
        setIconPreview(URL.createObjectURL(file))
    }

    const uploadIcon = async (companyId: string) => {
        if (!iconFile) return
        const formData = new FormData()
        formData.append("file", iconFile)
        formData.append("companyId", companyId)
        await fetch("/api/ops/upload-icon", { method: "POST", body: formData })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        setError("")
        const body: Record<string, unknown> = { name, domain: domain || undefined }
        if (company) body.id = company.id
        const res = await fetch("/api/ops/companies", { method: company ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        if (res.ok) {
            const data = await res.json()
            const companyId = company?.id || data?.company?.id
            if (companyId && iconFile) {
                await uploadIcon(companyId)
            }
            onSuccess()
        } else {
            const d = await res.json()
            setError(d.error || "Failed")
        }
        setSubmitting(false)
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <Label>Company Icon</Label>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 transition-colors hover:border-primary/40 hover:bg-muted overflow-hidden"
                    >
                        {iconPreview ? (
                            <img src={iconPreview} alt="Icon" className="h-full w-full object-contain p-1" />
                        ) : (
                            <Building2 className="h-6 w-6 text-muted-foreground" />
                        )}
                    </button>
                    <div className="flex flex-col gap-1">
                        <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => fileInputRef.current?.click()}>
                            {iconPreview ? "Change" : "Upload"} Icon
                        </Button>
                        <p className="text-[10px] text-muted-foreground">PNG, JPEG, WebP or SVG · Max 2MB</p>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                </div>
            </div>
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
