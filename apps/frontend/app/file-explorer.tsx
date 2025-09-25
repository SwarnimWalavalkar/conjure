"use client";

import { FileExplorer as FileExplorerComponent } from "@/components/file-explorer/file-explorer";
import { useSandboxStore } from "./state";

export function FileExplorer({ className }: { className?: string }) {
  const { sandboxId, status, paths } = useSandboxStore();
  return (
    <FileExplorerComponent
      className={className || ""}
      disabled={status === "stopped"}
      sandboxId={sandboxId}
      paths={paths}
    />
  );
}
