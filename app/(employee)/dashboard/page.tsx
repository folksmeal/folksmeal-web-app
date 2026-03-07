import { auth } from "@/lib/auth"
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
    if (!session?.user) return null

    const { addressId, employeeCode, companyName, addressCity, locationTimezone } = session.user

    const timezone = locationTimezone || "Asia/Kolkata"
    const tomorrow = getTomorrowMidnightInTimezone(timezone)

    const [address, menu, selection] = await Promise.all([
        prisma.companyAddress.findUnique({
            where: { id: addressId },
        }),
        prisma.menu.findUnique({
            where: { addressId_date: { addressId, date: tomorrow } },
        }),
        prisma.mealSelection.findUnique({
            where: { employeeId_date: { employeeId: session.user.id, date: tomorrow } },
        }),
    ])

    const cutoffTime = address?.cutoffTime || "18:00"

    const menuData = menu
        ? {
            date: menu.date.toISOString(),
            day: menu.day,
            vegItem: menu.vegItem,
            nonvegItem: menu.nonvegItem,
            sideBeverage: menu.sideBeverage,
            notes: menu.notes,
            available: true,
            isWorkingDay: address?.workingDays.includes(tomorrow.getUTCDay()) ?? true,
        }
        : {
            date: tomorrow.toISOString(),
            day: null,
            vegItem: null,
            nonvegItem: null,
            sideBeverage: null,
            notes: null,
            available: false,
            isWorkingDay: address?.workingDays.includes(tomorrow.getUTCDay()) ?? true,
        }

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
        const today = new Date()
        today.setMinutes(today.getMinutes() - today.getTimezoneOffset())
        const todayStr = today.toISOString().split("T")[0]

        const existingRating = await prisma.mealRating.findUnique({
            where: {
                employeeId_date: {
                    employeeId: session.user.id,
                    date: new Date(todayStr + "T00:00:00.000Z"),
                },
            },
        })

        return (
            <ConfirmationScreen
                employeeCode={employeeCode}
                companyName={fullLocationName}
                status={existingSelection.status}
                preference={existingSelection.preference}
                updatedAt={existingSelection.updatedAt}
                mealDate={tomorrow.toISOString().split("T")[0]}
                existingRating={existingRating ? { rating: existingRating.rating, comment: existingRating.comment } : null}
            />
        )
    }

    return (
        <MenuScreen
            employeeCode={employeeCode}
            employeeName={session.user.name || "Employee"}
            companyName={fullLocationName}
            timezone={timezone}
            cutoffTime={cutoffTime}
            menu={menuData}
            existingSelection={existingSelection}
        />
    )
}
