import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AttentionChart } from "@/components/chart";
import { CategoryHeatmap } from "@/components/heatmap";
import { MovementBadge } from "@/components/movement-badge";
import { SaveButton } from "@/components/save-button";
import { TimeframeToggle } from "@/components/timeframe-toggle";
import { ToolTable } from "@/components/tool-table";
import { WorkflowStack } from "@/components/workflow-stack";
import { categories, categoryTools, getCategory, workflows } from "@/lib/data";
import { displayCategory } from "@/lib/format";

export function generateStaticParams() {
  return categories.map((category) => ({ slug: category.slug }));
}

export default function CategoryPage({ params }: { params: { slug: string } }) {
  const category = getCategory(params.slug);
  if (!category) notFound();
  const scopedTools = categoryTools(category.slug);
  const fastest = [...scopedTools].sort((a, b) => b.growth24h - a.growth24h);
  const relatedWorkflows = workflows.filter((workflow) => workflow.toolSlugs.some((slug) => scopedTools.some((tool) => tool.slug === slug)));

  return (
    <div className="stack">
      <section className="detailHeader">
        <div>
          <p className="eyebrow">Sector dashboard</p>
          <h1>{displayCategory(category.name)}</h1>
          <p>{category.description}</p>
        </div>
        <SaveButton kind="categories" id={category.slug} />
      </section>
      <section className="terminalStatus">
        <Metric label="Momentum Score" value={category.momentumScore} />
        <Metric label="24h" value={<MovementBadge value={category.growth24h} />} />
        <Metric label="7d" value={<MovementBadge value={category.growth7d} />} />
        <Metric label="Tools tracked" value={category.toolsTracked} />
        <TimeframeToggle compact />
      </section>
      <AttentionChart data={category.sparkline.concat(category.sparkline.map((value) => value + 8))} title={`${displayCategory(category.name)} Momentum`} />
      <section className="gridTwo wideLeft">
        <div><div className="sectionHeader"><h2>Top Tools</h2><TimeframeToggle compact /></div><ToolTable tools={scopedTools} /></div>
        <aside className="sidePanel">
          <div className="panelHeader"><h2>Fastest Growing</h2></div>
          {fastest.map((tool) => <a className="miniRow" href={`/tools/${tool.slug}`} key={tool.slug}><span><strong>{tool.name}</strong><small>{tool.lifecycleState}</small></span><MovementBadge value={tool.growth24h} /></a>)}
        </aside>
      </section>
      <section className="gridTwo">
        <div><div className="sectionHeader"><h2>Category Heatmap Row</h2></div><CategoryHeatmap categories={categories} /></div>
        <div>
          <div className="sectionHeader"><h2>Creator Cluster</h2></div>
          <div className="feed">
            <p className="emptyState">Category-level creator relationships are pending verification. Accepted creators are available in the creator graph.</p>
          </div>
        </div>
      </section>
      <section><div className="sectionHeader"><h2>Related Workflows</h2></div><div className="workflowGrid">{relatedWorkflows.map((workflow) => <a className="workflowRow" href={`/workflows/${workflow.slug}`} key={workflow.id}><WorkflowStack toolSlugs={workflow.toolSlugs} /><span><strong>{workflow.name}</strong><small>{workflow.outcome}</small></span><MovementBadge value={workflow.growth24h} /></a>)}</div></section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}
