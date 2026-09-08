import { test } from 'node:test'
import assert from 'node:assert/strict'
import { storeDayRange, storeWeekRange, storeMonthRange, storeDateKey } from '../../server/utils/dates'

test('a sale at 23:30 Manila time belongs to that Manila day, not the next UTC day', () => {
  // 2026-09-09 23:30 in Asia/Manila (UTC+8) is 2026-09-09 15:30 UTC.
  const saleInstant = new Date('2026-09-09T15:30:00.000Z')
  const { start, end } = storeDayRange(saleInstant)

  assert.ok(saleInstant >= start && saleInstant < end)
  assert.equal(storeDateKey(start), '2026-09-09')

  // The day boundary (00:00 Manila) is 16:00 UTC the previous day.
  assert.equal(start.toISOString(), '2026-09-08T16:00:00.000Z')
  assert.equal(end.toISOString(), '2026-09-09T16:00:00.000Z')
})

test('a sale just after midnight Manila time does not fall into the previous UTC day', () => {
  // 2026-09-09 00:05 Manila = 2026-09-08 16:05 UTC — still UTC "Sept 8" but Manila "Sept 9".
  const saleInstant = new Date('2026-09-08T16:05:00.000Z')
  assert.equal(storeDateKey(saleInstant), '2026-09-09')
})

test('storeWeekRange starts on Monday store-local time', () => {
  // 2026-09-09 is a Wednesday.
  const { start, end } = storeWeekRange(new Date('2026-09-09T15:30:00.000Z'))
  assert.equal(storeDateKey(start), '2026-09-07') // Monday
  assert.equal(storeDateKey(new Date(end.getTime() - 1)), '2026-09-13') // Sunday
})

test('storeMonthRange spans the full calendar month store-local, including year rollover', () => {
  const { start, end } = storeMonthRange(new Date('2026-12-15T00:00:00.000Z'))
  assert.equal(storeDateKey(start), '2026-12-01')
  assert.equal(storeDateKey(new Date(end.getTime() - 1)), '2026-12-31')
  assert.equal(storeDateKey(end), '2027-01-01')
})
