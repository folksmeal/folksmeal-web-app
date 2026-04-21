export const IST_TIMEZONE = 'Asia/Kolkata' as const
const IST = IST_TIMEZONE

type ISTWeekdayStyle = 'short' | 'long' | 'narrow'

/**
 * Returns a formatter for a specific timezone and configuration.
 */
function getFormatter(options: Intl.DateTimeFormatOptions, timezone: string = IST) {
    return new Intl.DateTimeFormat('en-US', {
        ...options,
        timeZone: timezone,
    })
}

function parseYMD(ymd: string): { y: number; m: number; d: number } {
    const [yRaw, mRaw, dRaw] = ymd.split('-')
    const y = Number(yRaw)
    const m = Number(mRaw)
    const d = Number(dRaw)
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
        throw new Error(`Invalid YYYY-MM-DD date string: ${ymd}`)
    }
    return { y, m, d }
}

/**
 * When you only have a date (no time), anchor it at noon UTC to avoid
 * accidental day shifts around timezone boundaries.
 */
function toUTCNoonFromYMD(ymd: string): Date {
    const { y, m, d } = parseYMD(ymd)
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
}

export function formatInIST(date: Date, options: Intl.DateTimeFormatOptions): string {
    return getFormatter(options, IST).format(date)
}

export function formatYMDInIST(
    ymd: string,
    options: Intl.DateTimeFormatOptions
): string {
    return formatInIST(toUTCNoonFromYMD(ymd), options)
}

export function formatISOInIST(
    iso: string,
    options: Intl.DateTimeFormatOptions
): string {
    return formatInIST(new Date(iso), options)
}

export function formatISTDisplayDate(ymd: string): string {
    return formatYMDInIST(ymd, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    })
}

export function formatISTDisplayDateWithWeekday(ymd: string): string {
    return formatYMDInIST(ymd, {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    })
}

export function formatISTDisplayDayName(date: Date, style: ISTWeekdayStyle = 'long'): string {
    return formatInIST(date, { weekday: style })
}

export function formatISTDisplayMonthDay(date: Date): string {
    return formatInIST(date, { day: '2-digit', month: 'short' })
}

export function formatISTDisplayMonthDayYear(date: Date): string {
    return formatInIST(date, { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatISTDisplayRange(start: Date, end: Date): string {
    const left = formatISTDisplayMonthDay(start)
    const right = formatISTDisplayMonthDayYear(end)
    return `${left} - ${right}`
}

export function formatISTDisplayDateTime(iso: string): string {
    return formatISOInIST(iso, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
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

export function addDaysToISTDateString(ymd: string, days: number): string {
    const base = toUTCNoonFromYMD(ymd)
    base.setUTCDate(base.getUTCDate() + days)
    return getISTDateString(base)
}

export function getISTTomorrowDateString(): string {
    return addDaysToISTDateString(getISTDateString(), 1)
}

export function getISTYearMonth(date: Date = new Date()): string {
    return formatInIST(date, {
        year: "numeric",
        month: "2-digit",
    })
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
