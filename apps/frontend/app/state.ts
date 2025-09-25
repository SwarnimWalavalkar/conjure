import type { ChatStatus } from "ai";
import { create } from "zustand";
import { match } from "@conjure/shared";
import type { UIEvent } from "@conjure/shared";

export interface CommandLog {
  data: string;
  stream: "stdout" | "stderr";
  timestamp: number;
}

export interface Command {
  background?: boolean;
  sandboxId: string;
  cmdId: string;
  startedAt: number;
  command: string;
  args: string[];
  exitCode?: number;
  logs?: CommandLog[];
}

interface SandboxStore {
  addGeneratedFiles: (files: string[]) => void;
  addLog: (data: { sandboxId: string; cmdId: string; log: CommandLog }) => void;
  addPaths: (paths: string[]) => void;
  chatStatus: ChatStatus;
  clearGeneratedFiles: () => void;
  commands: Command[];
  generatedFiles: Set<string>;
  paths: string[];
  sandboxId?: string;
  setChatStatus: (status: ChatStatus) => void;
  setSandboxId: (id: string) => void;
  setStatus: (status: "running" | "stopped") => void;
  setUrl: (url: string, uuid: string) => void;
  status?: "running" | "stopped";
  upsertCommand: (command: Omit<Command, "startedAt">) => void;
  url?: string;
  urlUUID?: string;
}

export const useSandboxStore = create<SandboxStore>()((set) => ({
  addGeneratedFiles: (files) =>
    set((state) => ({
      generatedFiles: new Set([...state.generatedFiles, ...files]),
    })),
  addLog: (data) => {
    set((state) => {
      const idx = state.commands.findIndex((c) => c.cmdId === data.cmdId);
      if (idx === -1) {
        return state;
      }
      const updatedCmds = [...state.commands];
      updatedCmds[idx] = {
        ...updatedCmds[idx],
        logs: [...(updatedCmds[idx].logs ?? []), data.log],
      };
      return { commands: updatedCmds } as Partial<SandboxStore>;
    });
  },
  addPaths: (paths) =>
    set((state) => ({ paths: [...new Set([...state.paths, ...paths])] })),
  chatStatus: "ready",
  clearGeneratedFiles: () => set(() => ({ generatedFiles: new Set<string>() })),
  commands: [],
  generatedFiles: new Set<string>(),
  paths: [],
  setChatStatus: (status) =>
    set((state) =>
      state.chatStatus === status
        ? state
        : ({ chatStatus: status } as Partial<SandboxStore>)
    ),
  setSandboxId: (sandboxId) =>
    set(() => ({
      sandboxId,
      status: "running",
      commands: [],
      paths: [],
      url: undefined,
      generatedFiles: new Set<string>(),
    })),
  setStatus: (status) => set(() => ({ status })),
  setUrl: (url, urlUUID) => set(() => ({ url, urlUUID })),
  upsertCommand: (cmd) => {
    set((state) => {
      const existingIdx = state.commands.findIndex(
        (c) => c.cmdId === cmd.cmdId
      );
      const idx = existingIdx !== -1 ? existingIdx : state.commands.length;
      const prev = state.commands[idx] ?? { startedAt: Date.now(), logs: [] };
      const cmds = [...state.commands];
      cmds[idx] = { ...prev, ...cmd } as Command;
      return { commands: cmds } as Partial<SandboxStore>;
    });
  },
}));

// Map AI SDK UI data parts to our state store
export type ConjureDataPart = UIEvent;

export function useDataStateMapper() {
  const { addPaths, setSandboxId, setUrl, upsertCommand, addGeneratedFiles } =
    useSandboxStore();

  return (data: ConjureDataPart) => {
    match(data, {
      "data-create-sandbox": ({ data }) => {
        if (data.sandboxId) setSandboxId(data.sandboxId);
        return;
      },
      "data-generating-files": ({ data }) => {
        if (data.paths?.length) {
          addPaths(data.paths);
          addGeneratedFiles(data.paths);
        }
        return;
      },
      "data-run-command": ({ data }) => {
        if (
          data.commandId &&
          (data.status === "executing" || data.status === "running")
        ) {
          upsertCommand({
            background: data.status === "running",
            sandboxId: data.sandboxId,
            cmdId: data.commandId,
            command: data.command,
            args: data.args,
          });
        }
        return;
      },
      "data-get-sandbox-url": ({ data }) => {
        if (data.url) setUrl(data.url, crypto.randomUUID());
        return;
      },
      "data-researchUpdate": () => {
        return; // UI-driven only currently
      },
      _: () => {
        return; // ignore others
      },
    });
  };
}
