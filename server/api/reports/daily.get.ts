export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const date = typeof query.date === 'string' ? new Date(query.date) : new Date()
  if (Number.isNaN(date.getTime())) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid date' })
  }

  const range = storeDayRange(date)
  const totals = await getSalesTotals(range)

  return { date: storeDateKey(date), ...totals }
})
