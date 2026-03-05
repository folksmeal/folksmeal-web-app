import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getTomorrowMidnightInTimezone, isPastCutoffInTimezone } from "@/lib/utils/time"
import { z } from "zod"

const mealSelectionSchema = z.object({
    status: z.enum(["OPT_IN", "OPT_OUT"]),
    preference: z.enum(["VEG", "NONVEG"]).nullable().optional(),
}).refine(
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

// Returns the employee's current selection for tomorrow.

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const sessionUser = session.user
        const timezone = sessionUser.officeTimezone || "UTC"
        const tomorrow = getTomorrowMidnightInTimezone(timezone)

        const selection = await prisma.mealSelection.findUnique({
            where: {
                employeeId_date: {
                    employeeId: session.user.id,
                    date: tomorrow,
                },
            },
        })

        if (!selection) {
            return NextResponse.json({ selection: null })
        }

        return NextResponse.json({
            selection: {
                status: selection.status,
                preference: selection.preference,
                updatedAt: selection.updatedAt.toISOString(),
            },
        })
    } catch (error) {
        console.error("[GET /api/meal-selection]", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}

// Creates or updates the employee's selection for tomorrow.
// Enforces:
//   1. Cutoff time validation (backend)
//   2. Menu availability validation (nonveg check)

export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const parsed = mealSelectionSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid payload.", details: parsed.error.format() },
                { status: 400 }
            )
        }

        const { status, preference } = parsed.data

        const { officeId } = session.user


        const office = await prisma.office.findUnique({
            where: { id: officeId },
        })

        if (!office) {
            return NextResponse.json(
                { error: "Office not found" },
                { status: 404 }
            )
        }

        const timezone = office.timezone || "UTC"

        if (isPastCutoffInTimezone(office.cutoffTime, timezone)) {
            return NextResponse.json(
                {
                    error: `Cutoff time (${office.cutoffTime}) has passed. Selection is locked.`,
                    code: "CUTOFF_PASSED",
                },
                { status: 403 }
            )
        }


        const tomorrow = getTomorrowMidnightInTimezone(timezone)

        if (status === "OPT_IN") {
            const menu = await prisma.menu.findUnique({
                where: {
                    officeId_date: {
                        officeId,
                        date: tomorrow,
                    },
                },
            })

            if (!menu) {
                return NextResponse.json(
                    { error: "No menu available for tomorrow.", code: "NO_MENU" },
                    { status: 400 }
                )
            }

            // If preference is NONVEG but nonveg not available
            if (preference === "NONVEG" && !menu.nonvegItem) {
                return NextResponse.json(
                    {
                        error: "Non-veg option is not available for tomorrow.",
                        code: "NONVEG_UNAVAILABLE",
                    },
                    { status: 400 }
                )
            }
        }


        const selection = await prisma.mealSelection.upsert({
            where: {
                employeeId_date: {
                    employeeId: session.user.id,
                    date: tomorrow,
                },
            },
            update: {
                status,
                preference: status === "OPT_IN" ? preference : null,
            },
            create: {
                employeeId: session.user.id,
                date: tomorrow,
                status,
                preference: status === "OPT_IN" ? preference : null,
            },
        })

        return NextResponse.json({
            success: true,
            selection: {
                status: selection.status,
                preference: selection.preference,
                updatedAt: selection.updatedAt.toISOString(),
            },
        })
    } catch (error) {
        console.error("[POST /api/meal-selection]", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
