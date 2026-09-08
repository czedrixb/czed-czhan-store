export default defineNitroPlugin(async () => {
  await runMigrations()
})
