import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, getEffectiveAddressId } from "@/lib/auth-helpers"
import { Prisma } from "@prisma/client"
import { apiResponse, apiError, handleApiRequest } from "@/lib/api-utils"
import { isCompanyAdminFeatureEnabled } from "@/lib/company-admin-features"

export async function GET(request: NextRequest) {
    return handleApiRequest(async () => {
        const user = await requireAdmin()
        if (!user) return apiError("Forbidden", 403)
        if (!(await isCompanyAdminFeatureEnabled(user, "reviews"))) {
            return apiError("Reviews are disabled for this company admin", 403, "FEATURE_DISABLED")
        }

        const { searchParams } = new URL(request.url)
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
            date: { gte: since },
        }

        if (effectiveAddressId) {
            whereClause.employee = {
                addressId: effectiveAddressId,
                ...(user.role === "ADMIN" && user.companyId ? { companyId: user.companyId } : {})
            }
        } else if (user.role === "ADMIN" && user.companyId) {
            whereClause.employee = { companyId: user.companyId }
        }

        const [
            totalRatings,
            stats,
            distributionRaw,
            paginatedRatings,
        ] = await Promise.all([
            prisma.mealRating.count({ where: whereClause }),
            prisma.mealRating.aggregate({
                where: whereClause,
                _avg: { rating: true },
            }),
            prisma.mealRating.groupBy({
                by: ["rating"],
                where: whereClause,
                _count: { rating: true },
            }),
            prisma.mealRating.findMany({
                where: whereClause,
                include: {
                    employee: { select: { name: true, employeeCode: true, address: true } },
                },
                orderBy: [{ date: "desc" }, { createdAt: "desc" }],
                skip,
                take: limit,
            }),
        ])

        const averageRating = stats._avg.rating || 0

        const distribution = [1, 2, 3, 4, 5].map((star) => {
            const found = distributionRaw.find((d) => d.rating === star)
            return {
                star,
                count: found ? found._count.rating : 0,
            }
        })

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
