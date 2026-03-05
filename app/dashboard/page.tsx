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

    const { addressId, employeeCode, companyName, addressCity, locationTimezone } = session.user


    const address = await prisma.companyAddress.findUnique({
        where: { id: addressId },
    })

    const cutoffTime = address?.cutoffTime || "18:00"
    const timezone = address?.timezone || locationTimezone || "Asia/Kolkata"


    const tomorrow = getTomorrowMidnightInTimezone(timezone)

    const menu = await prisma.menu.findUnique({
        where: {
            addressId_date: {
                addressId,
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

    const fullLocationName = `${companyName} - ${addressCity}`

    if (justSubmitted && existingSelection) {
        return (
            <ConfirmationScreen
                employeeCode={employeeCode}
                companyName={fullLocationName}
                status={existingSelection.status}
                preference={existingSelection.preference}
                updatedAt={existingSelection.updatedAt}
            />
        )
    }

    return (
        <MenuScreen
            employeeCode={employeeCode}
            employeeName={session.user.name || "Employee"}
            companyName={fullLocationName}
            cutoffTime={cutoffTime}
            menu={menuData}
            existingSelection={existingSelection}
        />
    )
}
