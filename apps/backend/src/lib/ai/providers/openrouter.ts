import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import config from "../../../config/index.js";

const openrouterProvider = createOpenRouter({
  apiKey: config.OPENROUTER_API_KEY,
});

export const openrouter = openrouterProvider.chat;
