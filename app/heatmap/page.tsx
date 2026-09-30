import Link from "next/link";
import type { ReactNode } from "react";
import { Activity, GitBranch, Layers3, Search, Users, Workflow } from "lucide-react";
import { CreatorAvatar } from "@/components/creator-avatar";
import { MovementBadge } from "@/components/movement-badge";
import { ToolLogo } from "@/components/tool-logo";
import { WorkflowStack } from "@/components/workflow-stack";
import { categories, creators, discoveryEdges, tools, toolsForWorkflow, workflows } from "@/lib/data";
import { ecosystemColorFor } from "@/lib/ecosystem-colors";
import { displayCategory } from "@/lib/format";
import type { CategoryName, CreatorProfile, Tool, Workflow as WorkflowType } from "@/lib/types";

const clusterCategories: CategoryName[] = [
  "AI Coding",
  "AI Video",
  "AI Automation",
  "AI Research",
  "AI Agents",
  "AI Image",
  "AI Infrastructure",
  "AI Search"
];

function toolsForCategory(category: CategoryName) {
  return tools
    .filter((tool) => tool.categories.includes(category) || tool.category === category)
    .sort((a, b) => b.organicTrendingScore - a.organicTrendingScore);
}

function workflowsForCategory(categoryTools: Tool[]) {
  const slugs = new Set(categoryTools.map((tool) => tool.slug));
  return workflows
    .filter((workflow) => workflow.toolSlugs.some((slug) => slugs.has(slug)))
    .sort((a, b) => b.growth24h - a.growth24h)
    .slice(0, 2);
}

function creatorsForCategory(categoryTools: Tool[]) {
  const slugs = new Set(categoryTools.map((tool) => tool.slug));
  return creators.filter((creator) => creator.toolSlugs.some((slug) => slugs.has(slug))).slice(0, 5);
}

function relatedToolSlugs(tool: Tool) {
  return new Set(
    discoveryEdges
      .filter((edge) => edge.fromSlug === tool.slug || edge.toSlug === tool.slug)
      .flatMap((edge) => [edge.fromSlug, edge.toSlug])
      .filter((slug) => slug !== tool.slug)
  );
}

function pairedTools() {
  return discoveryEdges
    .map((edge) => {
      const from = tools.find((tool) => tool.slug === edge.fromSlug);
      const to = tools.find((tool) => tool.slug === edge.toSlug);
      return from && to ? { edge, from, to } : null;
    })
    .filter(Boolean)
    .slice(0, 5) as Array<{ edge: (typeof discoveryEdges)[number]; from: Tool; to: Tool }>;
}

export default function HeatmapPage() {
  const clusterModels = clusterCategories.map((category) => {
    const categoryTools = toolsForCategory(category);
    const categoryMeta = categories.find((item) => item.name === category);
    return {
      category,
      color: ecosystemColorFor(category),
      movement: categoryMeta?.growth24h ?? Math.round(categoryTools.reduce((sum, tool) => sum + tool.growth24h, 0) / Math.max(categoryTools.length, 1)),
      tools: categoryTools.slice(0, 5),
      workflows: workflowsForCategory(categoryTools),
      creators: creatorsForCategory(categoryTools),
      totalTools: categoryTools.length
    };
  });

  const breakingOut = tools.filter((tool) => tool.lifecycleState === "Breaking Out").sort((a, b) => b.growth24h - a.growth24h).slice(0, 5);
  const creatorAdoption = [...tools].sort((a, b) => b.creatorMentions - a.creatorMentions).slice(0, 5);
  const workflowAdds = [...tools].sort((a, b) => b.workflowInclusions - a.workflowInclusions).slice(0, 5);
  const emergingEcosystems = [...categories].sort((a, b) => b.growth24h - a.growth24h).slice(0, 5);
  const pairs = pairedTools();

  return (
    <div className="heatmapExplorerPage">
      <section className="heatmapControlRow">
        <div className="heatmapControls" aria-label="Heatmap controls">
          <span>24H</span>
          <span>Organic movers</span>
          <span>All ecosystems</span>
          <span>Momentum sort</span>
          <label><Search size={13} /> Search map</label>
        </div>
      </section>

      <section className="heatmapExplorerLayout">
        <main className="ecosystemMapSurface">
          {clusterModels.map((cluster) => (
            <EcosystemCluster key={cluster.category} {...cluster} />
          ))}
        </main>

        <aside className="heatmapIntelRail">
          <IntelCard title="Breaking out now" icon={<Activity size={14} />}>
            {breakingOut.map((tool) => <ToolSignalRow tool={tool} key={tool.slug} />)}
          </IntelCard>
          <IntelCard title="Fastest creator adoption" icon={<Users size={14} />}>
            {creatorAdoption.map((tool) => <ToolSignalRow tool={tool} detail={`${tool.creatorMentions} creator signals`} key={tool.slug} />)}
          </IntelCard>
          <IntelCard title="Most added to workflows" icon={<Workflow size={14} />}>
            {workflowAdds.map((tool) => <ToolSignalRow tool={tool} detail={`${tool.workflowInclusions} workflow signals`} key={tool.slug} />)}
          </IntelCard>
          <IntelCard title="Most paired tools" icon={<GitBranch size={14} />}>
            {pairs.map(({ edge, from, to }) => (
              <Link href={`/tools/${from.slug}`} className="pairRow" key={edge.id}>
                <span><strong>{from.name}</strong><small>{to.name}</small></span>
                <em>{edge.strength}</em>
              </Link>
            ))}
          </IntelCard>
          <IntelCard title="Attention rotation" icon={<Layers3 size={14} />}>
            {emergingEcosystems.map((category) => (
              <Link href={`/categories/${category.slug}`} className="rotationSignalRow" key={category.slug}>
                <span>{displayCategory(category.name)}</span>
                <MovementBadge value={category.growth24h} />
              </Link>
            ))}
          </IntelCard>
        </aside>
      </section>
    </div>
  );
}

