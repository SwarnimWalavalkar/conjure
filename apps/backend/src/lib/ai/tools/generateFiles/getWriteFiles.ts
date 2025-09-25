import type { File } from "./getContents.js";
import type { Sandbox } from "@vercel/sandbox";
import type { UIMessageStreamWriter, UIMessage } from "ai";
import { getRichError } from "../../../../utils/getRichError.js";
import { emitUIEvent } from "../../../../utils/uiTransport.js";

interface Params {
  sandbox: Sandbox;
  toolCallId: string;
  dataStream: UIMessageStreamWriter;
}

export function getWriteFiles({ sandbox, toolCallId, dataStream }: Params) {
  return async function writeFiles(params: {
    written: string[];
    files: File[];
    paths: string[];
  }) {
    const paths = params.written.concat(params.files.map((file) => file.path));
    emitUIEvent(dataStream, {
      id: toolCallId,
      type: "data-generating-files",
      data: { paths, status: "uploading" },
    });

    try {
      await sandbox.writeFiles(
        params.files.map((file) => ({
          content: Buffer.from(file.content, "utf8"),
          path: file.path,
        }))
      );
    } catch (error) {
      const richError = getRichError({
        action: "write files to sandbox",
        args: params,
        error,
      });

      emitUIEvent(dataStream, {
        id: toolCallId,
        type: "data-generating-files",
        data: {
          error: { message: richError.error.message },
          status: "error",
          paths: params.paths,
        },
      });

      return richError.message;
    }

    emitUIEvent(dataStream, {
      id: toolCallId,
      type: "data-generating-files",
      data: { paths, status: "uploaded" },
    });
  };
}
