/**
 * Utility functions for handling Timezones safely across the application
 * avoiding Node.js server local timezone leaks.
 */

/**
 * Returns a new Date object representing "tomorrow at midnight" UTC
 * relative to the provided IANA timezone string.
 * This ensures that a global server correctly evaluates "tomorrow" for a local office.
 */
export function getTomorrowMidnightInTimezone(timezone: string = "Asia/Kolkata"): Date {
    const now = new Date()

    // Get components in target timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
    })

    const parts = formatter.formatToParts(now)
    const getPart = (type: string) => parts.find(p => p.type === type)?.value

    const year = parseInt(getPart('year')!)
    const month = parseInt(getPart('month')!) - 1 // JS months are 0-indexed
    const day = parseInt(getPart('day')!)

    // Create "today" at midnight UTC in that timezone
    const localDate = new Date(Date.UTC(year, month, day))

    // Add 1 day to get "tomorrow"
    localDate.setUTCDate(localDate.getUTCDate() + 1)

    return localDate
}

/**
 * Checks if the current time in the given timezone has surpassed the cutoff "HH:MM".
 */
export function isPastCutoffInTimezone(cutoffTime: string, timezone: string = "Asia/Kolkata"): boolean {
    const now = new Date()

    // Get hours and minutes in target timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
    })

    const parts = formatter.formatToParts(now)
    const getPart = (type: string) => parts.find(p => p.type === type)?.value

    const currentHour = parseInt(getPart('hour')!)
    const currentMinute = parseInt(getPart('minute')!)

    const [cutoffH, cutoffM] = cutoffTime.split(":").map(Number)

    if (currentHour > cutoffH || (currentHour === cutoffH && currentMinute >= cutoffM)) {
        return true
    }

    return false
}
