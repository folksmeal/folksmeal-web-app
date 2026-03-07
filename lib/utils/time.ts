const IST = 'Asia/Kolkata'

/**
 * Returns tomorrow's date at midnight UTC, calculated relative to IST.
 */
export function getTomorrowMidnightInTimezone(_timezone: string = IST): Date {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: IST,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    })

    const parts = formatter.formatToParts(now)
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value

    const year = parseInt(getPart('year')!)
    const month = parseInt(getPart('month')!) - 1
    const day = parseInt(getPart('day')!)

    const localDate = new Date(year, month, day)
    localDate.setDate(localDate.getDate() + 1)

    return new Date(Date.UTC(localDate.getFullYear(), localDate.getMonth(), localDate.getDate()))
}

/**
 * Returns today's date at midnight UTC, calculated relative to IST.
 */
export function getTodayMidnightInTimezone(_timezone: string = IST): Date {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: IST,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    })

    const parts = formatter.formatToParts(now)
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value

    const year = parseInt(getPart('year')!)
    const month = parseInt(getPart('month')!) - 1
    const day = parseInt(getPart('day')!)

    return new Date(Date.UTC(year, month, day))
}

/**
 * Checks if the current time in IST is past the cutoff time (HH:MM).
 */
export function isPastCutoffInTimezone(cutoffTime: string, _timezone: string = IST): boolean {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: IST,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
    })

    const parts = formatter.formatToParts(now)
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value

    const currentHour = parseInt(getPart('hour')!)
    const currentMinute = parseInt(getPart('minute')!)

    const [cutoffH, cutoffM] = cutoffTime.split(':').map(Number)
    return currentHour > cutoffH || (currentHour === cutoffH && currentMinute >= cutoffM)
}
