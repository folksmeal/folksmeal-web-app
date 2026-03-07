import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const ratingSchema = z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(500).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function GET(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const dateParam = searchParams.get("date")
        if (!dateParam) {
            return NextResponse.json({ error: "Date required" }, { status: 400 })
        }

        const targetDate = new Date(dateParam + "T00:00:00.000Z")

        const rating = await prisma.mealRating.findUnique({
            where: {
                employeeId_date: {
                    employeeId: session.user.id,
                    date: targetDate,
                },
            },
        })

        return NextResponse.json({ rating: rating ? { rating: rating.rating, comment: rating.comment } : null })
    } catch (error) {
        console.error("[GET /api/meal-rating]", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const parsed = ratingSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid payload", details: parsed.error.format() }, { status: 400 })
        }

        const { rating, comment, date } = parsed.data
        const targetDate = new Date(date + "T00:00:00.000Z")

        const result = await prisma.mealRating.upsert({
            where: {
                employeeId_date: {
                    employeeId: session.user.id,
                    date: targetDate,
                },
            },
            update: { rating, comment: comment || null },
            create: {
                employeeId: session.user.id,
                date: targetDate,
                rating,
                comment: comment || null,
            },
        })

        return NextResponse.json({ success: true, rating: { rating: result.rating, comment: result.comment } })
    } catch (error) {
        console.error("[POST /api/meal-rating]", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
