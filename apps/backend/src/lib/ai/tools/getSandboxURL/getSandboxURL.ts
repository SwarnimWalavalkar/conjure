import type { UIMessageStreamWriter, UIMessage } from "ai";
import { Sandbox } from "@vercel/sandbox";
import { tool } from "ai";
import z from "zod/v3";
import { emitUIEvent } from "../../../../utils/uiTransport.js";

interface Params {
  dataStream: UIMessageStreamWriter;
}

export const getSandboxURL = ({ dataStream }: Params) =>
  tool({
    description: "Use this tool to get the URL of a sandbox",
    inputSchema: z.object({
      sandboxId: z
        .string()
        .describe(
          "The unique identifier of the Vercel Sandbox (e.g., 'sbx_abc123xyz'). This ID is returned when creating a Vercel Sandbox and is used to reference the specific sandbox instance."
        ),
      port: z
        .number()
        .describe(
          "The port number where a service is running inside the Vercel Sandbox (e.g., 3000 for Next.js dev server, 8000 for Python apps, 5000 for Flask). The port must have been exposed when the sandbox was created or when running commands."
        ),
    }),
    execute: async ({ sandboxId, port }, { toolCallId }) => {
      emitUIEvent(dataStream, {
        id: toolCallId,
        type: "data-get-sandbox-url",
        data: { status: "loading" },
      });

      const sandbox = await Sandbox.get({ sandboxId });
      const url = sandbox.domain(port);

      emitUIEvent(dataStream, {
        id: toolCallId,
        type: "data-get-sandbox-url",
        data: { url, status: "done" },
      });

      return { url };
    },
  });
