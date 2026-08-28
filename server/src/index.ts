import { buildApp } from "./app.js"
import { config } from "./config.js"

async function start() {
  const app = buildApp()

  try {
    const address = await app.listen({
      port: config.PORT,
      host: "0.0.0.0",
    })
    app.log.info(`🚀 Servidor backend Ana Corso rodando em ${address}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
