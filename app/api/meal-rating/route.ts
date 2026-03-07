import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import {
    apiResponse,
    apiError,
    handleApiRequest,
    parseBody,
} from "@/lib/api-utils"

const ratingSchema = z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(500).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
})

export async function GET(request: NextRequest) {
    return handleApiRequest(async () => {
        const session = await auth()
        if (!session?.user) {
            return apiError("Unauthorized", 401)
        }

        const { searchParams } = new URL(request.url)
        const dateParam = searchParams.get("date")
        if (!dateParam) {
            return apiError("Date query parameter is required", 400, "MISSING_DATE")
        }

        const targetDate = new Date(dateParam + "T00:00:00.000Z")
        if (isNaN(targetDate.getTime())) {
            return apiError("Invalid date format", 400, "INVALID_DATE")
        }

        const rating = await prisma.mealRating.findUnique({
            where: {
                employeeId_date: {
                    employeeId: session.user.id!,
                    date: targetDate,
                },
            },
        })

        return apiResponse({
            rating: rating
                ? { rating: rating.rating, comment: rating.comment }
                : null,
        })
    })
}

export async function POST(request: NextRequest) {
    return handleApiRequest(async () => {
        const session = await auth()
        if (!session?.user) {
            return apiError("Unauthorized", 401)
        }

        const { rating, comment, date } = await parseBody(request, ratingSchema)
        const targetDate = new Date(date + "T00:00:00.000Z")

        if (isNaN(targetDate.getTime())) {
            return apiError("Invalid date format", 400, "INVALID_DATE")
        }

        const result = await prisma.mealRating.upsert({
            where: {
                employeeId_date: {
                    employeeId: session.user.id!,
                    date: targetDate,
                },
            },
            update: { rating, comment: comment || null },
            create: {
                employeeId: session.user.id!,
                date: targetDate,
                rating,
                comment: comment || null,
            },
        })

        return apiResponse({
            success: true,
            rating: { rating: result.rating, comment: result.comment },
        })
    })
}
