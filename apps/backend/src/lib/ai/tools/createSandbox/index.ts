import type { UIMessageStreamWriter, UIMessage } from "ai";
import { Sandbox } from "@vercel/sandbox";
import { tool } from "ai";
import z from "zod/v3";
import { getRichError } from "../../../../utils/getRichError.js";
import { emitUIEvent } from "../../../../utils/uiTransport.js";
import prompt from "./prompt.js";

interface Params {
  dataStream: UIMessageStreamWriter;
}

export const createSandbox = ({ dataStream }: Params) =>
  tool({
    description: prompt(),
    inputSchema: z.object({
      timeout: z
        .number()
        .min(300000)
        .max(2700000)
        .optional()
        .describe(
          "Maximum time in milliseconds the sandbox will remain active before automatically shutting down. The sandbox will terminate all running processes when this timeout is reached."
        ),
    }),
    execute: async ({ timeout }, { toolCallId }) => {
      emitUIEvent(dataStream, {
        id: toolCallId,
        type: "data-create-sandbox",
        data: { status: "loading" },
      });

      try {
        const sandbox = await Sandbox.create({
          timeout: timeout ?? 300_000,
        });

        emitUIEvent(dataStream, {
          id: toolCallId,
          type: "data-create-sandbox",
          data: { sandboxId: sandbox.sandboxId, status: "done" },
        });

        return (
          `Sandbox created with ID: ${sandbox.sandboxId}.` +
          `\nYou can now upload files, run commands, and access services on the exposed ports.`
        );
      } catch (error) {
        const richError = getRichError({
          action: "Creating Sandbox",
          error,
        });

        emitUIEvent(dataStream, {
          id: toolCallId,
          type: "data-create-sandbox",
          data: {
            error: { message: richError.error.message },
            status: "error",
          },
        });

        console.log("Error creating Sandbox:", richError.error);
        return richError.message;
      }
    },
  });
