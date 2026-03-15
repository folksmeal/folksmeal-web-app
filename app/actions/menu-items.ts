"use server"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-helpers"
import { revalidatePath } from "next/cache"

export async function deleteMenuItem(id: string) {
    const user = await requireAdmin()
    if (!user || user.role !== "SUPERADMIN") {
        throw new Error("Unauthorized: Only Super Admins can manage Menu Items")
    }

    await prisma.menuItem.delete({
        where: { id }
    })

    revalidatePath("/ops/menu-items")
    return { success: true }
}

export async function updateMenuItem(id: string, data: { name: string, description?: string | null }) {
    const user = await requireAdmin()
    if (!user || user.role !== "SUPERADMIN") {
        throw new Error("Unauthorized: Only Super Admins can manage Menu Items")
    }

    if (!data.name.trim()) {
        throw new Error("Name is required")
    }

    await prisma.menuItem.update({
        where: { id },
        data: {
            name: data.name.trim(),
            description: data.description?.trim() || null,
        }
    })

    revalidatePath("/ops/menu-items")
    return { success: true }
}

