"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
    getTomorrowMidnightInTimezone,
    isPastCutoffInTimezone,
} from "@/lib/utils/time"
import { z } from "zod"
import { revalidatePath } from "next/cache"

const mealSelectionSchema = z
    .object({
        status: z.enum(["OPT_IN", "OPT_OUT"]),
        preference: z.enum(["VEG", "NONVEG"]).nullable().optional(),
    })
    .refine(
        (data) => {
            if (data.status === "OPT_IN" && !data.preference) {
                return false
            }
            return true
        },
        {
            message: "Preference (VEG/NONVEG) is required when opting in.",
            path: ["preference"],
        }
    )

export async function submitMealSelection(formData: {
    status: "OPT_IN" | "OPT_OUT"
    preference?: "VEG" | "NONVEG" | null
}) {
    try {
        const session = await auth()
        if (!session?.user) {
            return { success: false, error: "Unauthorized" }
        }

        const parsedData = mealSelectionSchema.safeParse(formData)
        if (!parsedData.success) {
            return { success: false, error: parsedData.error.errors[0].message }
        }
        const { status, preference } = parsedData.data

        const { addressId } = session.user
        if (!addressId) {
            return { success: false, error: "No location assigned to your account" }
        }

        const address = await prisma.companyAddress.findUnique({
            where: { id: addressId },
        })

        if (!address) {
            return { success: false, error: "Location not found" }
        }

        const timezone = address.timezone || "Asia/Kolkata"
        const tomorrow = getTomorrowMidnightInTimezone(timezone)

        if (
            address.workingDays &&
            !address.workingDays.includes(tomorrow.getDay())
        ) {
            return { success: false, error: "Tomorrow is a non-working day. Meal selection is disabled." }
        }

        if (isPastCutoffInTimezone(address.cutoffTime, timezone)) {
            return { success: false, error: `Cutoff time (${address.cutoffTime}) has passed. Selection is locked.` }
        }

        if (status === "OPT_IN") {
            const menu = await prisma.menu.findUnique({
                where: {
                    addressId_date: {
                        addressId,
                        date: tomorrow,
                    },
                },
            })

            if (!menu) {
                return { success: false, error: "No menu available for tomorrow." }
            }

            if (preference === "NONVEG" && !menu.nonvegItem) {
                return { success: false, error: "Non-veg option is not available for tomorrow." }
            }
        }

        const selection = await prisma.mealSelection.upsert({
            where: {
                employeeId_date: {
                    employeeId: session.user.id!,
                    date: tomorrow,
                },
            },
            update: {
                status,
                preference: status === "OPT_IN" ? preference : null,
            },
            create: {
                employeeId: session.user.id!,
                date: tomorrow,
                status,
                preference: status === "OPT_IN" ? preference : null,
            },
        })

        revalidatePath("/dashboard")

        return {
            success: true,
            selection: {
                status: selection.status,
                preference: selection.preference,
                updatedAt: selection.updatedAt.toISOString(),
            },
        }
    } catch (error) {
        console.error("Meal selection error:", error)
        return { success: false, error: "An unexpected error occurred. Please try again." }
    }
}
