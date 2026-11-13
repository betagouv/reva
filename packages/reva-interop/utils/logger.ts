import { pino } from "pino";

// Standalone logger for code running outside a Fastify request (e.g. cron jobs).
// Mirrors the Fastify logger transport configured in app.ts.
const datadogApiKey = process.env.DATADOG_API_KEY;

export const logger = pino({
  level: process.env.NODE_ENV === "test" ? "silent" : "info",
  transport: datadogApiKey
    ? {
        targets: [
          {
            target: "pino-datadog-transport",
            level: "info",
            options: {
              ddClientConf: { authMethods: { apiKeyAuth: datadogApiKey } },
              ddServerConf: { site: "datadoghq.eu" },
            },
          },
          { target: "pino/file", level: "info", options: {} },
        ],
      }
    : undefined,
});
