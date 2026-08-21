import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const VISION_MODEL = "claude-sonnet-5";
export const TEXT_MODEL = "claude-sonnet-5";
