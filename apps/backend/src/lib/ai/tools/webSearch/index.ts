import type { UIMessageStreamWriter } from "ai";
import { tool } from "ai";
import { z } from "zod";
import { Exa } from "exa-js";
import config from "../../../../config/index.js";
import { emitUIEvent } from "../../../../utils/uiTransport.js";
import { getRichError } from "../../../../utils/getRichError.js";
import prompt from "./prompt.js";

interface Params {
  dataStream: UIMessageStreamWriter;
}

type WebSearchResult = {
  title: string;
  url: string;
  content: string;
};

function generateUUID(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

async function performWebSearch(
  query: string,
  maxResults: number
): Promise<WebSearchResult[]> {
  try {
    const exa = new Exa(config.EXA_API_KEY);
    const response = await exa.searchAndContents(query, {
      numResults: maxResults,
      type: "auto",
      useAutoprompt: true,
    });

    return response.results.map((item: any) => ({
      title: item.title || "",
      url: item.url || "",
      content: item.text || "",
    }));
  } catch (error: any) {
    console.error("Exa search error:", error);
    throw error;
  }
}

export const webSearch = ({ dataStream }: Params) =>
  tool({
    description: prompt(),
    inputSchema: z.object({
      searchQueries: z
        .array(
          z.object({
            query: z.string().describe("Specific search query"),
            maxResults: z
              .number()
              .min(1)
              .max(10)
              .default(5)
              .describe("Number of results to return (1-10)"),
          })
        )
        .min(1)
        .max(5)
        .describe("Array of search queries to execute"),
    }),
    execute: async ({ searchQueries }, { toolCallId }) => {
      const updateId = toolCallId || generateUUID();

      emitUIEvent(dataStream, {
        id: updateId,
        type: "data-web-search",
        data: {
          title: `Searching ${searchQueries.length} ${searchQueries.length === 1 ? "query" : "queries"}`,
          status: "running",
          queries: searchQueries.map((q) => q.query),
        },
      });

      try {
        const allResults: WebSearchResult[] = [];

        for (const searchQuery of searchQueries) {
          const results = await performWebSearch(
            searchQuery.query,
            searchQuery.maxResults
          );
          allResults.push(...results);
        }

        // Deduplicate by URL
        const uniqueResults = allResults.filter(
          (result, index, self) =>
            index === self.findIndex((r) => r.url === result.url)
        );

        emitUIEvent(dataStream, {
          id: updateId,
          type: "data-web-search",
          data: {
            title: `Found ${uniqueResults.length} ${uniqueResults.length === 1 ? "source" : "sources"}`,
            status: "completed",
            queries: searchQueries.map((q) => q.query),
            results: uniqueResults,
          },
        });

        // Format results for the LLM
        const formattedResults = uniqueResults
          .map(
            (result, index) =>
              `[${index + 1}] ${result.title}\nURL: ${result.url}\nContent: ${result.content.substring(0, 500)}${result.content.length > 500 ? "..." : ""}\n`
          )
          .join("\n");

        return (
          `Found ${uniqueResults.length} sources across ${searchQueries.length} ${searchQueries.length === 1 ? "query" : "queries"}.\n\n` +
          `Search Results:\n${formattedResults}\n\n` +
          `Summary: Successfully retrieved information from ${uniqueResults.length} unique web sources.`
        );
      } catch (error) {
        const richError = getRichError({
          action: "Web Search",
          args: { searchQueries },
          error,
        });

        emitUIEvent(dataStream, {
          id: updateId,
          type: "data-web-search",
          data: {
            error: { message: richError.error.message },
            status: "error",
            queries: searchQueries.map((q) => q.query),
          },
        });

        console.error("Web search error:", richError.error);
        return richError.message;
      }
    },
  });
