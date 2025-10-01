import { Hono } from "hono";
import type { Variables } from "../types/hono.js";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  stepCountIs,
  streamText,
} from "ai";
import { systemPrompt } from "../lib/ai/prompts/system.js";
import { openrouter } from "../lib/ai/providers/openrouter.js";
import config from "../config/index.js";
import { getTools } from "../lib/ai/tools/index.js";

const app = new Hono<{ Variables: Variables }>();

app.post(
  "/",
  zValidator(
    "json",
    z.object({
      messages: z.array(z.any()),
    })
  ),
  async (c) => {
    const { messages } = c.req.valid("json");

    const modelMessages = convertToModelMessages(messages);

    const aiStream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        const result = streamText({
          model: openrouter(config.DEFAULT_LLM),
          providerOptions: {
            openrouter: {
              reasoning: {
                effort: "low",
              },
            },
          },
          system: systemPrompt(),
          messages: modelMessages,
          tools: getTools({
            dataStream,
            messageId: generateId(),
            messages: modelMessages,
          }),
          stopWhen: [
            stepCountIs(5),
            ({ steps }) => {
              return steps.some((step) => {
                const toolResults = step.content;

                // stop if the deep research tool is called and the result is the final report
                return toolResults.some(
                  (toolResult) =>
                    toolResult.type === "tool-result" &&
                    toolResult.toolName === "deepResearch" &&
                    (toolResult.output as any).format === "report"
                );
              });
            },
          ],
        });

        result.consumeStream();

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          })
        );
      },
      onFinish: ({ messages }) => {
        console.log("onFinish agent messages");
        console.dir(messages, { depth: null });
      },
      generateId: () => generateId(),
    });

    return createUIMessageStreamResponse({
      status: 200,
      statusText: "OK",
      headers: { "Content-Type": "text/event-stream" },
      stream: aiStream,
    });
  }
);

export default app;
