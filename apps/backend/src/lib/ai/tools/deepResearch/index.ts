import {
  generateObject,
  generateText,
  tool,
  type ModelMessage,
  type UIMessageStreamWriter,
} from "ai";
import { z } from "zod";
import { Exa } from "exa-js";
import config from "../../../../config/index.js";
import { openrouter } from "../../providers/openrouter.js";
import { emitUIEvent } from "../../../../utils/uiTransport.js";

// Configuration Schema
export const DeepResearchConfigSchema = z.object({
  // General Configuration
  max_structured_output_retries: z.number().int().min(1).max(10).default(3),
  allow_clarification: z.boolean().default(true),
  max_concurrent_research_units: z.number().int().min(1).max(20).default(2),

  // Research Configuration
  search_api: z.literal("exa").default("exa"),
  search_api_max_queries: z.number().int().min(1).max(10).default(3),
  max_researcher_iterations: z.number().int().min(1).max(10).default(2),

  // Model Configuration
  research_model: z.string().default(config.DEFAULT_LLM),
  compression_model: z.string().default(config.DEFAULT_LLM),
  final_report_model: z.string().default(config.DEFAULT_LLM),
});

export type DeepResearchConfig = z.infer<typeof DeepResearchConfigSchema>;

export function createDeepResearchConfig(
  overrides: Partial<DeepResearchConfig> = {}
): DeepResearchConfig {
  return DeepResearchConfigSchema.parse(overrides);
}

// --- Core Types ---
type WebSearchResult = {
  title: string;
  url: string;
  content: string;
};

type ResearchState = {
  requestId: string;
  messages: ModelMessage[];
  research_brief?: string;
  title?: string;
  notes: string[];
  iteration: number;
};

function getLanguageModel(modelId: string) {
  return openrouter(modelId);
}

function getTodayStr(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function messagesToString(messages: ModelMessage[]): string {
  return messages
    .map(
      (m) =>
        `${m.role}: ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`
    )
    .join("\n");
}

function generateUUID(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function getTextContentFromMessage(message: ModelMessage): string {
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.content)) {
    return message.content
      .map((part) =>
        typeof part === "string" ? part : part.type === "text" ? part.text : ""
      )
      .join("");
  }
  return "";
}

// --- Web Search Implementation ---
async function webSearch(
  query: string,
  maxResults: number,
  deepResearchConfig: DeepResearchConfig
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
    return [];
  }
}

// --- Research Tools ---
const webSearchTool = (
  config: DeepResearchConfig,
  dataStream: UIMessageStreamWriter
) =>
  tool({
    description: `Search the web for information. Use multiple specific queries to gather comprehensive information.`,
    inputSchema: z.object({
      searchQueries: z
        .array(
          z.object({
            query: z.string().describe("Specific search query"),
            maxResults: z.number().min(1).max(10).default(5),
          })
        )
        .max(config.search_api_max_queries),
    }),
    execute: async ({ searchQueries }) => {
      const updateId = generateUUID();

      emitUIEvent(dataStream, {
        type: "data-researchUpdate",
        id: updateId,
        data: {
          title: `Searching ${searchQueries.length} queries`,
          type: "web",
          status: "running",
          queries: searchQueries.map((q) => q.query),
        },
      });

      const allResults: WebSearchResult[] = [];

      for (const searchQuery of searchQueries) {
        const results = await webSearch(
          searchQuery.query,
          searchQuery.maxResults,
          config
        );
        allResults.push(...results);
      }

      // Deduplicate by URL
      const uniqueResults = allResults.filter(
        (result, index, self) =>
          index === self.findIndex((r) => r.url === result.url)
      );

      emitUIEvent(dataStream, {
        type: "data-researchUpdate",
        id: updateId,
        data: {
          title: `Found ${uniqueResults.length} sources`,
          type: "web",
          status: "completed",
          queries: searchQueries.map((q) => q.query),
          results: uniqueResults,
        },
      });

      return {
        results: uniqueResults,
        summary: `Found ${uniqueResults.length} sources across ${searchQueries.length} queries`,
      };
    },
  });

const researchCompleteTool = tool({
  description: `Call this when you have gathered sufficient information to answer the research question.`,
  inputSchema: z.object({
    summary: z.string().describe("Brief summary of what was researched"),
  }),
  execute: async ({ summary }) => {
    return { complete: true, summary };
  },
});

// --- Core Research Functions ---
async function maybeClarify(
  messages: ModelMessage[],
  config: DeepResearchConfig
): Promise<{ needsClarification: boolean; question?: string }> {
  if (!config.allow_clarification) return { needsClarification: false };

  const schema = z.object({
    need_clarification: z
      .boolean()
      .describe("Whether the user's request requires clarification"),
    question: z
      .string()
      .describe("The question to ask the user for clarification, if needed"),
  });

  const prompt = `You are deciding whether the user's request requires clarification for deep research.

Today: ${getTodayStr()}

Conversation:
${messagesToString(messages)}

Respond with need_clarification=true if the research goal is ambiguous or missing key constraints (scope, audience, timeframe, definitions). If true, provide a single concise question to gather the most important missing information.

Only ask for clarification if absolutely necessary for conducting meaningful research.`;

  const result = await generateObject({
    model: getLanguageModel(config.research_model),
    schema,
    messages: [{ role: "user", content: prompt }],
  });

  return {
    needsClarification: result.object.need_clarification,
    question: result.object.question ?? undefined,
  };
}

