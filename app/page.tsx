import Link from "next/link";
import type { ReactNode } from "react";
import { CreatorAvatar } from "@/components/creator-avatar";
import { BoostPanel } from "@/components/boost-panel";
import { HomeTrendingFilter } from "@/components/home-trending-filter";
import { ToolLogo } from "@/components/tool-logo";
import { WorkflowStack } from "@/components/workflow-stack";
import { boostTiers, creatorIntelligenceStatus, creators, movementEvents, tools, workflows } from "@/lib/data";
import { creatorTagDisplayLabel } from "@/lib/creator-tags";
import { displayCategory } from "@/lib/format";

export default function DiscoverPage({ searchParams }: { searchParams: { mode?: string; category?: string; heatmap_category?: string } }) {
  const newlyListedSlugs = ["wingbits-ai", "integuru", "branda", "crewai", "voxdeck"];
  const newLaunches = newlyListedSlugs.flatMap((slug) => tools.find((tool) => tool.slug === slug) ?? []);
  return (
    <div className="homeStack">
      <HomeTrendingFilter initialMode={searchParams.mode} initialCategory={searchParams.category} initialHeatmapCategory={searchParams.heatmap_category} />
      <section className="homeSecondary">
        <BoostPanel tiers={boostTiers} />
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
