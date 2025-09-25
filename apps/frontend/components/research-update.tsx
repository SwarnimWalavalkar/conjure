"use client";

import { Task, TaskContent, TaskTrigger } from "./ai-elements/task";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtSearchResult,
  ChainOfThoughtSearchResults,
  ChainOfThoughtStep,
} from "./ai-elements/chain-of-thought";
import { SearchIcon } from "lucide-react";

type ResearchUpdateProps = ComponentProps<typeof Task> & {
  data: {
    title?: string;
    type?: "started" | "web" | "writing" | "thoughts" | "completed";
    status?: "running" | "completed";
    timestamp?: number;
    queries?: string[];
    results?: Array<{ title?: string; url?: string; content?: string }>;
  };
};

export const ResearchUpdate = ({
  className,
  data,
  ...props
}: ResearchUpdateProps) => {
  const title = data.title ?? (data.type ? data.type : "researchUpdate");

  return (
    <Task className={cn(className)} defaultOpen {...props}>
      <TaskTrigger title={title} />
      {Boolean(data.queries?.length || data.results?.length || data.status) && (
        <TaskContent>
          <ChainOfThought defaultOpen>
            <ChainOfThoughtContent>
              {data.type === "web" &&
              Array.isArray(data.queries) &&
              data.queries.length > 0 ? (
                <ChainOfThoughtStep
                  icon={SearchIcon}
                  label={data.queries.length > 1 ? "Queries" : "Query"}
                  status={data.status === "running" ? "active" : "complete"}
                >
                  <div className="text-muted-foreground text-xs">
                    {data.queries.join(", ")}
                  </div>
                </ChainOfThoughtStep>
              ) : null}

              {data.type === "web" &&
              Array.isArray(data.results) &&
              data.results.length > 0 ? (
                <ChainOfThoughtStep
                  icon={SearchIcon}
                  label={`Web results (${data.results.length})`}
                  status={data.status === "running" ? "active" : "complete"}
                >
                  <ChainOfThoughtSearchResults>
                    {data.results.map((r, i) => (
                      <ChainOfThoughtSearchResult asChild key={i}>
                        {r.url ? (
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            title={r.content || r.title || r.url}
                          >
                            {r.title || r.url}
                          </a>
                        ) : (
                          <span title={r.content || r.title || undefined}>
                            {r.title || "Result"}
                          </span>
                        )}
                      </ChainOfThoughtSearchResult>
                    ))}
                  </ChainOfThoughtSearchResults>
                </ChainOfThoughtStep>
              ) : null}

              {typeof data.status === "string" ? (
                <ChainOfThoughtStep
                  label={`Status: ${data.status}`}
                  status={data.status === "running" ? "active" : "complete"}
                />
              ) : null}
            </ChainOfThoughtContent>
          </ChainOfThought>
        </TaskContent>
      )}
    </Task>
  );
};
