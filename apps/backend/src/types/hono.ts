import type { Hono } from "hono";

// update when implemented auth
export type Variables = {
  user: any;
  session: any;
};

export type AppType = Hono<{ Variables: Variables }>;
