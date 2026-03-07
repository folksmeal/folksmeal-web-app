import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-helpers"

export async function GET(request: NextRequest) {
    try {
        const user = await requireAdmin()
        if (!user) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const addressId = searchParams.get("addressId") || user.addressId
        const days = parseInt(searchParams.get("days") || "30")

        const since = new Date()
        since.setDate(since.getDate() - days)

        const ratings = await prisma.mealRating.findMany({
            where: {
                employee: { addressId },
                createdAt: { gte: since },
            },
            include: {
                employee: { select: { name: true, employeeCode: true } },
            },
            orderBy: { createdAt: "desc" },
        })

        const totalRatings = ratings.length
        const averageRating = totalRatings > 0
            ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
            : 0

        const distribution = [1, 2, 3, 4, 5].map((star) => ({
            star,
            count: ratings.filter((r) => r.rating === star).length,
        }))

        return NextResponse.json({
            averageRating: Math.round(averageRating * 10) / 10,
            totalRatings,
            distribution,
            reviews: ratings.map((r) => ({
                id: r.id,
                employeeName: r.employee.name,
                employeeCode: r.employee.employeeCode,
                rating: r.rating,
                comment: r.comment,
                date: r.date.toISOString().split("T")[0],
                createdAt: r.createdAt.toISOString(),
            })),
        })
    } catch (error) {
        console.error("[GET /api/ops/reviews]", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
