import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { setDefaultResultOrder } from "node:dns";
import { Agent, ProxyAgent, setGlobalDispatcher } from "undici";
import config from "./config/index.js";
import { cors } from "hono/cors";
import { isDevelopment, isProduction } from "./config/getEnv.js";

import chat from "./api/chat.js";
import sandbox from "./api/sandbox.js";

const app = new Hono();

// Prefer IPv4 to avoid undici/Node fetch ETIMEDOUT on some networks
setDefaultResultOrder("ipv4first");
setGlobalDispatcher(new Agent({ connect: { family: 4 } }));

app.get("/health", async (c) => {
  return c.json({
    status: "ok",
    version:
      process.env.npm_package_version ??
      (await import("../package.json").catch(() => undefined))?.default.version,
  });
});

app.use(
  "/api/*",
  cors({
    origin: "*",
  })
);

app.route("/api/v1/chat", chat);
app.route("/api/v1/sandbox", sandbox);

const server = serve(
  {
    fetch: app.fetch,
    port: Number(config.PORT),
  },
  (info) => {
    console.log(`Server listening on port ${info.port}`);
  }
);

let isShuttingDown = false;
const SHUTDOWN_TIMEOUT_MS = 10000;

const shutdown = (signal: NodeJS.Signals) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

  const forceExit = setTimeout(() => {
    console.error("Forced shutdown after timeout.");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  server.close(async () => {
    try {
      // close stateful connections
    } finally {
      clearTimeout(forceExit);
      console.log("Shutdown complete. Exiting.");
      process.exit(0);
    }
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export default app;
