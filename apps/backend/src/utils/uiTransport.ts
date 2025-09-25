import type { UIMessageStreamWriter } from "ai";
import type { UIEvent } from "@conjure/shared";

export type UIEventEnvelope = UIEvent & { id?: string };

export function emitUIEvent(
  writer: UIMessageStreamWriter,
  event: UIEventEnvelope
) {
  writer.write(event as any);
}
