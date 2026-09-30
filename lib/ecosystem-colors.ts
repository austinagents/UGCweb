import type { CreatorSpecialization } from "./creator-tags";
import type { CategoryName } from "./types";

export type EcosystemColorKey =
  | CreatorSpecialization
  | CategoryName;

export const ecosystemColors: Record<string, string> = {
  "AI Coding": "#2F93A3",
  "AI Agents": "#846DBA",
  "AI Automation": "#3F9B91",
  "AI Workflow": "#6D75B4",
  "AI Workflows": "#6D75B4",
  "AI Productivity": "#5A9C6B",
  "AI Design": "#B8678F",
  "AI Image": "#B98A3E",
  "AI Video": "#3E9A7D",
  "AI Marketing": "#B96372",
  "AI Research": "#906FBC",
  "AI Infrastructure": "#5F78B0",
  "AI Voice": "#2F93A3",
  "AI Search": "#82A44B",
  "Open Source AI": "#B77B46",
  "AI Trading": "#5A9C6B",
  "AI Gaming": "#906FBC",
  "AI 3D Modeling": "#4B8DB1",

  "AI Meeting": "#397B74",
  "AI Audio": "#3F8397",
  "AI Music": "#A184C1",
  "AI Avatars": "#B77B46",
  "AI Development": "#5F78B0",
  "AI Analytics": "#7A68B0",
  "AI Education": "#A67638",
  "AI Writing": "#747B83",
  "AI Sales": "#3C8067",
  "Support": "#3D789D"
};

export function ecosystemColorFor(key: string) {
  return ecosystemColors[key] ?? "#64748B";
}

export function ecosystemColorStyle(key: string) {
  return { "--ecosystem-color": ecosystemColorFor(key), "--tag-color": ecosystemColorFor(key) } as Record<string, string>;
}
