import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { MenuScreen } from "@/components/menu-screen"
import { ConfirmationScreen } from "@/components/confirmation-screen"
import { getTomorrowMidnightInTimezone } from "@/lib/utils/time"

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ submitted?: string }>
}) {
    const session = await auth()

    if (!session?.user) {
        redirect("/")
    }

    const { officeId, employeeCode, officeName, officeTimezone, companyName } = session.user


    const office = await prisma.office.findUnique({
        where: { id: officeId },
    })

    const cutoffTime = office?.cutoffTime || "18:00"
    const timezone = office?.timezone || officeTimezone || "UTC"


    const tomorrow = getTomorrowMidnightInTimezone(timezone)

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


    const params = await searchParams
    const justSubmitted = params.submitted === "true"
    const fullOfficeName = `${companyName} - ${officeName}`

    if (justSubmitted && existingSelection) {
        return (
            <ConfirmationScreen
                employeeCode={employeeCode}
                officeName={fullOfficeName}
                status={existingSelection.status}
                preference={existingSelection.preference}
                updatedAt={existingSelection.updatedAt}
            />
        )
    }

    return (
        <MenuScreen
            employeeCode={employeeCode}
            officeName={fullOfficeName}
            cutoffTime={cutoffTime}
            menu={menuData}
            existingSelection={existingSelection}
        />
    )
}
