"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Upload } from "lucide-react"
import { AddonUploader } from "@/components/ops/addon-uploader"

export function AddonUploadButton() {
    const [open, setOpen] = useState(false)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Upload className="h-4 w-4 mr-2" /> Upload Add-ons
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Upload Add-ons</DialogTitle>
                </DialogHeader>
                <AddonUploader onClose={() => setOpen(false)} />
            </DialogContent>
        </Dialog>
    )
}
