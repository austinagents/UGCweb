import { normalizeSignal, type NormalizedSignal } from "./normalize";

export async function fetchTaaftSignals(): Promise<NormalizedSignal[]> {
  return [
    normalizeSignal({ productName: "Kling", source: "TAAFT", sourceUrl: "https://theresanaiforthat.com", signalType: "mention", weight: 0.78, timestamp: new Date().toISOString(), context: "Directory category velocity preview." })
  ];
}
