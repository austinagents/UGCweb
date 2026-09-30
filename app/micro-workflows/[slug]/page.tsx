import { notFound } from "next/navigation";
import { WorkflowProcessTabs } from "@/components/workflow-process-tabs";
import { WorkflowStack } from "@/components/workflow-stack";
import { evidenceSourcesForTool, tools } from "@/lib/data";
import type { Tool, ToolEvidenceSource } from "@/lib/types";

type MicroWorkflowPair = {
  slug: string;
  tools: [Tool, Tool];
  evidenceItems: ToolEvidenceSource[];
};

export function generateStaticParams() {
  return microWorkflowPairs().map((pair) => ({ slug: pair.slug }));
}

export default function MicroWorkflowDetailPage({ params }: { params: { slug: string } }) {
  const pair = microWorkflowPairs().find((item) => item.slug === params.slug);
  if (!pair) notFound();

  return (
    <div className="stack">
      <section className="detailHeader">
        <div>
          <p className="eyebrow">Micro Workflow</p>
          <h1>{pair.tools.map((tool) => tool.name).join(" + ")}</h1>
          <p>Exact two-tool connection detected across public receipts.</p>
        </div>
      </section>

      <section className="terminalStatus">
        <Metric label="Receipts" value={pair.evidenceItems.length.toLocaleString()} />
        <Metric label="Sources" value={sourceTypesFor(pair.evidenceItems).length.toLocaleString()} />
        <Metric label="Tools" value="2" />
        <WorkflowStack toolSlugs={pair.tools.map((tool) => tool.slug)} limit={2} />
      </section>

      <MicroWorkflowBreakdown pair={pair} />

      <section className="toolIntelPanel">
        <div className="toolPanelHeader">
          <div><h2>Proof Sources</h2><p>Public receipts matching exactly this two-tool micro workflow.</p></div>
        </div>
        {pair.evidenceItems.length ? (
          <div className="toolEvidenceRow">
            {sourceTypesFor(pair.evidenceItems).map((sourceType) => (
              <article className="toolEvidenceCard" key={sourceType}>
                <div className="toolReceiptSourceHeader"><span>{sourceTypeIcon(sourceType)}</span><strong>{sourceTypeLabel(sourceType)}</strong></div>
                <div className="toolReceiptPreviewList">
                  {pair.evidenceItems.filter((item) => item.sourceType === sourceType).slice(0, 3).map((item) => (
                    <article className="toolReceiptPreview" key={item.id}>
                      {item.sourceImageUrl ? <img src={item.sourceImageUrl} alt="" /> : null}
                      <div className="toolEvidenceIdentity"><strong>{item.sourceAuthor || item.platformLabel}</strong><p>{item.sourceTitle}</p></div>
                      {item.snippet ? <p className="toolEvidenceSnippet">{item.snippet}</p> : null}
                      <a className="toolReportCta" href={item.sourceUrl} target="_blank" rel="noreferrer">Open source →</a>
                    </article>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="emptyState">No proof sources are indexed for this exact two-tool micro workflow yet.</p>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function MicroWorkflowBreakdown({ pair }: { pair: MicroWorkflowPair }) {
  const steps = pair.tools.map((tool, index) => {
    const otherTool = pair.tools[index === 0 ? 1 : 0];
    return {
      toolSlug: tool.slug,
      toolName: tool.name,
      officialLogoUrl: tool.officialLogoUrl,
      logoUrl: tool.logoUrl,
      faviconUrl: tool.faviconUrl,
      iconUrl: tool.iconUrl,
      task: whatToDoForTool(tool, otherTool),
      lookFor: whatToLookForTool(tool),
      output: outputForTool(tool),
      connection: whyStepMattersForTool(tool, otherTool)
    };
  });

  return (
    <section className="workflowProcess">
      <div className="sectionHeader">
        <h2>How This Micro Workflow Breaks Down</h2>
        <p>Two actionable steps showing what each tool contributes to this exact connection.</p>
      </div>
      <WorkflowProcessTabs steps={steps} />
    </section>
  );
}

function microWorkflowPairs(): MicroWorkflowPair[] {
  const knownTools = new Map(tools.map((tool) => [normalizeToolName(tool.name), tool]));
  const groups = new Map<string, { tools: [Tool, Tool]; evidenceItems: ToolEvidenceSource[] }>();

  tools.forEach((tool) => {
    evidenceSourcesForTool(tool.slug).forEach((source) => {
      if (source.matchedTools.length !== 2) return;
      const pairTools = source.matchedTools
        .map((toolName) => knownTools.get(normalizeToolName(toolName)))
        .filter(isTool)
        .filter((matchedTool, index, list) => list.findIndex((candidate) => candidate.slug === matchedTool.slug) === index)
        .sort((a, b) => a.slug.localeCompare(b.slug));

      if (pairTools.length !== 2) return;
      const slug = microWorkflowPairSlug(pairTools.map((pairTool) => pairTool.slug));
      const existing = groups.get(slug);
      if (existing) {
        existing.evidenceItems.push(source);
        return;
      }
      groups.set(slug, {
        tools: [pairTools[0], pairTools[1]],
        evidenceItems: [source]
      });
    });
  });

  return [...groups.entries()].map(([slug, group]) => ({
    slug,
    tools: group.tools,
    evidenceItems: [...new Map(group.evidenceItems.map((item) => [item.id, item])).values()]
      .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
  }));
}

function sourceTypesFor(evidenceItems: ToolEvidenceSource[]) {
  const ordered: ToolEvidenceSource["sourceType"][] = ["x", "youtube", "github", "news", "newsletter_blog", "article", "directory", "docs", "official", "other"];
  return ordered.filter((sourceType) => evidenceItems.some((item) => item.sourceType === sourceType));
}

function sourceTypeLabel(type: ToolEvidenceSource["sourceType"]) {
  if (type === "x") return "X";
  if (type === "youtube") return "YouTube";
  if (type === "github") return "GitHub";
  if (type === "docs") return "Docs";
  if (type === "official") return "Official";
  if (type === "news") return "News";
  if (type === "newsletter_blog") return "Newsletter / Blog";
  if (type === "directory") return "Directory";
  if (type === "article") return "Article";
  return "Other";
}

function sourceTypeIcon(type: ToolEvidenceSource["sourceType"]) {
  if (type === "youtube") return "YT";
  if (type === "github") return "GH";
  if (type === "newsletter_blog") return "NB";
  if (type === "directory") return "DIR";
  return sourceTypeLabel(type).slice(0, 2).toUpperCase();
}

function microWorkflowPairSlug(toolSlugs: string[]) {
  return [...toolSlugs].sort().join("-");
}

function normalizeToolName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function isTool(item: Tool | undefined): item is Tool {
  return Boolean(item);
}

function whatToDoForTool(tool: Tool, otherTool: Tool) {
  const name = tool.name.toLowerCase();
  if (name.includes("chatgpt")) return "Use ChatGPT to draft the script, structure the message, generate variations, or refine the prompt/content logic.";
  if (name.includes("claude")) return `Use Claude to reason through the task, structure the logic, and prepare the instructions or content that ${otherTool.name} can act on.`;
  if (name.includes("perplexity")) return "Use Perplexity to gather sourced context, examples, and research inputs before the second tool executes or packages the work.";
  if (name.includes("n8n")) return "Use n8n to automate the execution layer, connect apps/services, and turn the reasoning output into a repeatable flow.";
  if (name.includes("cursor")) return "Use Cursor to turn the plan, prompt, or requirements into working code inside the development environment.";
  if (name.includes("vercel")) return "Use Vercel to publish, host, and validate the working output in a live environment.";
  if (name.includes("elevenlabs")) return "Use ElevenLabs to turn the script into realistic voice/audio.";
  if (name.includes("heygen")) return "Use HeyGen to turn the script, voice, or assets into an avatar-led video output.";
  return `Use ${tool.name} to handle the ${cleanCategory(tool.category).toLowerCase()} layer before passing the result to ${otherTool.name}.`;
}

function whatToLookForTool(tool: Tool) {
  const name = tool.name.toLowerCase();
  if (name.includes("chatgpt")) return "Clear language, reusable structure, strong hook, concise pacing, and content that can move cleanly into the next tool.";
  if (name.includes("claude")) return "Sound reasoning, clear constraints, complete task logic, and instructions that are specific enough to execute.";
  if (name.includes("perplexity")) return "Credible sources, useful examples, current context, and a concise research packet with low noise.";
  if (name.includes("n8n")) return "Reliable triggers, clean app connections, mapped inputs/outputs, and a workflow that can run repeatedly.";
  if (name.includes("cursor")) return "Working code, clear file changes, coherent implementation, and a result that can be tested or shipped.";
  if (name.includes("vercel")) return "A successful deployment, working production settings, and a live URL that behaves like the local build.";
  if (name.includes("elevenlabs")) return "Voice quality, pacing, emotion, clarity, pronunciation, and whether the audio matches the intended format.";
  if (name.includes("heygen")) return "Avatar delivery, timing, visual quality, scene framing, and whether the video matches the intended message.";
  return "A clean output, clear handoff point, and enough structure for the second tool to use without extra cleanup.";
}

function outputForTool(tool: Tool) {
  const name = tool.name.toLowerCase();
  if (name.includes("chatgpt")) return "A ready-to-use script, prompt, outline, or content sequence.";
  if (name.includes("claude")) return "A structured reasoning pass, implementation plan, task logic, or instruction set.";
  if (name.includes("perplexity")) return "A sourced research packet, context brief, or evidence-backed input set.";
  if (name.includes("n8n")) return "A repeatable automation flow with connected triggers, actions, and handoffs.";
  if (name.includes("cursor")) return "A working code change, prototype, or implementation path.";
  if (name.includes("vercel")) return "A deployed URL or production-ready preview.";
  if (name.includes("elevenlabs")) return "A generated voiceover or audio file.";
  if (name.includes("heygen")) return "An avatar video, presenter clip, or generated video asset.";
  return `A ${cleanCategory(tool.category).toLowerCase()} output ready for the next tool.`;
}

function whyStepMattersForTool(tool: Tool, otherTool: Tool) {
  const name = tool.name.toLowerCase();
  if (name.includes("chatgpt")) return `ChatGPT defines the reasoning/content layer before ${otherTool.name} turns it into the next operational asset.`;
  if (name.includes("claude")) return `Claude sharpens the reasoning layer so ${otherTool.name} receives cleaner logic, instructions, or content.`;
  if (name.includes("perplexity")) return `Perplexity grounds the workflow in public context before ${otherTool.name} uses it downstream.`;
  if (name.includes("n8n")) return `n8n turns the upstream logic from ${otherTool.name} into a repeatable automated operation.`;
  if (name.includes("cursor")) return `Cursor converts the upstream plan or logic from ${otherTool.name} into working software.`;
  if (name.includes("vercel")) return `Vercel makes the output from ${otherTool.name} reachable, testable, and shareable.`;
  if (name.includes("elevenlabs")) return `ElevenLabs converts the text/content layer from ${otherTool.name} into the final audio layer.`;
  if (name.includes("heygen")) return `HeyGen turns the upstream content from ${otherTool.name} into a finished video layer.`;
  return `${tool.name} provides the ${cleanCategory(tool.category).toLowerCase()} step that makes the handoff with ${otherTool.name} useful.`;
}

function cleanCategory(category: string) {
  return category.replace(/^AI\s+/i, "");
}