async function writeBrief(
  messages: ModelMessage[],
  config: DeepResearchConfig
): Promise<{ title: string; brief: string }> {
  const schema = z.object({
    title: z.string(),
    research_brief: z.string(),
  });

  const prompt = `Transform the user's request into a focused research brief and title.

Today: ${getTodayStr()}

Conversation:
${messagesToString(messages)}

Create:
1. A precise, specific title (under 100 characters)
2. A research brief (5-8 sentences) that captures:
   - The core research question
   - Key dimensions to investigate
   - Expected scope and depth
   - Target audience or use case

Be specific about what needs to be researched. Include all important details from the conversation.`;

  const result = await generateObject({
    model: getLanguageModel(config.research_model),
    schema,
    messages: [{ role: "user", content: prompt }],
  });

  return { title: result.object.title, brief: result.object.research_brief };
}

async function conductResearch(
  researchTopic: string,
  config: DeepResearchConfig,
  dataStream: UIMessageStreamWriter
): Promise<string> {
  const tools = {
    webSearch: webSearchTool(config, dataStream),
    researchComplete: researchCompleteTool,
  };

  const systemPrompt = `You are a research assistant conducting deep research on a specific topic. Use web search to gather comprehensive information.

Today: ${getTodayStr()}

RESEARCH GUIDELINES:
- Start with broad searches to understand the topic
- Then conduct specific searches to fill gaps
- You have up to ${config.search_api_max_queries} search queries
- Use diverse, specific search terms
- Call researchComplete when you have sufficient information

CRITICAL: You MUST use web search before calling researchComplete. Conduct thorough research using multiple search queries with different angles and perspectives.`;

  const result = await generateText({
    model: getLanguageModel(config.research_model),
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Research this topic in depth: ${researchTopic}`,
      },
    ],
    tools,
  });

  // Extract and combine all research findings
  const researchContent = result.response.messages
    .map((msg) => getTextContentFromMessage(msg))
    .join("\n");

  return researchContent;
}

async function compressResearch(
  rawResearch: string,
  config: DeepResearchConfig
): Promise<string> {
  const systemPrompt = `You are compressing research findings. Preserve ALL important information, sources, and citations.

TASK: Clean up and organize the research findings while preserving everything relevant.

REQUIREMENTS:
1. Keep all factual information verbatim
2. Maintain all source citations and URLs
3. Organize information clearly
4. Remove only obvious duplicates
5. Include a sources section with all URLs

Format as structured findings with clear sections and complete source citations.`;

  const result = await generateText({
    model: getLanguageModel(config.compression_model),
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Clean up these research findings:\n\n${rawResearch}`,
      },
    ],
  });

  return result.text;
}

async function supervisorIteration(
  state: ResearchState,
  config: DeepResearchConfig,
  dataStream: UIMessageStreamWriter
): Promise<{ continue: boolean; newNotes: string[] }> {
  const systemPrompt = `You are a research supervisor. Analyze the current research state and decide what additional research is needed.

Today: ${getTodayStr()}
Max concurrent research: ${config.max_concurrent_research_units}

CURRENT RESEARCH BRIEF: ${state.research_brief}

RESEARCH CONDUCTED SO FAR:
${state.notes.join("\n\n")}

INSTRUCTIONS:
1. Assess if the current research is comprehensive enough
2. Identify specific gaps or areas needing more investigation  
3. If more research is needed, specify 1-${config.max_concurrent_research_units} focused research topics
4. Each topic should be substantially different from what's already been researched

Be strategic - research is expensive. Only request additional research if absolutely necessary for a comprehensive answer.`;

  const schema = z.object({
    needs_more_research: z
      .boolean()
      .describe("Whether more research is needed"),
    research_topics: z
      .array(z.string())
      .max(config.max_concurrent_research_units)
      .describe(
        "The research topics to investigate, optional if no more research is needed"
      ),
    reasoning: z.string().describe("The reasoning for the decision"),
  });

  const result = await generateObject({
    model: getLanguageModel(config.research_model),
    schema,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: "Analyze the research state and decide next steps.",
      },
    ],
  });

  if (!result.object.needs_more_research || !result.object.research_topics) {
    return { continue: false, newNotes: [] };
  }

  // Conduct additional research
  const newNotes: string[] = [];

  for (const topic of result.object.research_topics) {
    emitUIEvent(dataStream, {
      type: "data-researchUpdate",
      data: {
        title: `Researching: ${topic.substring(0, 50)}...`,
        type: "thoughts",
        status: "running",
      },
    });

    const rawResearch = await conductResearch(topic, config, dataStream);
    const compressedResearch = await compressResearch(rawResearch, config);
    newNotes.push(compressedResearch);
  }

  return { continue: true, newNotes };
}

