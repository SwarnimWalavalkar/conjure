"use client";

import { useEffect, useMemo } from "react";
import { Panel, PanelHeader } from "@/components/panels/panels";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useSessionsStore } from "@/lib/chat-sessions";
import { MessageSquare, Plus, Trash2 } from "lucide-react";

export function SessionSidebar({ className }: { className?: string }) {
  const {
    sessionOrder,
    sessionsById,
    selectedId,
    createSession,
    selectSession,
    deleteSession,
    ensureDefaultSession,
  } = useSessionsStore();

  useEffect(() => {
    ensureDefaultSession();
  }, [ensureDefaultSession]);

  const items = useMemo(
    () => sessionOrder.map((id) => sessionsById[id]).filter(Boolean),
    [sessionOrder, sessionsById]
  );

  return (
    <Panel className={className}>
      <PanelHeader>
        <div className="flex items-center font-mono font-semibold uppercase">
          <MessageSquare className="mr-2 w-4" />
          Sessions
        </div>
        <div className="ml-auto">
          <Button size="icon" variant="ghost" onClick={() => createSession()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </PanelHeader>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {items.length === 0 ? (
            <div className="text-xs text-muted-foreground">No sessions yet</div>
          ) : (
            items.map((session) => (
              <div
                key={session.id}
                className={cn(
                  "group flex items-center gap-2 rounded-sm border border-transparent hover:border-border",
                  selectedId === session.id ? "bg-muted/50" : ""
                )}
              >
                <button
                  type="button"
                  onClick={() => selectSession(session.id)}
                  className={cn(
                    "flex-1 truncate text-left p-2 text-xs",
                    selectedId === session.id
                      ? "font-medium"
                      : "text-foreground/90"
                  )}
                  title={session.title || "New Chat"}
                >
                  {session.title || "New Chat"}
                </button>
                <button
                  type="button"
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground"
                  onClick={() => deleteSession(session.id)}
                  aria-label="Delete session"
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
