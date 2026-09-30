import { normalizeSignal, type NormalizedSignal } from "./normalize";

export async function fetchRedditSignals(): Promise<NormalizedSignal[]> {
  return [
    normalizeSignal({ productName: "NotebookLM", source: "Reddit", sourceUrl: "https://www.reddit.com", signalType: "mention", weight: 0.74, timestamp: new Date().toISOString(), context: "Community thread acceleration preview." })
  ];
}
