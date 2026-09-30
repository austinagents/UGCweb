import { notFound } from "next/navigation";
import { CreatorCard } from "@/components/creator-card";
import { MovementBadge } from "@/components/movement-badge";
import { ToolTable } from "@/components/tool-table";
import { WorkflowStack } from "@/components/workflow-stack";
import { creatorTagSlug } from "@/lib/creator-tags";
import { categories, creators, tools, toolsForWorkflow, workflows } from "@/lib/data";
import { ecosystemColorStyle } from "@/lib/ecosystem-colors";
import { ecosystemTagBySlug, ecosystemTags } from "@/lib/ecosystem-tags";
import { displayCategory } from "@/lib/format";
import type { CategoryName, Tool, Workflow } from "@/lib/types";

export function generateStaticParams() {
  return ecosystemTags.map((tag) => ({ tag: tag.slug }));
}

export default function EcosystemTagPage({ params }: { params: { tag: string } }) {
  const tag = ecosystemTagBySlug(params.tag);
  if (!tag) notFound();

  const matchingCreators = creators.filter((creator) => {
    const creatorTags = [creator.primarySpecialization, ...creator.specializationTags].filter(Boolean);
    return creatorTags.some((creatorTag) => creatorTagSlug(creatorTag as NonNullable<typeof creator.primarySpecialization>) === tag.slug)
      || creatorTags.some((creatorTag) => tag.categories.includes(creatorCategoryFor(creatorTag as string)));
  });

  const matchingTools = tools.filter((tool) => toolMatchesTag(tool, tag.label, tag.slug, tag.categories));
  const matchingWorkflows = workflows.filter((workflow) => workflowMatchesTag(workflow, tag.label, tag.slug, matchingTools));
  const relatedCategories = categories.filter((category) => tag.categories.includes(category.name));

  return (
    <div className="stack">
      <section className="detailHeader compactHeader" style={ecosystemColorStyle(tag.categories[0] ?? tag.label)}>
        <div>
          <p className="eyebrow">Ecosystem tag</p>
          <h1>{tag.label}</h1>
          <p>{tag.cluster ? `${tag.cluster} tag across creators, tools, workflows, and related categories.` : "Unified ecosystem tag across creators, tools, workflows, and related categories."}</p>
        </div>
      </section>

      <section className="terminalStatus">
        <Metric label="Creators" value={matchingCreators.length} />
        <Metric label="Tools" value={matchingTools.length} />
        <Metric label="Workflows" value={matchingWorkflows.length} />
        <Metric label="Categories" value={relatedCategories.length} />
      </section>

      <section>
        <div className="sectionHeader"><h2>Related Tools</h2></div>
        {matchingTools.length ? <ToolTable tools={matchingTools} /> : <p className="emptyState">No accepted tools are currently mapped to {tag.label}.</p>}
      </section>

      <section className="gridTwo">
        <div>
          <div className="sectionHeader"><h2>Related Creators</h2></div>
          {matchingCreators.length ? (
            <div className="creatorGrid">
              {matchingCreators.map((creator) => <CreatorCard creator={creator} key={creator.id} />)}
            </div>
          ) : (
            <p className="emptyState">No accepted creators are currently tagged with {tag.label}.</p>
          )}
        </div>

        <div>
          <div className="sectionHeader"><h2>Related Categories</h2></div>
          <div className="miniList">
            {relatedCategories.length ? relatedCategories.map((category) => (
              <a className="miniRow" href={`/categories/${category.slug}`} key={category.id}>
                <span><strong>{displayCategory(category.name)}</strong><small>{category.toolsTracked} tools tracked</small></span>
                <MovementBadge value={category.growth24h} />
              </a>
            )) : <p className="emptyState">No broad categories are mapped yet.</p>}
          </div>
        </div>
      </section>

      <section>
        <div className="sectionHeader"><h2>Related Workflows</h2></div>
        <div className="workflowGrid">
          {matchingWorkflows.length ? matchingWorkflows.map((workflow) => (
            <a className="workflowRow" href={`/workflows/${workflow.slug}`} key={workflow.id}>
              <WorkflowStack toolSlugs={workflow.toolSlugs} />
              <span><strong>{workflow.name}</strong><small>{workflow.outcome}</small></span>
              <MovementBadge value={workflow.growth24h} />
            </a>
          )) : <p className="emptyState">No workflows are currently mapped to {tag.label}.</p>}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function creatorCategoryFor(tag: string): CategoryName {
  return tag === "AI Workflows" ? "AI Workflow" : tag as CategoryName;
}

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function toolMatchesTag(tool: Tool, label: string, slug: string, mappedCategories: CategoryName[]) {
  const toolTagSlugs = [...tool.tags, ...tool.subCategoryTags, tool.name].map(normalized);
  return mappedCategories.some((category) => tool.categories.includes(category))
    || tool.subCategoryTags.some((subCategory) => normalized(subCategory) === slug)
    || toolTagSlugs.includes(slug)
    || toolTagSlugs.includes(normalized(label));
}

function workflowMatchesTag(workflow: Workflow, label: string, slug: string, matchingTools: Tool[]) {
  const workflowText = normalized(`${workflow.name} ${workflow.description} ${workflow.outcome}`);
  const matchingToolSlugs = new Set(matchingTools.map((tool) => tool.slug));
  return workflowText.includes(slug)
    || workflowText.includes(normalized(label))
    || workflow.toolSlugs.some((toolSlug) => matchingToolSlugs.has(toolSlug))
    || toolsForWorkflow(workflow).some((tool) => matchingToolSlugs.has(tool.slug));
}
