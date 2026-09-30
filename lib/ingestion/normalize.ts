import { canonicalizeProductName } from "@/lib/momentum";

export type NormalizedSignal = {
  productName: string;
  canonicalName: string;
  source: string;
  sourceUrl: string;
  signalType: "launch" | "mention" | "creator" | "repo" | "rss";
  weight: number;
  timestamp: string;
  context: string;
};

export function normalizeSignal(input: Omit<NormalizedSignal, "canonicalName">): NormalizedSignal {
  return {
    ...input,
    canonicalName: canonicalizeProductName(input.productName)
  };
}
