"use server"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth-helpers"
import { revalidatePath } from "next/cache"

export async function deleteMenuItem(id: string) {
    const user = await requireAdmin()
    if (!user || user.role !== "SUPERADMIN") {
        throw new Error("Unauthorized: Only Super Admins can manage the global library")
    }

    await prisma.menuItem.delete({
        where: { id }
    })

    revalidatePath("/ops/menu-items")
    return { success: true }
}
