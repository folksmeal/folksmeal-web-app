import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  getTomorrowMidnightInTimezone,
  isPastCutoffInTimezone,
} from "@/lib/utils/time"
import { z } from "zod"
import {
  apiResponse,
  apiError,
  handleApiRequest,
  parseBody,
  ApiRequestError,
} from "@/lib/api-utils"

const mealSelectionSchema = z
  .object({
    status: z.enum(["OPT_IN", "OPT_OUT"]),
    preference: z.enum(["VEG", "NONVEG"]).nullable().optional(),
  })
  .refine(
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

export async function GET() {
  return handleApiRequest(async () => {
    const session = await auth()
    if (!session?.user) {
      return apiError("Unauthorized", 401)
    }

    const sessionUser = session.user
    const timezone = sessionUser.locationTimezone || "Asia/Kolkata"
    const tomorrow = getTomorrowMidnightInTimezone(timezone)

    const selection = await prisma.mealSelection.findUnique({
      where: {
        employeeId_date: {
          employeeId: sessionUser.id!,
          date: tomorrow,
        },
      },
    })

    if (!selection) {
      return apiResponse({ selection: null })
    }

    return apiResponse({
      selection: {
        status: selection.status,
        preference: selection.preference,
        updatedAt: selection.updatedAt.toISOString(),
      },
    })
  })
}

export async function POST(request: NextRequest) {
  return handleApiRequest(async () => {
    const session = await auth()
    if (!session?.user) {
      return apiError("Unauthorized", 401)
    }

    const { status, preference } = await parseBody(request, mealSelectionSchema)
    const { addressId } = session.user

    if (!addressId) {
      throw new ApiRequestError("No location assigned to your account", 400, "NO_LOCATION")
    }

    const address = await prisma.companyAddress.findUnique({
      where: { id: addressId },
    })

    if (!address) {
      return apiError("Location not found", 404, "LOCATION_NOT_FOUND")
    }

    const timezone = address.timezone || "Asia/Kolkata"
    const tomorrow = getTomorrowMidnightInTimezone(timezone)

    if (
      address.workingDays &&
      !address.workingDays.includes(tomorrow.getDay())
    ) {
      return apiError(
        "Tomorrow is a non-working day. Meal selection is disabled.",
        403,
        "NON_WORKING_DAY"
      )
    }

    if (isPastCutoffInTimezone(address.cutoffTime, timezone)) {
      return apiError(
        `Cutoff time (${address.cutoffTime}) has passed. Selection is locked.`,
        403,
        "CUTOFF_PASSED"
      )
    }

    if (status === "OPT_IN") {
      const menu = await prisma.menu.findUnique({
        where: {
          addressId_date: {
            addressId,
            date: tomorrow,
          },
        },
      })

      if (!menu) {
        return apiError("No menu available for tomorrow.", 400, "NO_MENU")
      }

      if (preference === "NONVEG" && !menu.nonvegItem) {
        return apiError(
          "Non-veg option is not available for tomorrow.",
          400,
          "NONVEG_UNAVAILABLE"
        )
      }
    }

    const selection = await prisma.mealSelection.upsert({
      where: {
        employeeId_date: {
          employeeId: session.user.id!,
          date: tomorrow,
        },
      },
      update: {
        status,
        preference: status === "OPT_IN" ? preference : null,
      },
      create: {
        employeeId: session.user.id!,
        date: tomorrow,
        status,
        preference: status === "OPT_IN" ? preference : null,
      },
    })

    return apiResponse({
      success: true,
      selection: {
        status: selection.status,
        preference: selection.preference,
        updatedAt: selection.updatedAt.toISOString(),
      },
    })
  })
}
