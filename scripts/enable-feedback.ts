import { z } from "zod"
import { getISTDate, getTodayMidnightInTimezone, getTomorrowMidnightInTimezone } from "@/lib/utils/time"
import { loadEnvConfig } from "@next/env"

loadEnvConfig(process.cwd())

const argsSchema = z.object({
    employeeCode: z.string().min(1),
    vegItem: z.string().min(1).default("Meal (auto-seeded)"),
})

function parseArgs(argv: string[]) {
    const parsed: Record<string, string> = {}
    for (const arg of argv) {
        const [k, ...rest] = arg.split("=")
        if (!k || rest.length === 0) continue
        parsed[k] = rest.join("=")
    }
    return parsed
}

async function main() {
    const { prisma } = await import("@/lib/prisma")

    const raw = parseArgs(process.argv.slice(2))
    const parsed = argsSchema.safeParse({
        employeeCode: raw.employeeCode ?? raw.code,
        vegItem: raw.vegItem,
    })

    if (!parsed.success) {
        console.error(parsed.error.flatten().fieldErrors)
        process.exitCode = 1
        return
    }

    const { employeeCode, vegItem } = parsed.data
    const { dayOfWeek } = getISTDate()

    const employee = await prisma.employee.findUnique({
        where: { employeeCode },
        select: {
            id: true,
            addressId: true,
            defaultPreference: true,
            address: { select: { workingDays: true } },
        },
    })

    if (!employee) {
        console.error(`Employee not found for employeeCode=${employeeCode}`)
        process.exitCode = 1
        return
    }

    const today = getTodayMidnightInTimezone()
    const tomorrow = getTomorrowMidnightInTimezone()

    // Ensure today is considered a working day for this address
    if (!employee.address.workingDays.includes(dayOfWeek)) {
        await prisma.companyAddress.update({
            where: { id: employee.addressId },
            data: { workingDays: { set: [...employee.address.workingDays, dayOfWeek] } },
        })
    }

    // Ensure menu exists for today (needed for promptRating)
    await prisma.menu.upsert({
        where: { addressId_date: { addressId: employee.addressId, date: today } },
        update: {
            vegItem,
            day: "Auto-seeded",
        },
        create: {
            addressId: employee.addressId,
            date: today,
            day: "Auto-seeded",
            vegItem,
            nonvegItem: null,
            sideBeverage: null,
            notes: "Seeded to enable employee feedback screen",
        },
    })

    // Ensure employee opted-in today (needed for promptRating)
    await prisma.mealSelection.upsert({
        where: { employeeId_date: { employeeId: employee.id, date: today } },
        update: {
            status: "OPT_IN",
            preference: employee.defaultPreference,
        },
        create: {
            employeeId: employee.id,
            date: today,
            status: "OPT_IN",
            preference: employee.defaultPreference,
        },
    })

    // Ensure employee has a selection for tomorrow so Dashboard shows ConfirmationScreen (not MenuScreen)
    await prisma.mealSelection.upsert({
        where: { employeeId_date: { employeeId: employee.id, date: tomorrow } },
        update: {
            status: "OPT_IN",
            preference: employee.defaultPreference,
        },
        create: {
            employeeId: employee.id,
            date: tomorrow,
            status: "OPT_IN",
            preference: employee.defaultPreference,
        },
    })

    console.log(
        JSON.stringify(
            {
                ok: true,
                employeeCode,
                employeeId: employee.id,
                addressId: employee.addressId,
                today: today.toISOString(),
                tomorrow: tomorrow.toISOString(),
                note: "Feedback prompt still requires current time >= 14:00 IST",
            },
            null,
            2
        )
    )
}

main().catch((err) => {
    console.error(err)
    process.exitCode = 1
})

