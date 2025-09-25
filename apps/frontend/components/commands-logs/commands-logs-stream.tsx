"use client";

import { useEffect, useRef } from "react";
import { useSandboxStore } from "@/app/state";
import stripAnsi from "strip-ansi";

type StreamingCommandLogs = Record<
  string,
  AsyncGenerator<{
    data: string;
    stream: "stdout" | "stderr";
    timestamp: number;
  }>
>;

export function CommandLogsStream() {
  const { sandboxId, commands, addLog, upsertCommand } = useSandboxStore();
  const ref = useRef<StreamingCommandLogs>({});

  useEffect(() => {
    if (sandboxId) {
      for (const command of commands.filter(
        (c) => typeof c.exitCode === "undefined"
      )) {
        if (!ref.current[command.cmdId]) {
          const iterator = getCommandLogs(sandboxId, command.cmdId);
          ref.current[command.cmdId] = iterator;
          (async () => {
            for await (const log of iterator) {
              addLog({ sandboxId, cmdId: command.cmdId, log });
            }
            const info = await getCommand(sandboxId, command.cmdId);
            upsertCommand({
              sandboxId: info.sandboxId,
              cmdId: info.cmdId,
              exitCode: info.exitCode ?? 0,
              command: command.command,
              args: command.args,
            });
          })();
        }
      }
    }
  }, [sandboxId, commands, addLog, upsertCommand]);

  return null;
}

async function* getCommandLogs(sandboxId: string, cmdId: string) {
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "");
  const response = await fetch(
    `${backend}/api/v1/sandbox/${sandboxId}/cmds/${cmdId}/logs`,
    {
      headers: { "Content-Type": "application/json" },
    }
  );
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let line = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    line += decoder.decode(value, { stream: true });
    const lines = line.split("\n");
    for (let i = 0; i < lines.length - 1; i++) {
      if (lines[i]) {
        const { data, stream, timestamp } = JSON.parse(lines[i]) as {
          data: string;
          stream: "stdout" | "stderr";
          timestamp: number;
        };
        yield { data: stripAnsi(data), stream, timestamp };
      }
    }
    line = lines[lines.length - 1];
  }
}

async function getCommand(sandboxId: string, cmdId: string) {
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "");
  const response = await fetch(
    `${backend}/api/v1/sandbox/${sandboxId}/cmds/${cmdId}`
  );
  return (await response.json()) as {
    sandboxId: string;
    cmdId: string;
    startedAt: number;
    exitCode?: number;
  };
}
