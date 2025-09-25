export type Env = "development" | "staging" | "production";

export function getEnv(): Env {
  if (!process.env.NODE_ENV) {
    throw new Error("NODE_ENV is not set");
  }

  return process.env.NODE_ENV as Env;
}

export function isDevelopment(): boolean {
  return getEnv() === "development";
}

export function isProduction(): boolean {
  return getEnv() === "production";
}

export function isStaging(): boolean {
  return getEnv() === "staging";
}
