"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Upload } from "lucide-react"
import { MenuUploader } from "@/components/ops/menu-uploader"

export function MenuUploadButton({ addressId }: { addressId: string }) {
    const [open, setOpen] = useState(false)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <Upload className="h-3.5 w-3.5" /> Upload Menu
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Upload Weekly Menu</DialogTitle>
                </DialogHeader>
                <MenuUploader addressId={addressId} onClose={() => setOpen(false)} />
            </DialogContent>
        </Dialog>
    )
}
