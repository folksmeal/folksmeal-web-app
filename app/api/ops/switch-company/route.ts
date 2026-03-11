import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-helpers"
import { z } from "zod"
import { apiResponse, apiError, handleApiRequest, parseBody } from "@/lib/api-utils"

const switchSchema = z.object({
    companyId: z.string().min(1, "Location ID is required"),
})

export async function POST(request: NextRequest) {
    return handleApiRequest(async () => {
        const user = await requireAdmin()
        if (!user) return apiError("Forbidden", 403)

        const { companyId: addressId } = await parseBody(request, switchSchema)

        const address = await prisma.companyAddress.findUnique({
            where: { id: addressId },
            include: { company: true },
        })

        if (!address) {
            return apiError("Location not found", 404, "LOCATION_NOT_FOUND")
        }

        if (user.role === "ADMIN" && address.companyId !== user.companyId) {
            return apiError("Forbidden: Cannot switch to another company's location", 403, "FORBIDDEN")
        }

        return apiResponse({
            success: true,
            newLocation: {
                companyId: address.companyId,
                companyName: address.company.name,
                companyIcon: address.company.icon,
                addressId: address.id,
                addressCity: address.city,
                locationTimezone: address.timezone,
            },
        })
    })
}