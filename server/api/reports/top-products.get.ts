export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const limit = Math.min(Number(query.limit) || 10, 50)
  const range = resolveDateRangeFromQuery(query)

  return getTopProducts(range, limit)
})
