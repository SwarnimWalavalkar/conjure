import { Hono } from "hono";
import type { Variables } from "../types/hono.js";
import { Sandbox } from "@vercel/sandbox";

const app = new Hono<{ Variables: Variables }>();

// GET /api/v1/sandboxes/:sandboxId/files?path=...
app.get("/:sandboxId/files", async (c) => {
  const sandboxId = c.req.param("sandboxId");
  const path = c.req.query("path");

  if (!path) {
    return c.json({ error: "Missing required query param 'path'" }, 400);
  }

  const sandbox = await Sandbox.get({ sandboxId });
  const fileStream = await sandbox.readFile({ path });

  if (!fileStream) {
    return c.json({ error: "File not found in the Sandbox" }, 404);
  }

  const stream = new ReadableStream({
    async pull(controller) {
      for await (const chunk of fileStream) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });

  return new Response(stream);
});

// GET /api/v1/sandboxes/:sandboxId/cmds/:cmdId/logs -> NDJSON stream
app.get("/:sandboxId/cmds/:cmdId/logs", async (c) => {
  const sandboxId = c.req.param("sandboxId");
  const cmdId = c.req.param("cmdId");
  const encoder = new TextEncoder();

  const sandbox = await Sandbox.get({ sandboxId });
  const command = await sandbox.getCommand(cmdId);

  const stream = new ReadableStream({
    async pull(controller) {
      for await (const logline of command.logs()) {
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              data: logline.data,
              stream: logline.stream,
              timestamp: Date.now(),
            }) + "\n"
          )
        );
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
});

// GET /api/v1/sandboxes/:sandboxId/cmds/:cmdId -> command status
app.get("/:sandboxId/cmds/:cmdId", async (c) => {
  const sandboxId = c.req.param("sandboxId");
  const cmdId = c.req.param("cmdId");

  const sandbox = await Sandbox.get({ sandboxId });
  const command = await sandbox.getCommand(cmdId);

  const done = await command.wait().catch(() => null);
  return c.json({
    sandboxId: sandbox.sandboxId,
    cmdId: command.cmdId,
    startedAt: command.startedAt,
    exitCode: done?.exitCode,
  });
});

export default app;
