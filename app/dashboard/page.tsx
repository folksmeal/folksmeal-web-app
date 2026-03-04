import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { MenuScreen } from "@/components/menu-screen"
import { ConfirmationScreen } from "@/components/confirmation-screen"

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ submitted?: string }>
}) {
    const session = await auth()

    if (!session?.user) {
        redirect("/")
    }

    const { officeId, employeeCode, officeName } = session.user as { officeId: string; employeeCode: string; officeName: string }

    // ─── Fetch office cutoff time ─────────────────────────────────
    const office = await prisma.office.findUnique({
        where: { id: officeId },
    })

    const cutoffTime = office?.cutoffTime || "18:00"

    // ─── Fetch tomorrow's menu ────────────────────────────────────
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    const menu = await prisma.menu.findUnique({
        where: {
            officeId_date: {
                officeId,
                date: tomorrow,
            },
        },
    })

    const menuData = menu
        ? {
            date: menu.date.toISOString(),
            day: menu.day,
            vegItem: menu.vegItem,
            nonvegItem: menu.nonvegItem,
            sideBeverage: menu.sideBeverage,
            notes: menu.notes,
            available: true,
        }
        : {
            date: tomorrow.toISOString(),
            day: null,
            vegItem: null,
            nonvegItem: null,
            sideBeverage: null,
            notes: null,
            available: false,
        }

    // ─── Fetch existing selection ─────────────────────────────────
    const selection = await prisma.mealSelection.findUnique({
        where: {
            employeeId_date: {
                employeeId: session.user.id,
                date: tomorrow,
            },
        },
    })

    const existingSelection = selection
        ? {
            status: selection.status as "OPT_IN" | "OPT_OUT",
            preference: selection.preference as "VEG" | "NONVEG" | null,
            updatedAt: selection.updatedAt.toISOString(),
        }
        : null

    // ─── Show confirmation if just submitted or has existing selection ──
    const params = await searchParams
    const justSubmitted = params.submitted === "true"

    if (justSubmitted && existingSelection) {
        return (
            <ConfirmationScreen
                employeeCode={employeeCode}
                officeName={officeName}
                status={existingSelection.status}
                preference={existingSelection.preference}
                updatedAt={existingSelection.updatedAt}
            />
        )
    }

    return (
        <MenuScreen
            employeeCode={employeeCode}
            officeName={officeName}
            cutoffTime={cutoffTime}
            menu={menuData}
            existingSelection={existingSelection}
        />
    )
}
