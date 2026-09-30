import { normalizeSignal, type NormalizedSignal } from "./normalize";

export async function fetchProductHuntSignals(): Promise<NormalizedSignal[]> {
  return [
    normalizeSignal({ productName: "Lovable", source: "Product Hunt", sourceUrl: "https://www.producthunt.com", signalType: "launch", weight: 0.82, timestamp: new Date().toISOString(), context: "Launch discussion and save velocity preview." }),
    normalizeSignal({ productName: "Granola", source: "Product Hunt", sourceUrl: "https://www.producthunt.com", signalType: "launch", weight: 0.71, timestamp: new Date().toISOString(), context: "Meeting workflow discovery preview." })
  ];
}
