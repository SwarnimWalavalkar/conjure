import { z } from "zod";

export const errorSchema = z.object({
  message: z.string(),
});

// Export individual part schemas so they can be reused in discriminated unions
export const createSandboxDataSchema = z.object({
  sandboxId: z.string().optional(),
  status: z.enum(["loading", "done", "error"]).optional(),
  error: errorSchema.optional(),
});

export const generatingFilesDataSchema = z.object({
  paths: z.array(z.string()).default([]),
  status: z
    .enum(["generating", "uploading", "uploaded", "done", "error"])
    .default("generating"),
  error: errorSchema.optional(),
});

export const runCommandDataSchema = z.object({
  sandboxId: z.string(),
  commandId: z.string().optional(),
  command: z.string(),
  args: z.array(z.string()).default([]),
  status: z.enum(["executing", "running", "waiting", "done", "error"]),
  exitCode: z.number().optional(),
  error: errorSchema.optional(),
});

export const webSearchDataSchema = z.object({
  title: z.string().optional(),
  status: z.enum(["running", "completed", "error"]).optional(),
  queries: z.array(z.string()).optional(),
  results: z
    .array(
      z.object({
        title: z.string(),
        url: z.string(),
        content: z.string(),
      })
    )
    .optional(),
  error: errorSchema.optional(),
});

// Deep research updates streamed by backend deepResearch tool
// Matches various steps with flexible payloads
export const researchUpdateDataSchema = z.object({
  title: z.string().optional(),
  type: z
    .enum(["started", "web", "writing", "thoughts", "completed"])
    .optional(),
  status: z.enum(["running", "completed"]).optional(),
  timestamp: z.number().optional(),
  queries: z.array(z.string()).optional(),
  results: z
    .array(
      z.object({
        title: z.string().optional(),
        url: z.string().optional(),
        favicon: z.string().optional(),
      })
    )
    .optional(),
});

export const dataPartSchema = z.object({
  "create-sandbox": createSandboxDataSchema,
  "generating-files": generatingFilesDataSchema,
  "run-command": runCommandDataSchema,
  "web-search": webSearchDataSchema,
  researchUpdate: researchUpdateDataSchema,
});

export type DataPart = z.infer<typeof dataPartSchema>;

// Utility to convert schema key to UI part type (AI SDK uses data- prefix)
export type UIPartType =
  | "data-create-sandbox"
  | "data-generating-files"
  | "data-run-command"
  | "data-web-search"
  | "data-researchUpdate";
