import { NextRequest } from "next/server"
import { requireAdmin } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { apiResponse, apiError, handleApiRequest, ApiRequestError } from "@/lib/api-utils"
import { randomUUID } from "crypto"
import { cloudinary } from "@/lib/cloudinary"
import type { UploadApiResponse } from "cloudinary"

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"]

function uploadCompanyIconToCloudinary(params: {
    buffer: Buffer
    companyId: string
    mimeType: string
}): Promise<UploadApiResponse> {
    const ext = params.mimeType.split("/")[1] || "png"
    const publicId = `company-icons/${params.companyId}/${randomUUID()}`

    return new Promise((resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream(
            {
                folder: "folksmeal",
                public_id: publicId,
                resource_type: "image",
                overwrite: false,
                format: ext,
            },
            (error, result) => {
                if (error || !result) {
                    reject(error ?? new Error("Cloudinary upload failed"))
                    return
                }
                resolve(result)
            }
        )

        upload.end(params.buffer)
    })
}

export async function POST(request: NextRequest) {
    return handleApiRequest(async () => {
        const user = await requireAdmin()
        if (!user || user.role !== "SUPERADMIN") return apiError("Forbidden", 403)

        const formData = await request.formData()
        const file = formData.get("file") as File | null
        const companyId = formData.get("companyId") as string | null

        if (!file) {
            throw new ApiRequestError("No file uploaded", 400, "NO_FILE")
        }
        if (!companyId) {
            throw new ApiRequestError("Company ID is required", 400, "MISSING_COMPANY_ID")
        }

        if (file.size > MAX_FILE_SIZE) {
            throw new ApiRequestError("File exceeds 2MB limit", 400, "FILE_TOO_LARGE")
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            throw new ApiRequestError(
                "Invalid file type. Only PNG, JPEG, and WebP are allowed.",
                400,
                "INVALID_FILE_TYPE"
            )
        }

        const company = await prisma.company.findUnique({ where: { id: companyId } })
        if (!company) {
            return apiError("Company not found", 404, "COMPANY_NOT_FOUND")
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const uploaded = await uploadCompanyIconToCloudinary({
            buffer,
            companyId,
            mimeType: file.type,
        })
        const iconUrl = uploaded.secure_url

        // Update the company's icon field in the database
        await prisma.company.update({
            where: { id: companyId },
            data: { icon: iconUrl },
        })

        return apiResponse({ success: true, icon: iconUrl })
    })
}
