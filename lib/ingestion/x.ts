import { normalizeSignal, type NormalizedSignal } from "./normalize";

export async function fetchXSignals(): Promise<NormalizedSignal[]> {
  return [
    normalizeSignal({ productName: "Windsurf", source: "X", sourceUrl: "https://x.com", signalType: "creator", weight: 0.81, timestamp: new Date().toISOString(), context: "Creator comparison thread preview." })
  ];
}
