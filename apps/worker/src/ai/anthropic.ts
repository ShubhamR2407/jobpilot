import Anthropic from "@anthropic-ai/sdk";

// Reads ANTHROPIC_API_KEY from the environment (loaded via loadenv).
export const anthropic = new Anthropic();

// Tiered by task: cheap model for high-volume extraction, mid for judgment,
// top model reserved for on-demand writing (Step 4).
export const MODELS = {
  normalize: "claude-haiku-4-5",
  score: "claude-sonnet-5",
  tailor: "claude-opus-4-8",
} as const;

export interface Usage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

// $ per 1M tokens (input, output). Conservative (non-intro) rates.
const RATES: Record<string, { in: number; out: number }> = {
  "claude-haiku-4-5": { in: 1, out: 5 },
  "claude-sonnet-5": { in: 3, out: 15 },
  "claude-opus-4-8": { in: 5, out: 25 },
};

/** Estimate the $ cost of one API call from its token usage. */
export function estimateCost(model: string, usage: Usage): number {
  const r = RATES[model] ?? { in: 0, out: 0 };
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  return (
    (usage.input_tokens * r.in +
      cacheRead * r.in * 0.1 + // cache reads ~0.1x input
      cacheWrite * r.in * 1.25 + // cache writes ~1.25x input
      usage.output_tokens * r.out) /
    1_000_000
  );
}
