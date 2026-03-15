"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Upload } from "lucide-react"
import { MenuItemUploader } from "@/components/ops/menu-item-uploader"

export function MenuItemUploadButton() {
    const [open, setOpen] = useState(false)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="h-10 rounded-xl px-4">
                    <Upload className="h-4 w-4 mr-2" /> Upload Menu Items
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Upload Menu Items</DialogTitle>
                </DialogHeader>
                <MenuItemUploader onClose={() => setOpen(false)} />
            </DialogContent>
        </Dialog>
    )
}
