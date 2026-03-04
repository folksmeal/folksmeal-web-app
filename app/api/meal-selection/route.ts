import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// ─── GET /api/meal-selection ───────────────────────────────────────
// Returns the employee's current selection for tomorrow.

export async function GET() {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)

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

// ─── POST /api/meal-selection ──────────────────────────────────────
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
        const { status, preference } = body

        // ─── Validate input ────────────────────────────────────────
        if (!status || !["OPT_IN", "OPT_OUT"].includes(status)) {
            return NextResponse.json(
                { error: "Invalid status. Must be OPT_IN or OPT_OUT." },
                { status: 400 }
            )
        }

        if (status === "OPT_IN" && (!preference || !["VEG", "NONVEG"].includes(preference))) {
            return NextResponse.json(
                { error: "Invalid preference. Must be VEG or NONVEG when opting in." },
                { status: 400 }
            )
        }

        const { officeId } = session.user as { officeId: string }

        // ─── 1. CUTOFF VALIDATION (BACKEND) ───────────────────────
        const office = await prisma.office.findUnique({
            where: { id: officeId },
        })

        if (!office) {
            return NextResponse.json(
                { error: "Office not found" },
                { status: 404 }
            )
        }

        const [cutoffH, cutoffM] = office.cutoffTime.split(":").map(Number)
        const now = new Date()
        const currentHour = now.getHours()
        const currentMinute = now.getMinutes()

        if (currentHour > cutoffH || (currentHour === cutoffH && currentMinute >= cutoffM)) {
            return NextResponse.json(
                {
                    error: `Cutoff time (${office.cutoffTime}) has passed. Selection is locked.`,
                    code: "CUTOFF_PASSED",
                },
                { status: 403 }
            )
        }

        // ─── 2. MENU AVAILABILITY VALIDATION ──────────────────────
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)

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

        // ─── 3. UPSERT SELECTION ──────────────────────────────────
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
