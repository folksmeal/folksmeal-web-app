import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, getEffectiveAddressId } from "@/lib/auth-helpers"
import { Prisma } from "@prisma/client"
import { apiResponse, apiError, handleApiRequest } from "@/lib/api-utils"

export async function GET(request: NextRequest) {
    return handleApiRequest(async () => {
        const user = await requireAdmin()
        if (!user) return apiError("Forbidden", 403)

        const { searchParams } = new URL(request.url)
        // Allow explicit query override, else fallback to effective address
        const queryAddressId = searchParams.get("addressId")
        const effectiveAddressId = queryAddressId || await getEffectiveAddressId(user)

        const daysParam = searchParams.get("days") || "30"
        const days = parseInt(daysParam)
        const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")))
        const skip = (page - 1) * limit

        if (isNaN(days) || days < 1 || days > 365) {
            return apiError("Days must be between 1 and 365", 400, "INVALID_DAYS")
        }

        const since = new Date()
        since.setDate(since.getDate() - days)

        const whereClause: Prisma.MealRatingWhereInput = {
            createdAt: { gte: since },
        }

        if (effectiveAddressId) {
            whereClause.employee = { addressId: effectiveAddressId }
        }

        // Get total count and aggregated stats from full dataset
        const [totalRatings, allRatings, paginatedRatings] = await Promise.all([
            prisma.mealRating.count({ where: whereClause }),
            prisma.mealRating.findMany({
                where: whereClause,
                select: { rating: true },
            }),
            prisma.mealRating.findMany({
                where: whereClause,
                include: {
                    employee: { select: { name: true, employeeCode: true, address: true } },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
        ])

        const averageRating = totalRatings > 0
            ? allRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
            : 0

        const distribution = [1, 2, 3, 4, 5].map((star) => ({
            star,
            count: allRatings.filter((r) => r.rating === star).length,
        }))

        return apiResponse({
            averageRating: Math.round(averageRating * 10) / 10,
            totalRatings,
            distribution,
            reviews: paginatedRatings.map((r) => ({
                id: r.id,
                employeeName: r.employee.name,
                employeeCode: r.employee.employeeCode,
                rating: r.rating,
                comment: r.comment,
                date: r.date.toISOString().split("T")[0],
                createdAt: r.createdAt.toISOString(),
            })),
            pagination: {
                total: totalRatings,
                page,
                limit,
                totalPages: Math.ceil(totalRatings / limit),
            },
        })
    })
}
