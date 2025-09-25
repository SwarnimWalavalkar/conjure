"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { ChatUIMessage } from "@/lib/chat-context";

export type ChatThread = {
  id: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatUIMessage[];
};

type ThreadsState = {
  threadsById: Record<string, ChatThread>;
  threadOrder: string[]; // most recent first
  selectedId?: string;
};

type ThreadsActions = {
  createThread: (title?: string) => string;
  selectThread: (id: string) => void;
  renameThread: (id: string, title: string) => void;
  deleteThread: (id: string) => void;
  saveMessages: (id: string, messages: ChatUIMessage[]) => void;
  ensureDefaultThread: () => void;
};

export type ThreadsStore = ThreadsState & ThreadsActions;

const STORAGE_KEY = "conjure.chat.threads.v1";

export const useThreadsStore = create<ThreadsStore>()(
  persist(
    (set, get) => ({
      threadsById: {},
      threadOrder: [],
      selectedId: undefined,

      createThread: (title) => {
        const id = nanoid();
        const now = Date.now();
        const thread: ChatThread = {
          id,
          title: title?.trim() || "New Chat",
          createdAt: now,
          updatedAt: now,
          messages: [],
        };

        set((state) => ({
          threadsById: { ...state.threadsById, [id]: thread },
          threadOrder: [id, ...state.threadOrder],
          selectedId: id,
        }));

        return id;
      },

      selectThread: (id) => {
        const { threadsById } = get();
        if (!threadsById[id]) return;
        set({ selectedId: id });
      },

      renameThread: (id, title) => {
        set((state) => {
          const thread = state.threadsById[id];
          if (!thread) return state;
          const updated: ChatThread = {
            ...thread,
            title: title.trim() || thread.title,
            updatedAt: Date.now(),
          };
          return {
            threadsById: { ...state.threadsById, [id]: updated },
          } as Partial<ThreadsStore>;
        });
      },

      deleteThread: (id) => {
        set((state) => {
          if (!state.threadsById[id]) return state;
          const { [id]: _omit, ...rest } = state.threadsById;
          const order = state.threadOrder.filter((tid) => tid !== id);
          const selectedId =
            state.selectedId === id ? order[0] : state.selectedId;
          return {
            threadsById: rest,
            threadOrder: order,
            selectedId,
          } as Partial<ThreadsStore>;
        });
      },

      saveMessages: (id, messages) => {
        set((state) => {
          const thread = state.threadsById[id];
          if (!thread) return state;

          // Only update the title when the first user message for THIS thread appears
          const threadHadUserMessage = thread.messages.some(
            (m) => m.role === "user"
          );
          const firstUserTitle = deriveTitleFromMessages(messages);
          const shouldSetTitle =
            !threadHadUserMessage &&
            !!firstUserTitle &&
            (!thread.title || thread.title === "New Chat");

          const updated: ChatThread = {
            ...thread,
            messages,
            title: shouldSetTitle ? (firstUserTitle as string) : thread.title,
            updatedAt: Date.now(),
          };
          // move thread to top of order
          const order = [id, ...state.threadOrder.filter((tid) => tid !== id)];
          return {
            threadsById: { ...state.threadsById, [id]: updated },
            threadOrder: order,
          } as Partial<ThreadsStore>;
        });
      },

      ensureDefaultThread: () => {
        const { threadOrder, createThread, selectedId } = get();
        if (threadOrder.length === 0) {
          createThread("New Chat");
        } else if (!selectedId) {
          set({ selectedId: threadOrder[0] });
        }
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      partialize: (state) => ({
        threadsById: state.threadsById,
        threadOrder: state.threadOrder,
        selectedId: state.selectedId,
      }),
    }
  )
);

function deriveTitleFromMessages(
  messages: ChatUIMessage[]
): string | undefined {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return undefined;
  // Attempt to find a text part
  const text = firstUser.parts.find((p) => (p as any).type === "text") as
    | { type: string; text: string }
    | undefined;
  const raw = text?.text?.trim();
  if (!raw) return undefined;
  const title = raw.length > 60 ? raw.slice(0, 57) + "…" : raw;
  return title;
}
