import { z } from "zod";
import {
  createSandboxDataSchema,
  generatingFilesDataSchema,
  runCommandDataSchema,
  getSandboxUrlDataSchema,
  researchUpdateDataSchema,
} from "./ui-data-parts.js";

// Discriminated union of AI SDK UI data events that stream via onData
export const uiEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("data-create-sandbox"),
    data: createSandboxDataSchema,
  }),
  z.object({
    type: z.literal("data-generating-files"),
    data: generatingFilesDataSchema,
  }),
  z.object({
    type: z.literal("data-run-command"),
    data: runCommandDataSchema,
  }),
  z.object({
    type: z.literal("data-get-sandbox-url"),
    data: getSandboxUrlDataSchema,
  }),
  z.object({
    type: z.literal("data-researchUpdate"),
    data: researchUpdateDataSchema,
  }),
]);

export type UIEvent = z.infer<typeof uiEventSchema>;

export type UIEventType = UIEvent["type"];

export type UIEventOfType<TType extends UIEventType> = Extract<
  UIEvent,
  { type: TType }
>;

export function isUIEventType<TType extends UIEventType>(
  event: UIEvent,
  type: TType
): event is UIEventOfType<TType> {
  return event.type === type;
}
