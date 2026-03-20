"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { getISTDateString, getISTHours } from "@/lib/utils/time"

const ratingSchema = z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(500).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
})

interface AuthenticatedSession {
    user: {
        id: string;
        addressId: string;
        locationTimezone: string;
    }
}

export async function submitMealRating(formData: {
    rating: number
    comment?: string
    date: string
}) {
    try {
        const session = await auth() as AuthenticatedSession | null
        if (!session?.user) {
            return { success: false, error: "Unauthorized" }
        }

        const parsedData = ratingSchema.safeParse(formData)
        if (!parsedData.success) {
            return { success: false, error: parsedData.error.errors[0].message }
        }

        const { rating, comment, date } = parsedData.data
        const targetDate = new Date(date + "T00:00:00.000Z")

        if (isNaN(targetDate.getTime())) {
            return { success: false, error: "Invalid date format" }
        }

        // Only allow rating meals for the current day
        const currentDateStr = getISTDateString()

        if (date !== currentDateStr) {
            return { success: false, error: "You can only rate today's meal" }
        }

        // Must be past 2:00 PM (14:00) IST
        if (getISTHours() < 14) {
            return { success: false, error: "Meal rating opens at 2:00 PM." }
        }

        const [address, todayMenu, mealSelection] = await Promise.all([
            prisma.companyAddress.findUnique({
                where: { id: session.user.addressId },
                select: { workingDays: true }
            }),
            prisma.menu.findUnique({
                where: { addressId_date: { addressId: session.user.addressId, date: targetDate } },
                select: { id: true }
            }),
            prisma.mealSelection.findUnique({
                where: { employeeId_date: { employeeId: session.user.id, date: targetDate } },
                select: { status: true }
            })
        ])

        if (!address?.workingDays.includes(targetDate.getUTCDay())) {
            return { success: false, error: "Cannot rate meals on non-working days" }
        }

        if (!todayMenu) {
            return { success: false, error: "No menu was scheduled for today" }
        }

        if (mealSelection?.status !== "OPT_IN") {
            return { success: false, error: "You must have opted in to rate the meal" }
        }

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

        revalidatePath("/dashboard")
        return { success: true, rating: { rating: result.rating, comment: result.comment } }
    } catch (error) {
        console.error("Error submitting meal rating:", error)
        return { success: false, error: "Failed to submit rating. Please try again." }
    }
}
