"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    Upload,
    Check,
    AlertCircle,
    Loader2,
    Download
} from "lucide-react"
import ExcelJS from "exceljs"

interface AddonUploaderProps {
    onClose?: () => void
}

interface UploadResult {
    success: boolean
    processed: number
    errors: number
    errorDetails?: { row: number; error: string }[]
    error?: string
}

export function AddonUploader({ onClose }: AddonUploaderProps) {
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

    const downloadTemplate = useCallback(async () => {
        const workbook = new ExcelJS.Workbook()
        const sheet = workbook.addWorksheet("Add-ons")

        // Define headers
        sheet.columns = [
            { header: "Name", key: "name", width: 30 },
            { header: "Unit Price", key: "unitPrice", width: 15 },
            { header: "Max Qty", key: "maxQty", width: 15 },
            { header: "Repeatable", key: "repeatable", width: 20 },
            { header: "Linked to Menu", key: "linked", width: 20 },
            { header: "Type", key: "type", width: 25 },
        ]

        // Add a sample row
        sheet.addRow({
            name: "Masala Omelette",
            unitPrice: 60,
            maxQty: 1,
            repeatable: "No",
            linked: "No",
            type: "PROTEIN_SIDE"
        })

        // Style headers
        sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }
        sheet.getRow(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF4F46E5" }
        }

        const buffer = await workbook.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "FolksMeal_Addons_Template.xlsx"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
    }, [])

    const handleUpload = useCallback(async () => {
        if (!selectedFile) return

        setUploading(true)
        setResult(null)

        try {
            const formData = new FormData()
            formData.append("file", selectedFile)

            const res = await fetch("/api/ops/upload-addons", {
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
                    Upload an Excel file (.xlsx) with the standard Add-on headers.
                </p>
                <div className="flex items-center justify-center pt-2">
                    <Button variant="ghost" size="sm" onClick={downloadTemplate} className="text-primary h-8">
                        <Download className="h-4 w-4 mr-2" /> Download Template
                    </Button>
                </div>
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
                        <span className="max-w-70 truncate rounded-xl border border-primary/10 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
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
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-3.5 w-3.5" />
                                Submit
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
                                        Successfully stored {result.processed} add-on{result.processed !== 1 ? "s" : ""}
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
                                        {result.error || "Upload failed with errors"}
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
