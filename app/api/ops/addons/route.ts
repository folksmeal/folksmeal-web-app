import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const addonSchema = z.object({
    name: z.string().min(1, "Name is required"),
    unitPrice: z.number().min(0, "Price must be >= 0"),
    maxQty: z.number().int().min(1, "Max quantity must be >= 1"),
    isRepeatable: z.boolean().default(false),
    isLinkedToMenu: z.boolean().default(false),
    type: z.enum(["MAIN_REPEAT", "PROTEIN_SIDE", "BEVERAGE", "SIDE_DESSERT", "BREAD_ADDITION"]),
    active: z.boolean().default(true),
})

export async function GET() {
    try {
        const session = await auth()
        if (session?.user?.role !== "SUPERADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const addons = await prisma.addon.findMany({
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json(addons)
    } catch (error) {
        console.error("[ADDONS_GET]", error)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth()
        if (session?.user?.role !== "SUPERADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const json = await req.json()
        const result = addonSchema.safeParse(json)

        if (!result.success) {
            return NextResponse.json(
                { error: "Invalid data", details: result.error.errors },
                { status: 400 }
            )
        }

        const existingAddon = await prisma.addon.findUnique({
            where: { name: result.data.name },
        })

        if (existingAddon) {
            return NextResponse.json(
                { error: "Add-on with this name already exists" },
                { status: 400 }
            )
        }

        const addon = await prisma.addon.create({
            data: result.data,
        })

        return NextResponse.json(addon)
    } catch (error) {
        console.error("[ADDONS_POST]", error)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
