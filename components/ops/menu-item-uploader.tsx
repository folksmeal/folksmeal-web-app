"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    Upload,
    Check,
    AlertCircle,
    Loader2,
} from "lucide-react"

interface MenuItemUploaderProps {
    onClose?: () => void
}

interface UploadResult {
    success: boolean
    processed: number
    errors: number
    errorDetails?: { row: number; error: string }[]
    error?: string
}

export function MenuItemUploader({ onClose }: MenuItemUploaderProps) {
    const router = useRouter()
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

        setUploading(true)
        setResult(null)

        try {
            const formData = new FormData()
            formData.append("file", selectedFile)

            const res = await fetch("/api/ops/upload-menu-items", {
                method: "POST",
                body: formData,
            })

            const data = await res.json()
            setResult(data)
            if (data.success) {
                router.refresh()
            }
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
    }, [selectedFile, router])

    return (
        <div className="flex flex-col items-center justify-center gap-6 py-4 text-center">
            <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                    Upload an Excel file (.xlsx) with <strong>Name</strong> and <strong>Description</strong> headers.
                </p>
                <p className="text-xs text-muted-foreground/60 italic">
                    Existing items with the same name will be updated.
                </p>
            </div>

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
                                Processing Library...
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-3.5 w-3.5" />
                                Sync Library
                            </>
                        )}
                    </Button>
                )}

                {result && (
                    <div
                        className={`rounded-lg border px-4 py-3 w-full ${result.success
                            ? "border-primary/20 bg-primary/5"
                            : "border-destructive/30 bg-destructive/5"
                            }`}
                    >
                        {result.success ? (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-primary" />
                                    <p className="text-xs font-medium text-foreground">
                                        Successfully updated {result.processed} item{result.processed !== 1 ? "s" : ""}
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-[10px] mt-1"
                                    onClick={onClose}
                                >
                                    Done
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-destructive" />
                                    <p className="text-xs font-medium text-destructive">
                                        {result.error || "Upload failed"}
                                    </p>
                                </div>
                                {result.errorDetails && result.errorDetails.length > 0 && (
                                    <div className="text-left mt-2 max-h-32 overflow-auto">
                                        {result.errorDetails.map((e, i) => (
                                            <p key={i} className="text-[10px] text-destructive/80">
                                                Row {e.row}: {e.error}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
