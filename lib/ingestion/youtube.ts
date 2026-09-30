import { normalizeSignal, type NormalizedSignal } from "./normalize";

export async function fetchYoutubeSignals(): Promise<NormalizedSignal[]> {
  return [
    normalizeSignal({ productName: "Kling", source: "YouTube", sourceUrl: "https://www.youtube.com", signalType: "creator", weight: 0.86, timestamp: new Date().toISOString(), context: "Tutorial and workflow video preview." })
  ];
}
