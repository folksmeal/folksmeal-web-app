"use client"

import { useState, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
    Upload,
    Check,
    AlertCircle,
    Loader2,
} from "lucide-react"
import { format, parseISO } from "date-fns"

interface MenuUploaderProps {
    addressId: string
    onClose?: () => void
}

interface UploadResult {
    success: boolean
    processed: number
    errors: number
    results?: { date: string; vegItem: string; nonvegItem: string | null }[]
    errorDetails?: { row: number; error: string }[]
    error?: string
}

export function MenuUploader({ addressId, onClose: _onClose }: MenuUploaderProps) {
    const { data: session } = useSession()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [result, setResult] = useState<UploadResult | null>(null)

    const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0]
            if (file) {
                setSelectedFile(file)
                setResult(null)
            }
        },
        []
    )

    const handleUpload = useCallback(async () => {
        if (!selectedFile) return
        if (!addressId) {
            setResult({
                success: false,
                processed: 0,
                errors: 1,
                error: "Please select a location from the sidebar first."
            })
            return
        }

        setUploading(true)
        setResult(null)

        try {
            const formData = new FormData()
            formData.append("file", selectedFile)
            formData.append("addressId", addressId)

            const res = await fetch("/api/ops/upload-menu", {
                method: "POST",
                body: formData,
            })

            const data = await res.json()
            setResult(data)
        } catch (error) {
            console.error("Upload error:", error)
            setResult({
                success: false,
                processed: 0,
                errors: 1,
                error: "Upload failed. Please try again."
            })
        } finally {
            setUploading(false)
        }
    }, [selectedFile, session])

    return (
        <div className="flex flex-col items-center justify-center gap-6 py-4 text-center">
            <p className="text-sm text-muted-foreground">
                Upload an Excel file (.xlsx) with <strong>Date</strong> and <strong>Menu</strong> columns.
            </p>

            <div className="flex flex-col items-center gap-4 w-full">
                <div className="flex flex-col items-center gap-3">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="h-10 rounded-xl px-6"
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        Choose File
                    </Button>
                    {selectedFile && (
                        <span className="max-w-64 truncate rounded-xl border border-primary/10 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                            {selectedFile.name}
                        </span>
                    )}
                </div>

                {selectedFile && !result?.success && (
                    <Button
                        onClick={handleUpload}
                        disabled={uploading}
                        className="h-10 rounded-xl px-8"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-3.5 w-3.5" />
                                Upload & Process
                            </>
                        )}
                    </Button>
                )}

                {result && (
                    <div
                        className={`rounded-lg border px-4 py-3 ${result.success
                            ? "border-primary/20 bg-primary/5"
                            : "border-destructive/30 bg-destructive/5"
                            }`}
                    >
                        {result.success ? (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-primary" />
                                    <p className="text-xs font-medium text-foreground">
                                        Successfully processed {result.processed} menu
                                        {result.processed !== 1 ? "s" : ""}
                                    </p>
                                </div>
                                {result.results && result.results.length > 0 && (
                                    <div className="ml-6 text-xs text-muted-foreground space-y-0.5">
                                        {result.results.slice(0, 7).map((r, i) => (
                                            <p key={i}>
                                                {format(parseISO(r.date), "dd MMM")}: {r.vegItem}
                                                {r.nonvegItem ? ` | ${r.nonvegItem}` : ""}
                                            </p>
                                        ))}
                                        {result.results.length > 7 && (
                                            <p className="italic underline">...and {result.results.length - 7} more</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-destructive" />
                                <p className="text-xs font-medium text-destructive">
                                    {result.error || "Upload failed"}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
