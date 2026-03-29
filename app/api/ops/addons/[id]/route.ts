import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const addonUpdateSchema = z.object({
    name: z.string().min(1, "Name is required").optional(),
    unitPrice: z.number().min(0, "Price must be >= 0").optional(),
    maxQty: z.number().int().min(1, "Max quantity must be >= 1").optional(),
    isRepeatable: z.boolean().optional(),
    isLinkedToMenu: z.boolean().optional(),
    type: z.enum(["MAIN_REPEAT", "PROTEIN_SIDE", "BEVERAGE", "SIDE_DESSERT", "BREAD_ADDITION"]).optional(),
    active: z.boolean().optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth()
        if (session?.user?.role !== "SUPERADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params
        const json = await req.json()
        const result = addonUpdateSchema.safeParse(json)

        if (!result.success) {
            return NextResponse.json(
                { error: "Invalid data", details: result.error.errors },
                { status: 400 }
            )
        }

        if (result.data.name) {
            const existingAddon = await prisma.addon.findFirst({
                where: { name: result.data.name, id: { not: id } },
            })
            if (existingAddon) {
                return NextResponse.json(
                    { error: "Another Add-on with this name already exists" },
                    { status: 400 }
                )
            }
        }

        const addon = await prisma.addon.update({
            where: { id },
            data: result.data,
        })

        return NextResponse.json(addon)
    } catch (error) {
        console.error("[ADDON_PATCH]", error)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth()
        if (session?.user?.role !== "SUPERADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params

        await prisma.addon.delete({
            where: { id },
        })

        return new NextResponse(null, { status: 204 })
    } catch (error) {
        console.error("[ADDON_DELETE]", error)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
