import { normalizeSignal, type NormalizedSignal } from "./normalize";

export async function fetchRssSignals(): Promise<NormalizedSignal[]> {
  return [
    normalizeSignal({ productName: "Claude AI", source: "Newsletters/RSS", sourceUrl: "https://example.com/rss", signalType: "rss", weight: 0.69, timestamp: new Date().toISOString(), context: "Newsletter mention preview." })
  ];
}
