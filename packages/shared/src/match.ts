// A tiny pattern-matching helper with exhaustiveness checking

export type MatchHandlers<TUnion, TResult> = {
  [K in TUnion extends { type: infer TK }
    ? TK extends string
      ? TK
      : never
    : never]: (value: Extract<TUnion, { type: K }>) => TResult;
} & {
  _: (value: TUnion) => TResult; // fallback wildcard
};

export function match<TUnion extends { type: string }, TResult>(
  value: TUnion,
  handlers: MatchHandlers<TUnion, TResult>
): TResult {
  const handler = (handlers as any)[value.type] as
    | ((v: TUnion) => TResult)
    | undefined;
  if (handler) return handler(value);
  return handlers._(value);
}
