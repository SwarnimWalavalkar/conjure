export default {
  PORT: process.env.PORT || 4000,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,
  DATABASE_URL: process.env.DATABASE_URL,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY!,
  EXA_API_KEY: process.env.EXA_API_KEY!,
  DEFAULT_LLM: "openai/gpt-5-mini",
  APP_DOMAIN: process.env.APP_DOMAIN,
} as const;