function EcosystemCluster({ category, color, movement, tools: clusterTools, workflows: clusterWorkflows, creators: clusterCreators, totalTools }: {
  category: CategoryName;
  color: string;
  movement: number;
  tools: Tool[];
  workflows: WorkflowType[];
  creators: CreatorProfile[];
  totalTools: number;
}) {
  return (
    <section className="ecosystemCluster" style={{ "--cluster-color": color } as Record<string, string>}>
      <header>
        <div>
          <Link href={`/categories/${slugify(category)}`}>{displayCategory(category)}</Link>
          <small>{totalTools} tracked tools · {clusterCreators.length || "relationships forming"} creators</small>
        </div>
        <MovementBadge value={movement} />
      </header>

      <div className="clusterToolGrid">
        {clusterTools.map((tool) => (
          <ToolNode tool={tool} relatedSlugs={relatedToolSlugs(tool)} key={tool.slug} />
        ))}
      </div>

      <div className="clusterMetaLayer">
        <div className="creatorDensityLayer">
          <span>{clusterCreators.length ? `${clusterCreators.length} creator signals` : "Creator adoption emerging"}</span>
          <div>
            {clusterCreators.map((creator) => (
              <Link href={`/creators/${creator.id}`} key={creator.id} aria-label={creator.name}>
                <CreatorAvatar name={creator.name} src={creator.avatarUrl} size={20} />
              </Link>
            ))}
          </div>
        </div>
        <div className="workflowLayer">
          {clusterWorkflows.length ? clusterWorkflows.map((workflow) => (
            <Link href={`/workflows/${workflow.slug}`} key={workflow.slug}>
              <WorkflowStack toolSlugs={workflow.toolSlugs} limit={4} />
              <span>{toolsForWorkflow(workflow).map((tool) => tool.name).slice(0, 4).join(" · ")}</span>
            </Link>
          )) : <p>Ecosystem relationships still forming.</p>}
        </div>
      </div>
    </section>
  );
}

function ToolNode({ tool, relatedSlugs }: { tool: Tool; relatedSlugs: Set<string> }) {
  return (
    <Link className="ecosystemToolNode" href={`/tools/${tool.slug}`} data-related={[...relatedSlugs].join(" ")}>
      <ToolLogo officialSrc={tool.officialLogoUrl} src={tool.logoUrl} faviconSrc={tool.faviconUrl} fallback={tool.iconUrl} alt="" size={24} />
      <span><strong>{tool.name}</strong><small>{tool.lifecycleState}</small></span>
      <MovementBadge value={tool.growth24h} />
    </Link>
  );
}

function IntelCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <section className="heatmapIntelCard"><h2>{icon}{title}</h2><div>{children}</div></section>;
}

function ToolSignalRow({ tool, detail }: { tool: Tool; detail?: string }) {
  return (
    <Link href={`/tools/${tool.slug}`} className="toolSignalRow">
      <ToolLogo officialSrc={tool.officialLogoUrl} src={tool.logoUrl} faviconSrc={tool.faviconUrl} fallback={tool.iconUrl} alt="" size={24} />
      <span><strong>{tool.name}</strong><small>{detail || displayCategory(tool.category)}</small></span>
      <MovementBadge value={tool.growth24h} />
    </Link>
  );
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
