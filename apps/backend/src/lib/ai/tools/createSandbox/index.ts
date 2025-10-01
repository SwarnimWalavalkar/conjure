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

        try {
          const listCommand = await sandbox.runCommand(
            "find . -type f -not -path '*/.*' 2>/dev/null || true"
          );
          const result = await listCommand.wait();

          if (result.exitCode === 0) {
            const outputText = await result.output();
            const paths = outputText
              .split("\n")
              .map((line: string) => line.trim())
              .filter(
                (line: string) => line.length > 0 && line.startsWith("./")
              )
              .map((line: string) => line.substring(2)); // Remove leading "./"

            if (paths.length > 0) {
              emitUIEvent(dataStream, {
                id: toolCallId,
                type: "data-generating-files",
                data: { paths, status: "uploaded" },
              });
            }
          }
        } catch (listError) {
          console.error("Could not list initial sandbox files:", listError);
        }

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
