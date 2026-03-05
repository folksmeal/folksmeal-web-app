/**
 * Utility functions for handling Timezones safely across the application
 * avoiding Node.js server local timezone leaks.
 */

/**
 * Returns a new Date object representing "tomorrow at midnight" 
 * relative to the provided IANA timezone string.
 * This ensures that a global server correctly evaluates "tomorrow" for a local office.
 */
export function getTomorrowMidnightInTimezone(timezone: string = "UTC"): Date {
    // Current date/time in the target timezone
    const nowStr = new Date().toLocaleString("en-US", { timeZone: timezone })
    const localNow = new Date(nowStr)

    // Add 1 day
    localNow.setDate(localNow.getDate() + 1)

    // Set to midnight locally
    localNow.setHours(0, 0, 0, 0)

    // We return this standard JS Date. When stored in Postgres @db.Date, 
    // Prisma will store it as YYYY-MM-DD representing that local midnight.
    return localNow
}

/**
 * Checks if the current time in the given timezone has surpassed the cutoff "HH:MM".
 */
export function isPastCutoffInTimezone(cutoffTime: string, timezone: string = "UTC"): boolean {
    const nowStr = new Date().toLocaleString("en-US", { timeZone: timezone })
    const localNow = new Date(nowStr)

    const [cutoffH, cutoffM] = cutoffTime.split(":").map(Number)

    const currentHour = localNow.getHours()
    const currentMinute = localNow.getMinutes()

    if (currentHour > cutoffH || (currentHour === cutoffH && currentMinute >= cutoffM)) {
        return true
    }

    return false
}
