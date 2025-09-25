"use client";

import { useEffect, useMemo } from "react";
import { Panel, PanelHeader } from "@/components/panels/panels";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useThreadsStore } from "@/lib/chat-threads";
import { MessageSquare, Plus, Trash2 } from "lucide-react";

export function ThreadSidebar({ className }: { className?: string }) {
  const {
    threadOrder,
    threadsById,
    selectedId,
    createThread,
    selectThread,
    deleteThread,
    ensureDefaultThread,
  } = useThreadsStore();

  useEffect(() => {
    ensureDefaultThread();
  }, [ensureDefaultThread]);

  const items = useMemo(
    () => threadOrder.map((id) => threadsById[id]).filter(Boolean),
    [threadOrder, threadsById]
  );

  return (
    <Panel className={className}>
      <PanelHeader>
        <div className="flex items-center font-mono font-semibold uppercase">
          <MessageSquare className="mr-2 w-4" />
          Threads
        </div>
        <div className="ml-auto">
          <Button size="icon" variant="ghost" onClick={() => createThread()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </PanelHeader>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {items.length === 0 ? (
            <div className="text-xs text-muted-foreground">No threads yet</div>
          ) : (
            items.map((thread) => (
              <div
                key={thread.id}
                className={cn(
                  "group flex items-center gap-2 rounded-sm border border-transparent hover:border-border",
                  selectedId === thread.id ? "bg-muted/50" : ""
                )}
              >
                <button
                  type="button"
                  onClick={() => selectThread(thread.id)}
                  className={cn(
                    "flex-1 truncate text-left p-2 text-xs",
                    selectedId === thread.id
                      ? "font-medium"
                      : "text-foreground/90"
                  )}
                  title={thread.title || "New Chat"}
                >
                  {thread.title || "New Chat"}
                </button>
                <button
                  type="button"
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground"
                  onClick={() => deleteThread(thread.id)}
                  aria-label="Delete thread"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Panel>
  );
}
