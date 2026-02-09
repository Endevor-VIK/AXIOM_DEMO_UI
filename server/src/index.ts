import { buildApp, config } from './app'

const app = await buildApp()

app.listen({ port: config.port, host: config.host })
  .then((address) => {
    app.log.info(`API ready at ${address}`)
  })
  .catch((err) => {
    app.log.error(err)
    process.exit(1)
  })
