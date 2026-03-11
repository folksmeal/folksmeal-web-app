import { ReviewsDashboard } from "@/components/ops/reviews-dashboard"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getEffectiveAddressId } from "@/lib/auth-helpers"

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ days?: string, page?: string }> }) {
    const session = await auth()
    if (!session?.user) return null

    const effectiveAddressId = await getEffectiveAddressId(session.user)
    const params = await searchParams

    const daysParam = params.days || "30"
    const days = parseInt(daysParam)
    const pageParam = Math.max(1, parseInt(params.page || "1"))
    const limit = 15
    const skip = (pageParam - 1) * limit

    const since = new Date()
    since.setDate(since.getDate() - days)

    const whereClause: {
        createdAt: { gte: Date };
        employee?: { addressId: string };
    } = {
        createdAt: { gte: since },
    }

    if (effectiveAddressId) {
        whereClause.employee = { addressId: effectiveAddressId }
    }

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
        ? allRatings.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / totalRatings
        : 0

    const distribution = [1, 2, 3, 4, 5].map((star) => ({
        star,
        count: allRatings.filter((r: { rating: number }) => r.rating === star).length,
    }))

    const reviewsData = {
        averageRating: Math.round(averageRating * 10) / 10,
        totalRatings,
        distribution,
        reviews: paginatedRatings.map((r: { id: string; rating: number; comment: string | null; date: Date; createdAt: Date; employee: { name: string; employeeCode: string; address: { city: string } } }) => ({
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
        }
    }

    return <ReviewsDashboard initialDays={days} initialData={reviewsData} basePath="/admin" />
}
