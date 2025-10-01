import type { UIMessageStreamWriter, UIMessage } from "ai";
import { Sandbox } from "@vercel/sandbox";
import { getContents, type File } from "./getContents.js";
import { getRichError } from "./../../../../utils/getRichError.js";
import { tool } from "ai";
import z from "zod/v3";
import { getWriteFiles } from "./getWriteFiles.js";
import { emitUIEvent } from "../../../../utils/uiTransport.js";
import prompt from "./prompt.js";

interface Params {
  dataStream: UIMessageStreamWriter;
}

export const generateFiles = ({ dataStream }: Params) =>
  tool({
    description: prompt(),
    inputSchema: z.object({
      sandboxId: z.string(),
      paths: z.array(z.string()),
    }),
    execute: async ({ sandboxId, paths }, { toolCallId, messages }) => {
      emitUIEvent(dataStream, {
        id: toolCallId,
        type: "data-generating-files",
        data: { paths: [], status: "generating" },
      });

      let sandbox: Sandbox | null = null;

      try {
        sandbox = await Sandbox.get({ sandboxId });
      } catch (error) {
        const richError = getRichError({
          action: "get sandbox by id",
          args: { sandboxId },
          error,
        });

        emitUIEvent(dataStream, {
          id: toolCallId,
          type: "data-generating-files",
          data: {
            error: { message: richError.error.message },
            paths: [],
            status: "error",
          },
        });

        return richError.message;
      }

      const writeFiles = getWriteFiles({ sandbox, toolCallId, dataStream });
      const iterator = getContents({ messages, paths });
      const uploaded: File[] = [];

      try {
        for await (const chunk of iterator) {
          if (chunk.files.length > 0) {
            const error = await writeFiles(chunk);
            if (error) {
              return error;
            } else {
              uploaded.push(...chunk.files);
            }
          } else {
            emitUIEvent(dataStream, {
              id: toolCallId,
              type: "data-generating-files",
              data: {
                status: "generating",
                paths: chunk.paths,
              },
            });
          }
        }
      } catch (error) {
        const richError = getRichError({
          action: "generate file contents",
          args: { paths },
          error,
        });

        emitUIEvent(dataStream, {
          id: toolCallId,
          type: "data-generating-files",
          data: {
            error: { message: richError.error.message },
            status: "error",
            paths,
          },
        });

        return richError.message;
      }

      emitUIEvent(dataStream, {
        id: toolCallId,
        type: "data-generating-files",
        data: { paths: uploaded.map((file) => file.path), status: "done" },
      });

      return `Successfully generated and uploaded ${
        uploaded.length
      } files. Their paths and contents are as follows:
        ${uploaded
          .map((file) => `Path: ${file.path}\nContent: ${file.content}\n`)
          .join("\n")}`;
    },
  });
