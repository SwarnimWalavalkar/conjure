import type { ModelMessage, UIMessageStreamWriter } from "ai";
import { deepResearch } from "./deepResearch/index.js";
import { createSandbox } from "./createSandbox/index.js";
import { generateFiles } from "./generateFiles/index.js";
import { getSandboxURL } from "./getSandboxURL/getSandboxURL.js";
import { runCommand } from "./runCommand/runCommand.js";

export function getTools({
  dataStream,
  messageId,
  messages,
}: {
  dataStream: UIMessageStreamWriter;
  messageId: string;
  messages: Array<ModelMessage>;
}) {
  return {
    deepResearch: deepResearch({ dataStream, messageId, messages }),
    createSandbox: createSandbox({ dataStream }),
    generateFiles: generateFiles({ dataStream }),
    runCommand: runCommand({ dataStream }),
    getSandboxURL: getSandboxURL({ dataStream }),
  };
}
