"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { ChatUIMessage } from "@/lib/chat-context";

export type ChatSession = {
  id: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatUIMessage[];
};

type SessionsState = {
  sessionsById: Record<string, ChatSession>;
  sessionOrder: string[]; // most recent first
  selectedId?: string;
};

type SessionsActions = {
  createSession: (title?: string) => string;
  selectSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  deleteSession: (id: string) => void;
  saveMessages: (id: string, messages: ChatUIMessage[]) => void;
  ensureDefaultSession: () => void;
};

export type SessionsStore = SessionsState & SessionsActions;

const STORAGE_KEY = "conjure.chat.sessions.v1";

export const useSessionsStore = create<SessionsStore>()(
  persist(
    (set, get) => ({
      sessionsById: {},
      sessionOrder: [],
      selectedId: undefined,

      createSession: (title) => {
        const id = nanoid();
        const now = Date.now();
        const session: ChatSession = {
          id,
          title: title?.trim() || "New Chat",
          createdAt: now,
          updatedAt: now,
          messages: [],
        };

        set((state) => ({
          sessionsById: { ...state.sessionsById, [id]: session },
          sessionOrder: [id, ...state.sessionOrder],
          selectedId: id,
        }));

        return id;
      },

      selectSession: (id) => {
        const { sessionsById } = get();
        if (!sessionsById[id]) return;
        set({ selectedId: id });
      },

      renameSession: (id, title) => {
        set((state) => {
          const session = state.sessionsById[id];
          if (!session) return state;
          const updated: ChatSession = {
            ...session,
            title: title.trim() || session.title,
            updatedAt: Date.now(),
          };
          return {
            sessionsById: { ...state.sessionsById, [id]: updated },
          } as Partial<SessionsStore>;
        });
      },

      deleteSession: (id) => {
        set((state) => {
          if (!state.sessionsById[id]) return state;
          const { [id]: _omit, ...rest } = state.sessionsById;
          const order = state.sessionOrder.filter((sid) => sid !== id);
          const selectedId =
            state.selectedId === id ? order[0] : state.selectedId;
          return {
            sessionsById: rest,
            sessionOrder: order,
            selectedId,
          } as Partial<SessionsStore>;
        });
      },

      saveMessages: (id, messages) => {
        set((state) => {
          const session = state.sessionsById[id];
          if (!session) return state;

          // Only update the title when the first user message for THIS session appears
          const sessionHadUserMessage = session.messages.some(
            (m) => m.role === "user"
          );
          const firstUserTitle = deriveTitleFromMessages(messages);
          const shouldSetTitle =
            !sessionHadUserMessage &&
            !!firstUserTitle &&
            (!session.title || session.title === "New Chat");

          const updated: ChatSession = {
            ...session,
            messages,
            title: shouldSetTitle ? (firstUserTitle as string) : session.title,
            updatedAt: Date.now(),
          };
          // move session to top of order
          const order = [id, ...state.sessionOrder.filter((sid) => sid !== id)];
          return {
            sessionsById: { ...state.sessionsById, [id]: updated },
            sessionOrder: order,
          } as Partial<SessionsStore>;
        });
      },

      ensureDefaultSession: () => {
        const { sessionOrder, createSession, selectedId } = get();
        if (sessionOrder.length === 0) {
          createSession("New Chat");
        } else if (!selectedId) {
          set({ selectedId: sessionOrder[0] });
        }
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      partialize: (state) => ({
        sessionsById: state.sessionsById,
        sessionOrder: state.sessionOrder,
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
