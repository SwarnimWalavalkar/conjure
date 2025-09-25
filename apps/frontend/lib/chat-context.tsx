"use client";

import {
  type ReactNode,
  createContext,
  useContext,
  useMemo,
  useRef,
} from "react";
import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useDataStateMapper, type ConjureDataPart } from "@/app/state";
import type { DataPart as ConjureUIDataTypes } from "@conjure/shared";

export type ChatUIMessage = UIMessage<
  Record<string, unknown>,
  ConjureUIDataTypes
>;

interface ChatContextValue {
  chat: Chat<ChatUIMessage>;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const mapDataToState = useDataStateMapper();
  const mapDataToStateRef = useRef(mapDataToState);
  mapDataToStateRef.current = mapDataToState;

  const chat = useMemo(
    () =>
      new Chat<ChatUIMessage>({
        transport: new DefaultChatTransport({
          api: `${(() => {
            const backend =
              process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
            return backend.replace(/\/$/, "");
          })()}/api/v1/chat`,
        }),
        onData: (data) => mapDataToStateRef.current(data as ConjureDataPart),
      }),
    []
  );

  return (
    <ChatContext.Provider value={{ chat }}>{children}</ChatContext.Provider>
  );
}

export function useSharedChatContext() {
  const context = useContext(ChatContext);
  if (!context)
    throw new Error("useSharedChatContext must be used within a ChatProvider");
  return context;
}
