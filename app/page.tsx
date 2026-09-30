import Link from "next/link";
import type { ReactNode } from "react";
import { CreatorAvatar } from "@/components/creator-avatar";
import { AttentionHeatmap } from "@/components/heatmap";
import { BoostPanel } from "@/components/boost-panel";
import { HomeTrendingFilter } from "@/components/home-trending-filter";
import { PromotedMomentumRail } from "@/components/promoted-momentum-rail";
import { ToolLogo } from "@/components/tool-logo";
import { WorkflowStack } from "@/components/workflow-stack";
import { attentionFeed, attentionSubCategories, boostTiers, categories, creatorIntelligenceStatus, creators, movementEvents, tools, workflows } from "@/lib/data";
import { creatorTagDisplayLabel } from "@/lib/creator-tags";
import { displayCategory } from "@/lib/format";

export default function DiscoverPage() {
  const newlyListedSlugs = ["wingbits-ai", "integuru", "branda", "crewai", "voxdeck"];
  const newLaunches = newlyListedSlugs.flatMap((slug) => tools.find((tool) => tool.slug === slug) ?? []);
  const narratives = [
    "AI video workflows are pulling creator attention away from static image generation.",
    "Coding agents are accelerating faster than general chat tools this week.",
    "Research stacks are spreading among founders using NotebookLM, Perplexity, and Claude."
  ];

  return (
    <div className="homeStack">
      <PromotedMomentumRail />

      <HomeTrendingFilter tools={tools}>
        <aside className="homeRail">
          <PreviewPanel href="/heatmap" title="Attention Heatmap" meta="">
            <AttentionHeatmap items={attentionSubCategories} />
          </PreviewPanel>
        </aside>
      </HomeTrendingFilter>

      <section className="homeSecondary">
        <div className="lowerDiscoveryRow">
          <PreviewPanel href="/creators" title="Creator Graph" meta="accepted creator taxonomy">
            {creatorIntelligenceStatus.publicReady ? creators.slice(0, 4).map((creator) => (
              <Link href={`/creators/${creator.id}`} className="miniRow creatorMini" key={creator.id}>
                <CreatorAvatar name={creator.name} src={creator.avatarUrl} size={24} />
                <span><strong>{creator.name}</strong><small>{creator.specializationTags.slice(0, 2).map(creatorTagDisplayLabel).join(" · ")}</small></span>
              </Link>
            )) : <p className="emptyState">Creator graph expanding. Accepted creators appear after identity and taxonomy review.</p>}
          </PreviewPanel>

          <PreviewPanel href="/workflows" title="Trending Workflows" meta="stacks spreading now">
            {workflows.slice(0, 4).map((workflow) => (
              <Link href={`/workflows/${workflow.slug}`} className="workflowPreview" key={workflow.id}>
                <WorkflowStack toolSlugs={workflow.toolSlugs} />
                <span><strong>{workflow.name}</strong></span>
              </Link>
            ))}
          </PreviewPanel>

          <PreviewPanel href="/events" title="Newly Listed" meta="recent products">
            <div className="launchRail">
              {newLaunches.map((tool) => (
                <Link href={`/tools/${tool.slug}`} className="miniRow creatorMini launchItem" key={tool.slug}>
                  <ToolLogo officialSrc={tool.officialLogoUrl} src={tool.logoUrl} faviconSrc={tool.faviconUrl} fallback={tool.iconUrl} alt="" size={26} />
                  <span><strong>{tool.name}</strong><small>{displayCategory(tool.category)}</small></span>
                </Link>
              ))}
            </div>
          </PreviewPanel>
        </div>
        <BoostPanel tiers={boostTiers} />
      </section>

      <section className="homeTertiary">
        <PreviewPanel href="/heatmap" title="Attention Rotation" meta="category pressure">
          {categories.slice(0, 4).map((category) => (
            <div className="rotationRow" key={category.slug}>
              <span>{displayCategory(category.name)}</span>
            </div>
          ))}
        </PreviewPanel>
        <PreviewPanel href="/moving" title="What's Moving" meta="live feed">
          {attentionFeed.slice(0, 4).map((item) => <FeedLine key={item.id} time={item.timestamp} title={item.title} />)}
        </PreviewPanel>
        <PreviewPanel href="/narratives" title="Micro Narratives" meta="today's read">
          {narratives.map((narrative) => <p className="editorialNote" key={narrative}>{narrative}</p>)}
        </PreviewPanel>
        <PreviewPanel href="/events" title="News & Events" meta="curated highlights">
          {movementEvents.slice(0, 4).map((event) => <FeedLine key={event.id} time={event.timestamp} title={event.title} />)}
        </PreviewPanel>
      </section>
    </div>
  );
}

function PreviewPanel({ title, meta, href, children }: { title: string; meta: string; href: string; children: ReactNode }) {
  return (
    <section className="previewPanel">
      <div className="panelHeader">
        <Link href={href}><h2>{title}</h2><small>{meta}</small></Link>
        <Link className="viewLink" href={href}>View all →</Link>
      </div>
      {children}
    </section>
  );
}

function FeedLine({ time, title }: { time: string; title: string }) {
  return <Link href="/moving" className="feedLine"><strong>{title}</strong><small>{time}</small></Link>;
}
