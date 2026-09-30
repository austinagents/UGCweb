import { getTool } from "@/lib/data";
import type { Tool } from "@/lib/types";
import { ToolLogo } from "./tool-logo";

function isTool(tool: Tool | undefined): tool is Tool {
  return Boolean(tool);
}

export function WorkflowStack({ toolSlugs, limit = 5 }: { toolSlugs: string[]; limit?: number }) {
  const stackTools = toolSlugs.map(getTool).filter(isTool).slice(0, limit);

  return (
    <div className="toolStack" aria-label={`${toolSlugs.length} tools included`}>
      {stackTools.map((tool, index) => (
        <ToolLogo officialSrc={tool.officialLogoUrl} src={tool.logoUrl} faviconSrc={tool.faviconUrl} fallback={tool.iconUrl} alt={tool.name} key={tool.slug} size={24} />
      ))}
    </div>
  );
}
