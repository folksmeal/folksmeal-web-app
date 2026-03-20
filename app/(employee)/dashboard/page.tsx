import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { MenuScreen } from "@/components/employee/menu-screen"
import { ConfirmationScreen } from "@/components/employee/confirmation-screen"
import { getTomorrowMidnightInTimezone, getTodayMidnightInTimezone, getISTDate, getISTDateString } from "@/lib/utils/time"
import { redirect } from "next/navigation"

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ submitted?: string, edit?: string }>
}) {
    const session = await auth()
    if (!session?.user) redirect("/")

    interface AuthenticatedUser {
        id: string;
        name: string | null;
        role: string;
        addressId: string;
        employeeCode: string;
        companyName: string;
        companyIcon?: string | null;
        addressCity: string;
        locationTimezone: string;
    }

    const { id, addressId, employeeCode, companyName, companyIcon, addressCity, locationTimezone } = session.user as AuthenticatedUser

    const timezone = locationTimezone || "Asia/Kolkata"
    const tomorrow = getTomorrowMidnightInTimezone(timezone)
    const todayMidnight = getTodayMidnightInTimezone(timezone)
    const { hour: currentHourInIST, dayOfWeek } = getISTDate()
    const todayISO = getISTDateString()

    interface MenuWithLibrary {
        date: Date;
        day: string | null;
        vegItem: string;
        nonvegItem: string | null;
        sideBeverage: string | null;
        notes: string | null;
        vegItemRef: { description: string | null } | null;
        nonvegItemRef: { description: string | null } | null;
    }

    const [address, menu, selection, todaySelection, todayMenu] = await Promise.all([
        prisma.companyAddress.findUnique({
            where: { id: addressId },
            select: { cutoffTime: true, workingDays: true },
        }),
        prisma.menu.findUnique({
            where: { addressId_date: { addressId, date: tomorrow } },
            select: { date: true, day: true, vegItem: true, nonvegItem: true, sideBeverage: true, notes: true, vegItemRef: { select: { description: true } }, nonvegItemRef: { select: { description: true } } },
        }) as Promise<MenuWithLibrary | null>,
        prisma.mealSelection.findUnique({
            where: { employeeId_date: { employeeId: id, date: tomorrow } },
            select: { status: true, preference: true, updatedAt: true },
        }),
        prisma.mealSelection.findUnique({
            where: { employeeId_date: { employeeId: id, date: todayMidnight } },
            select: { status: true },
        }),
        prisma.menu.findUnique({
            where: { addressId_date: { addressId, date: todayMidnight } },
            select: { id: true },
        }),
    ])

    const cutoffTime = address?.cutoffTime || "18:00"

    const menuData = menu
        ? {
            date: menu.date.toISOString(),
            day: menu.day,
            vegItem: menu.vegItem,
            vegItemDescription: menu.vegItemRef?.description || null,
            nonvegItem: menu.nonvegItem,
            nonvegItemDescription: menu.nonvegItemRef?.description || null,
            sideBeverage: menu.sideBeverage,
            notes: menu.notes,
            available: true,
            isWorkingDay: address?.workingDays.includes(tomorrow.getUTCDay()) ?? true,
        }
        : {
            date: tomorrow.toISOString(),
            day: null,
            vegItem: null,
            vegItemDescription: null,
            nonvegItem: null,
            nonvegItemDescription: null,
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
    const isEditing = params.edit === "true"
    const fullLocationName = `${companyName} - ${addressCity}`

    if (existingSelection && !isEditing) {
        // Evaluate if the user is eligible to rate TODAY's meal
        const isTodayWorkingDay = address?.workingDays.includes(dayOfWeek) ?? true
        const didOptInToday = todaySelection?.status === "OPT_IN"
        const hasMenuToday = !!todayMenu

        // Is it past 2:00 PM (14:00) in the user's local timezone (IST)?
        const isPast2PM = currentHourInIST >= 14

        const promptRating = isTodayWorkingDay && didOptInToday && hasMenuToday && isPast2PM

        let existingRating = null
        if (promptRating) {
            existingRating = await prisma.mealRating.findUnique({
                where: {
                    employeeId_date: {
                        employeeId: id,
                        date: todayMidnight,
                    },
                },
                select: { rating: true, comment: true },
            })
        }

        return (
            <ConfirmationScreen
                employeeCode={employeeCode}
                status={existingSelection.status}
                preference={existingSelection.preference}
                updatedAt={existingSelection.updatedAt}
                mealDate={todayISO} // Pass today for rating, not tomorrow
                existingRating={existingRating}
                promptRating={promptRating}
            />
        )
    }

    return (
        <MenuScreen
            employeeCode={employeeCode}
            employeeName={session.user.name || "Employee"}
            timezone={timezone}
            cutoffTime={cutoffTime}
            menu={menuData}
            existingSelection={existingSelection}
        />
    )
}
