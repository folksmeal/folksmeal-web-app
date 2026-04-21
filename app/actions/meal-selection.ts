"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
    getTomorrowMidnightInTimezone,
    isPastCutoffInTimezone,
} from "@/lib/utils/time"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"

const mealSelectionSchema = z
    .object({
        status: z.enum(["OPT_IN", "OPT_OUT"]),
        preference: z.enum(["VEG", "NONVEG"]).nullable().optional(),
        addons: z.array(z.object({
            addonId: z.string(),
            quantity: z.number().int().min(1)
        })).optional().default([])
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

type SubmitMealSelectionInput = z.input<typeof mealSelectionSchema>

export async function submitMealSelection(formData: SubmitMealSelectionInput) {
    try {
        const session = await auth()
        if (!session?.user) {
            return { success: false, error: "Unauthorized" }
        }

        const parsedData = mealSelectionSchema.safeParse(formData)
        if (!parsedData.success) {
            return { success: false, error: parsedData.error.errors[0].message }
        }
        const { status, preference, addons } = parsedData.data

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
            !address.workingDays.includes(tomorrow.getUTCDay())
        ) {
            return { success: false, error: "Tomorrow is a non-working day. Meal selection is disabled." }
        }

        if (isPastCutoffInTimezone(address.cutoffTime, timezone)) {
            return { success: false, error: `Cutoff time (${address.cutoffTime}) has passed. Selection is locked.` }
        }

        const validatedAddons: { addonId: string; quantity: number; priceAtSelection: number }[] = []

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

            // Server-side guard: only process addons if the company feature flag is on
            let effectiveAddons = addons
            if (addons.length > 0) {
                const companyConfig = await prisma.companyAdminFeatureConfig.findUnique({
                    where: { companyId: address.companyId },
                    select: { addonsEnabled: true },
                })
                if (!companyConfig?.addonsEnabled) {
                    effectiveAddons = [] // silently strip addons if feature is off
                }
            }

            if (effectiveAddons.length > 0) {
                const addonIds = effectiveAddons.map(a => a.addonId)
                const dbAddons = await prisma.addon.findMany({
                    where: { id: { in: addonIds }, active: true }
                })

                const dbAddonsMap = new Map<string, { id: string; name: string; unitPrice: number; maxQty: number }>(dbAddons.map((a: { id: string; name: string; unitPrice: number; maxQty: number }) => [a.id, a]))

                for (const requestedAddon of effectiveAddons) {
                    const dbAddon = dbAddonsMap.get(requestedAddon.addonId)
                    if (!dbAddon) {
                        return { success: false, error: "One or more selected add-ons are unavailable." }
                    }
                    if (requestedAddon.quantity > dbAddon.maxQty) {
                        return { success: false, error: `Quantity for ${dbAddon.name} exceeds maximum allowed.` }
                    }
                    validatedAddons.push({
                        addonId: dbAddon.id,
                        quantity: requestedAddon.quantity,
                        priceAtSelection: dbAddon.unitPrice
                    })
                }
            }
        }

        // We use a transaction to handle upsert properly if we need to replace previous Addons
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const selection = await tx.mealSelection.upsert({
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

            // Clear previous addons
            await tx.mealSelectionAddon.deleteMany({
                where: { mealSelectionId: selection.id }
            })

            // Create new addons if any
            if (validatedAddons.length > 0 && status === "OPT_IN") {
                await tx.mealSelectionAddon.createMany({
                    data: validatedAddons.map(a => ({
                        mealSelectionId: selection.id,
                        addonId: a.addonId,
                        quantity: a.quantity,
                        priceAtSelection: a.priceAtSelection
                    }))
                })
            }
        })

        const selection = await prisma.mealSelection.findUnique({
            where: {
                employeeId_date: {
                    employeeId: session.user.id!,
                    date: tomorrow,
                },
            }
        })

        revalidatePath("/dashboard")

        return {
            success: true,
            selection: {
                status: selection!.status,
                preference: selection!.preference,
                updatedAt: selection!.updatedAt.toISOString(),
            },
        }
    } catch (error) {
        console.error("Meal selection error:", error)
        return { success: false, error: "An unexpected error occurred. Please try again." }
    }
}
