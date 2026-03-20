const IST = 'Asia/Kolkata'

/**
 * Returns a formatter for a specific timezone and configuration.
 */
function getFormatter(options: Intl.DateTimeFormatOptions, timezone: string = IST) {
    return new Intl.DateTimeFormat('en-US', {
        ...options,
        timeZone: timezone,
    })
}

/**
 * Returns the current date interpreted in IST.
 */
export function getISTDate(): {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    dayOfWeek: number;
} {
    const now = new Date()
    const formatter = getFormatter({
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        weekday: 'narrow', // We'll get numerical day from a different part
        hour12: false,
    })

    const parts = formatter.formatToParts(now)
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value

    const year = parseInt(getPart('year')!)
    const month = parseInt(getPart('month')!) - 1 // 0-indexed
    const day = parseInt(getPart('day')!)
    const hour = parseInt(getPart('hour')!)
    const minute = parseInt(getPart('minute')!)
    const second = parseInt(getPart('second')!)
    const dayOfWeek = new Date(Date.UTC(year, month, day)).getUTCDay()

    return {
        year,
        month,
        day,
        hour,
        minute,
        second,
        dayOfWeek
    }
}

/**
 * Returns today's date string in YYYY-MM-DD format based on IST.
 */
export function getISTDateString(date: Date = new Date()): string {
    const formatter = getFormatter({
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    })

    const parts = formatter.formatToParts(date)
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value

    return `${getPart('year')}-${getPart('month')}-${getPart('day')}`
}

/**
 * Returns the current hour in IST (0-23).
 */
export function getISTHours(): number {
    const { hour } = getISTDate()
    return hour
}

/**
 * Returns tomorrow's date at midnight UTC, calculated relative to IST.
 */
export function getTomorrowMidnightInTimezone(_timezone: string = IST): Date {
    const { year, month, day } = getISTDate()
    const utcMidnight = new Date(Date.UTC(year, month, day))
    utcMidnight.setUTCDate(utcMidnight.getUTCDate() + 1)
    return utcMidnight
}

/**
 * Returns today's date at midnight UTC, calculated relative to IST.
 */
export function getTodayMidnightInTimezone(_timezone: string = IST): Date {
    const { year, month, day } = getISTDate()
    return new Date(Date.UTC(year, month, day))
}

/**
 * Checks if the current time in IST is past the cutoff time (HH:MM).
 */
export function isPastCutoffInTimezone(cutoffTime: string, _timezone: string = IST): boolean {
    const { hour, minute } = getISTDate()
    const [cutoffH, cutoffM] = cutoffTime.split(':').map(Number)
    return hour > cutoffH || (hour === cutoffH && minute >= cutoffM)
}
