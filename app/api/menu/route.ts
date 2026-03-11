import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getTomorrowMidnightInTimezone } from "@/lib/utils/time"
import { apiResponse, apiError, handleApiRequest } from "@/lib/api-utils"

export async function GET() {
    return handleApiRequest(async () => {
        const session = await auth()
        if (!session?.user) {
            return apiError("Unauthorized", 401)
        }

        const { addressId } = session.user
        if (!addressId) {
            return apiError("No location assigned", 400)
        }

        // Use the employee's timezone for accurate "tomorrow" calculation
        const timezone = session.user.locationTimezone || "Asia/Kolkata"
        const tomorrow = getTomorrowMidnightInTimezone(timezone)

        const menu = await prisma.menu.findUnique({
            where: {
                addressId_date: {
                    addressId,
                    date: tomorrow,
                },
            },
        })

        if (!menu) {
            return apiResponse({
                date: tomorrow.toISOString(),
                vegItem: null,
                nonvegItem: null,
                available: false,
            })
        }

        return apiResponse({
            date: menu.date.toISOString(),
            vegItem: menu.vegItem,
            nonvegItem: menu.nonvegItem,
            sideBeverage: menu.sideBeverage,
            notes: menu.notes,
            available: true,
        })
    })
}