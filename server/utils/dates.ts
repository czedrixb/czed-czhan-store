/**
 * The store operates in the Philippines. Business days, weeks, and months must
 * be computed in Asia/Manila local time — never in server-local/UTC time,
 * which on Vercel is UTC and would roll the "business day" over at 8am Manila.
 *
 * The Philippines has a single fixed UTC+8 offset with no DST, so this can be
 * done with plain arithmetic instead of full IANA timezone machinery.
 */

export const STORE_TZ = 'Asia/Manila'
const STORE_UTC_OFFSET_MS = 8 * 60 * 60 * 1000

export interface DateRange {
  start: Date
  end: Date
}

function toStoreParts(date: Date) {
  const shifted = new Date(date.getTime() + STORE_UTC_OFFSET_MS)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    /** 0 = Sunday ... 6 = Saturday, in store-local time. */
    weekday: shifted.getUTCDay(),
  }
}

function storeDateToUtc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day, 0, 0, 0) - STORE_UTC_OFFSET_MS)
}

/** The UTC instant corresponding to 00:00 store-local time on the given instant's day. */
export function startOfStoreDay(date: Date = new Date()): Date {
  const { year, month, day } = toStoreParts(date)
  return storeDateToUtc(year, month, day)
}

export function storeDayRange(date: Date = new Date()): DateRange {
  const start = startOfStoreDay(date)
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) }
}

/** Monday-start week containing the given instant, in store-local time. */
export function storeWeekRange(date: Date = new Date()): DateRange {
  const { year, month, day, weekday } = toStoreParts(date)
  const daysSinceMonday = (weekday + 6) % 7
  const monday = storeDateToUtc(year, month, day)
  const start = new Date(monday.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000)
  return { start, end: new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000) }
}

export function storeMonthRange(date: Date = new Date()): DateRange {
  const { year, month } = toStoreParts(date)
  const start = storeDateToUtc(year, month, 1)
  const end = month === 11 ? storeDateToUtc(year + 1, 0, 1) : storeDateToUtc(year, month + 1, 1)
  return { start, end }
}

export function storeDateKey(date: Date = new Date()): string {
  const { year, month, day } = toStoreParts(date)
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Resolves the `range`/`start`/`end` query params used by the sales history
 * and reports endpoints into a concrete store-local date range.
 */
export function resolveDateRangeFromQuery(query: Record<string, unknown>): DateRange {
  const range = typeof query.range === 'string' ? query.range : 'today'

  switch (range) {
    case 'yesterday': {
      const today = storeDayRange()
      return { start: new Date(today.start.getTime() - 24 * 60 * 60 * 1000), end: today.start }
    }
    case 'week':
      return storeWeekRange()
    case 'month':
      return storeMonthRange()
    case 'custom': {
      const start = typeof query.start === 'string' ? new Date(query.start) : undefined
      const end = typeof query.end === 'string' ? new Date(query.end) : undefined
      if (!start || Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) {
        throw createError({ statusCode: 400, statusMessage: 'range=custom requires valid start and end query params' })
      }
      return { start: startOfStoreDay(start), end: new Date(startOfStoreDay(end).getTime() + 24 * 60 * 60 * 1000) }
    }
    case 'today':
    default:
      return storeDayRange()
  }
}
