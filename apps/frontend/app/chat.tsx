"use client";

import { MessageCircle, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { Loader } from "@/components/ai-elements/loader";
import { ResearchUpdate } from "@/components/research-update";
import {
  Artifact,
  ArtifactActions,
  ArtifactContent,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from "@/components/ai-elements/artifact";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Input } from "@/components/ui/input";
import { Panel, PanelHeader } from "@/components/panels/panels";
import { useChat } from "@ai-sdk/react";
import { useSharedChatContext } from "@/lib/chat-context";
import { useSandboxStore } from "@/app/state";
import { useState, useEffect, useCallback, useRef } from "react";
import { DefaultChatTransport } from "ai";
import { useSessionsStore } from "@/lib/chat-sessions";

export function Chat({ className }: { className?: string }) {
  const [input, setInput] = useState("");
  const { chat } = useSharedChatContext();
  const { selectedId, sessionsById, saveMessages, ensureDefaultSession } =
    useSessionsStore();
  const isSwitchingRef = useRef(false);

  // Ensure there's at least one session
  useEffect(() => {
    ensureDefaultSession();
  }, [ensureDefaultSession]);

  // Provide initial messages for current session
  const { messages, sendMessage, status, setMessages } = useChat({ chat });
  const { setChatStatus } = useSandboxStore();

  const validateAndSubmitMessage = useCallback(
    (text: string) => {
      if (text.trim()) {
        sendMessage({ text });
        setInput("");
      }
    },
    [sendMessage]
  );

  useEffect(() => {
    setChatStatus(status);
  }, [status, setChatStatus]);

  // When the selected session changes, swap the UI messages to that session first
  useEffect(() => {
    if (!selectedId) return;
    const nextMessages = sessionsById[selectedId]?.messages ?? [];
    isSwitchingRef.current = true;
    setMessages(nextMessages as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Persist messages to the selected session whenever they change
  useEffect(() => {
    if (!selectedId) return;
    if (isSwitchingRef.current) return;
    saveMessages(selectedId, messages as any);
  }, [messages, selectedId, saveMessages]);

  // Clear the switching flag once the chat messages match the selected session's messages
  useEffect(() => {
    if (!selectedId) return;
    const sessionMessages = sessionsById[selectedId]?.messages ?? [];
    if (arraysShallowEqualById(messages as any[], sessionMessages as any[])) {
      isSwitchingRef.current = false;
    }
  }, [messages, selectedId, sessionsById]);

  function arraysShallowEqualById(a: any[], b: any[]) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i]?.id !== b[i]?.id) return false;
    }
    return true;
  }

  const shouldShowPreStreamLoader = (() => {
    if (status !== "submitted" && status !== "streaming") return false;
    const all = (messages as any[]) || [];
    if (all.length === 0) return false;

    // find last user message
    let lastUserIndex = -1;
    for (let i = all.length - 1; i >= 0; i--) {
      if (all[i]?.role === "user") {
        lastUserIndex = i;
        break;
      }
    }
    if (lastUserIndex === -1) return false;

    // find first assistant after that user
    let assistantAfterUser: any | undefined;
    for (let i = lastUserIndex + 1; i < all.length; i++) {
      if (all[i]?.role === "assistant") {
        assistantAfterUser = all[i];
        break;
      }
    }

    if (status === "submitted") return true;
    if (status === "streaming") {
      // keep showing until we receive any text content from the assistant
      if (!assistantAfterUser) return true;
      const parts = (assistantAfterUser.parts || []) as any[];
      const hasAnyAssistantText = parts.some(
        (p) =>
          p?.type === "text" &&
          typeof p.text === "string" &&
          p.text.trim().length > 0
      );
      return !hasAnyAssistantText;
    }
    return false;
  })();

  return (
    <Panel className={className}>
      <PanelHeader>
        <div className="flex items-center font-mono font-semibold uppercase">
          <MessageCircle className="mr-2 w-4" />
          Chat
        </div>
        <div className="ml-auto font-mono text-xs opacity-50">[{status}]</div>
      </PanelHeader>

      <Conversation className="relative w-full">
        {messages.length === 0 ? (
          <ConversationEmptyState
            description="Start by typing a prompt below"
            title="No messages yet"
          />
        ) : null}

        <ConversationContent className="space-y-2">
          {messages.map((message) => (
            <Message from={message.role} key={message.id}>
              <MessageContent>
                {message.parts.map((part: any, idx: number) => {
                  const key = `${message.id}-${idx}`;

                  if (part.type === "text") {
                    return <Response key={key}>{part.text}</Response>;
                  }

                  if (part.type === "reasoning") {
                    return (
                      <Reasoning
                        isStreaming={part.state === "streaming" ? true : false}
                        key={key}
                      >
                        <ReasoningTrigger />
                        <ReasoningContent>{part.text}</ReasoningContent>
                      </Reasoning>
                    );
                  }

                  if (part.type === "data-researchUpdate") {
                    return <ResearchUpdate key={key} data={part.data as any} />;
                  }

                  if (
                    part.type === "tool-deepResearch" &&
                    part.state === "output-available" &&
                    (part as any).output?.format === "report"
                  ) {
                    const output = (part as any).output as {
                      title?: string;
                      content?: string;
                    };
                    return (
                      <div key={`report-${key}`} className="order-last">
                        <Artifact>
                          <ArtifactHeader>
                            <div>
                              <ArtifactTitle>
                                {output?.title || "Research Report"}
                              </ArtifactTitle>
                              <ArtifactDescription>
                                Deep research report
                              </ArtifactDescription>
                            </div>
                            <ArtifactActions />
                          </ArtifactHeader>
                          <ArtifactContent>
                            <Response>{output?.content}</Response>
                          </ArtifactContent>
                        </Artifact>
                      </div>
                    );
                  }

                  return null;
                })}
              </MessageContent>
            </Message>
          ))}
          {shouldShowPreStreamLoader ? (
            <Message from="assistant" key="pre-stream-loader">
              <MessageContent className="flex justify-center">
                <Loader size={24} />
              </MessageContent>
            </Message>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <form
        className="flex items-center p-2 space-x-1 border-t border-primary/18 bg-background"
        onSubmit={(event) => {
          event.preventDefault();
          validateAndSubmitMessage(input);
        }}
      >
        <Input
          className="w-full font-mono text-sm rounded-sm border-0 bg-background"
          disabled={status === "streaming" || status === "submitted"}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          value={input}
        />
        <Button type="submit" disabled={status !== "ready" || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </Panel>
  );
}
