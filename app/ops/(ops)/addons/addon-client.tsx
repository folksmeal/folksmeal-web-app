"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Edit2, Plus, Trash2, Loader2, Download } from "lucide-react"
import { AddonUploadButton } from "@/components/ops/addon-upload-button"

type AddonType = "MAIN_REPEAT" | "PROTEIN_SIDE" | "BEVERAGE" | "SIDE_DESSERT" | "BREAD_ADDITION"

interface Addon {
    id: string
    name: string
    unitPrice: number
    maxQty: number
    isRepeatable: boolean
    isLinkedToMenu: boolean
    type: AddonType
    active: boolean
}

export function AddonClient({ initialAddons }: { initialAddons: Addon[] }) {
    const router = useRouter()
    const [addons, setAddons] = useState(initialAddons)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingAddon, setEditingAddon] = useState<Addon | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState<Partial<Addon>>({
        name: "",
        unitPrice: 0,
        maxQty: 1,
        isRepeatable: false,
        isLinkedToMenu: false,
        type: "PROTEIN_SIDE",
        active: true,
    })

    const handleOpenNew = () => {
        setEditingAddon(null)
        setFormData({
            name: "",
            unitPrice: 0,
            maxQty: 1,
            isRepeatable: false,
            isLinkedToMenu: false,
            type: "PROTEIN_SIDE",
            active: true,
        })
        setIsDialogOpen(true)
        setError(null)
    }

    const handleOpenEdit = (addon: Addon) => {
        setEditingAddon(addon)
        setFormData({ ...addon })
        setIsDialogOpen(true)
        setError(null)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this Add-on?")) return
        try {
            setLoading(true)
            const res = await fetch(`/api/ops/addons/${id}`, { method: "DELETE" })
            if (!res.ok) throw new Error("Failed to delete")

            setAddons(addons.filter(a => a.id !== id))
            router.refresh()
        } catch (e) {
            alert((e as Error).message)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const isEdit = !!editingAddon
            const url = isEdit ? `/api/ops/addons/${editingAddon.id}` : "/api/ops/addons"
            const method = isEdit ? "PATCH" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed to save addon")

            setIsDialogOpen(false)
            if (isEdit) {
                setAddons(addons.map(a => a.id === data.id ? data : a))
            } else {
                setAddons([data, ...addons])
            }
            router.refresh()
        } catch (e) {
            setError((e as Error).message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-full">
            <div className="shrink-0 border-b border-border bg-slate-50/80 px-4 py-3 sm:px-5 flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>Total Add-ons: {addons.length}</p>
                </div>
                <div className="flex items-center gap-3">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <Download className="h-4 w-4" /> Export Invoices
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Export Add-on Invoices</DialogTitle>
                            </DialogHeader>
                            <div className="py-4 space-y-4">
                                <div className="space-y-2">
                                    <Label>Select Billing Month</Label>
                                    <Input
                                        type="month"
                                        id="invoice-month"
                                        defaultValue={new Date().toISOString().slice(0, 7)}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    onClick={() => {
                                        const el = document.getElementById("invoice-month") as HTMLInputElement
                                        if (el && el.value) {
                                            window.location.href = `/api/ops/reports/addons-invoice?month=${el.value}`
                                        }
                                    }}
                                >
                                    Download CSV
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <AddonUploadButton />

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={handleOpenNew} className="gap-2">
                                <Plus className="h-4 w-4" /> Add Add-on
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-106.25">
                            <DialogHeader>
                                <DialogTitle>{editingAddon ? "Edit Add-on" : "Create Add-on"}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Boiled Egg (2)"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Unit Price (₹)</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            required
                                            value={formData.unitPrice}
                                            onChange={e => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Max Quantity</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            required
                                            value={formData.maxQty}
                                            onChange={e => setFormData({ ...formData, maxQty: parseInt(e.target.value, 10) })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Select
                                        value={formData.type}
                                        onValueChange={(v: AddonType) => setFormData({ ...formData, type: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="MAIN_REPEAT">Main Repeat</SelectItem>
                                            <SelectItem value="PROTEIN_SIDE">Protein Side</SelectItem>
                                            <SelectItem value="BEVERAGE">Beverage</SelectItem>
                                            <SelectItem value="SIDE_DESSERT">Side / Dessert</SelectItem>
                                            <SelectItem value="BREAD_ADDITION">Bread Addition</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="flex flex-col gap-1">
                                        <span>Is Repeatable?</span>
                                        <span className="font-normal text-xs text-muted-foreground">Second portion of main meal.</span>
                                    </Label>
                                    <Switch
                                        checked={formData.isRepeatable}
                                        onCheckedChange={checked => setFormData({ ...formData, isRepeatable: checked })}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="flex flex-col gap-1">
                                        <span>Linked to Menu?</span>
                                        <span className="font-normal text-xs text-muted-foreground">Pulls today's actual meal.</span>
                                    </Label>
                                    <Switch
                                        checked={formData.isLinkedToMenu}
                                        onCheckedChange={checked => setFormData({ ...formData, isLinkedToMenu: checked })}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>Active Status</Label>
                                    <Switch
                                        checked={formData.active}
                                        onCheckedChange={checked => setFormData({ ...formData, active: checked })}
                                    />
                                </div>

                                {error && <p className="text-sm text-destructive">{error}</p>}

                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                    <Button type="submit" disabled={loading}>
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="shrink-0 border-b border-border bg-slate-50">
                <table className="w-full text-sm">
                    <thead>
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-[25%]">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-[15%]">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-[15%]">Price / Max Qty</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-[20%]">Linked / Repeatable</th>
                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground w-[10%]">Status</th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground w-[15%]">Actions</th>
                        </tr>
                    </thead>
                </table>
            </div>
            <div className="overflow-auto flex-1">
                <table className="w-full text-sm table-fixed">
                    <tbody>
                        {addons.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                                    No add-ons found. Click "Add Add-on" to create one.
                                </td>
                            </tr>
                        ) : (
                            addons.map((item) => (
                                <tr key={item.id} className="transition-colors hover:bg-muted/30 border-b border-border">
                                    <td className="px-4 py-3 font-medium text-foreground w-[25%] truncate">
                                        {item.name}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground w-[15%]">
                                        <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                                            {item.type.replace("_", " ")}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground w-[15%]">
                                        ₹{item.unitPrice} / {item.maxQty}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground w-[20%] text-xs space-y-1">
                                        <div>Menu: {item.isLinkedToMenu ? "Yes" : "No"}</div>
                                        <div>Repeatable: {item.isRepeatable ? "Yes" : "No"}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center w-[10%]">
                                        {item.active ? (
                                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200/50">
                                                Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 border border-slate-200/50">
                                                Inactive
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right w-[15%]">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
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
