import { normalizeSignal, type NormalizedSignal } from "./normalize";

export async function fetchGithubSignals(): Promise<NormalizedSignal[]> {
  return [
    normalizeSignal({ productName: "Cursor", source: "GitHub", sourceUrl: "https://github.com/trending", signalType: "repo", weight: 0.66, timestamp: new Date().toISOString(), context: "Repository and developer discussion preview." })
  ];
}