async function writeFinalReport(
  title: string,
  brief: string,
  notes: string[],
  config: DeepResearchConfig
): Promise<string> {
  const systemPrompt = `You are writing a comprehensive research report. Create a well-structured, detailed analysis.

REQUIREMENTS:
1. Use markdown formatting with proper headers (# for title, ## for sections)
2. Include specific facts, data, and insights from the research
3. Reference sources using [Title](URL) format
4. Be comprehensive and detailed - users expect thorough analysis
5. Include a "Sources" section at the end
6. Structure logically based on the content

CITATION RULES:
- Assign each unique URL a citation number [1], [2], etc.
- End with ### Sources listing all sources
- Number sequentially without gaps`;

  const findings = notes.join("\n\n");

  const userPrompt = `Create a comprehensive research report:

TITLE: ${title}

RESEARCH BRIEF: ${brief}

RESEARCH FINDINGS:
${findings}

Structure the report appropriately for the topic. Be thorough and include all relevant information with proper citations.`;

  const result = await generateText({
    model: getLanguageModel(config.final_report_model),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  return result.text;
}

// --- Main Deep Researcher Workflow ---
async function runDeepResearcher(
  input: { requestId: string; messages: ModelMessage[] },
  config: DeepResearchConfig,
  dataStream: UIMessageStreamWriter
): Promise<
  | {
      type: "report";
      data: { id: string; title: string; kind: "text"; content: string };
    }
  | { type: "clarifying_question"; data: string }
> {
  // Step 0: Initialize
  emitUIEvent(dataStream, {
    type: "data-researchUpdate",
    data: {
      title: "Starting deep research",
      type: "started",
      timestamp: Date.now(),
    },
  });

  // Step 1: Clarification
  const clarify = await maybeClarify(input.messages, config);
  if (clarify.needsClarification && clarify.question) {
    return { type: "clarifying_question", data: clarify.question };
  }

  // Step 2: Research Brief
  emitUIEvent(dataStream, {
    type: "data-researchUpdate",
    data: {
      title: "Creating research plan",
      type: "writing",
      status: "running",
    },
  });

  const brief = await writeBrief(input.messages, config);

  emitUIEvent(dataStream, {
    type: "data-researchUpdate",
    data: {
      title: "Research plan complete",
      type: "writing",
      status: "completed",
    },
  });

  // Step 3: Initial Research
  let state: ResearchState = {
    requestId: input.requestId,
    messages: input.messages,
    research_brief: brief.brief,
    title: brief.title,
    notes: [],
    iteration: 0,
  };

  // Conduct initial research
  const initialResearch = await conductResearch(
    brief.brief,
    config,
    dataStream
  );
  const compressedInitial = await compressResearch(initialResearch, config);
  state.notes.push(compressedInitial);

  // Step 4: Supervisor Iterations
  while (state.iteration < config.max_researcher_iterations) {
    state.iteration++;

    const supervision = await supervisorIteration(state, config, dataStream);

    if (!supervision.continue) {
      break;
    }

    state.notes.push(...supervision.newNotes);
  }

  // Step 5: Final Report
  emitUIEvent(dataStream, {
    type: "data-researchUpdate",
    data: {
      title: "Writing final report",
      type: "writing",
      status: "running",
    },
  });

  const finalReport = await writeFinalReport(
    brief.title,
    brief.brief,
    state.notes,
    config
  );

  emitUIEvent(dataStream, {
    type: "data-researchUpdate",
    data: {
      title: "Research complete",
      type: "completed",
      timestamp: Date.now(),
    },
  });

  return {
    type: "report",
    data: {
      id: input.requestId,
      title: brief.title,
      kind: "text",
      content: finalReport,
    },
  };
}

// --- Tool Export ---
export const deepResearch = ({
  dataStream,
  messageId,
  messages,
}: {
  dataStream: UIMessageStreamWriter;
  messageId: string;
  messages: Array<ModelMessage>;
}) =>
  tool({
    description: `Conducts comprehensive, autonomous research using web search and multi-step analysis. 

This tool:
- Automatically clarifies ambiguous requests
- Breaks down complex topics into focused research areas  
- Searches multiple web sources for current information
- Iteratively deepens research based on findings
- Synthesizes results into a detailed, well-cited report

Best for: Complex questions requiring in-depth analysis, current events, comparative studies, market research, technical deep-dives.

Important:
- If this tool previously returned a clarifying question, call it again after the user responds
- Successful research creates a detailed report - no need to repeat findings
`,
    inputSchema: z.object({}),
    execute: async () => {
      const config: DeepResearchConfig = createDeepResearchConfig();

      try {
        const researchResult = await runDeepResearcher(
          {
            requestId: messageId,
            messages: messages,
          },
          config,
          dataStream
        );

        switch (researchResult.type) {
          case "report":
            return {
              ...researchResult.data,
              format: "report" as const,
            };

          case "clarifying_question":
            return {
              answer: researchResult.data,
              format: "clarifying_questions" as const,
            };
        }
      } catch (error) {
        console.error("Deep research error:", error);
        return {
          answer: `Deep research failed with error: ${error instanceof Error ? error.message : String(error)}`,
          format: "problem" as const,
        };
      }
    },
  });
