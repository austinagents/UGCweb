"use client";

import { useEffect, useState } from "react";
import { MovementBadge } from "@/components/movement-badge";
import { Sparkline } from "@/components/sparkline";
import Link from "next/link";
import { categories, creators, tools, workflows } from "@/lib/data";
import { displayCategory } from "@/lib/format";

export default function WatchlistPage() {
  const [saved, setSaved] = useState({ tools: [] as string[], workflows: [] as string[], categories: [] as string[], creators: [] as string[] });

  useEffect(() => {
    function load() {
      setSaved({
        tools: JSON.parse(localStorage.getItem("appscreener:tools") || "[]"),
        workflows: JSON.parse(localStorage.getItem("appscreener:workflows") || "[]"),
        categories: JSON.parse(localStorage.getItem("appscreener:categories") || "[]"),
        creators: JSON.parse(localStorage.getItem("appscreener:creators") || "[]")
      });
    }
    load();
    window.addEventListener("appscreener-watchlist", load);
    return () => window.removeEventListener("appscreener-watchlist", load);
  }, []);

  const savedTools = tools.filter((tool) => saved.tools.includes(tool.slug));
  const savedWorkflows = workflows.filter((workflow) => saved.workflows.includes(workflow.slug));
  const savedCategories = categories.filter((category) => saved.categories.includes(category.slug));
  const savedCreators = creators.filter((creator) => saved.creators.includes(creator.id));

  return (
    <div className="stack">
      <section className="terminalStatus">
        <div className="statusIdentity"><strong>Watchlist</strong><span>LOCAL</span></div>
        <div className="metric hotMetric"><span>local monitoring</span><strong>ready</strong></div>
        <div className="metric"><span>saved tools</span><strong>{savedTools.length}</strong></div>
        <div className="metric"><span>creators</span><strong>{savedCreators.length}</strong></div>
      </section>
      <section className="gridThree">
        <WatchPanel title="Tools" items={savedTools.map((tool) => ({ id: tool.slug, name: tool.name, meta: tool.lifecycleState, growth: tool.growth24h, sparkline: tool.sparkline }))} />
        <WatchPanel title="Workflows" items={savedWorkflows.map((workflow) => ({ id: workflow.slug, name: workflow.name, meta: workflow.outcome, growth: workflow.growth24h, sparkline: workflow.sparkline }))} />
        <WatchPanel title="Categories" items={savedCategories.map((category) => ({ id: category.slug, name: displayCategory(category.name), meta: `${category.toolsTracked} tools`, growth: category.growth24h, sparkline: category.sparkline }))} />
        <WatchPanel title="Creators" items={savedCreators.map((creator) => ({ id: creator.id, name: creator.name, meta: creator.specializationTags.slice(0, 2).join(" · "), growth: 0, sparkline: [] }))} />
      </section>
      <section>
        <div className="sectionHeader"><h2>Watchlist Preview</h2><p>Local monitoring for tools, creators, workflows, categories, and breakout movement.</p></div>
        <div className="gridThree">
          <MonitorLink href="/" title="Track Tools" text="Save products from the screener and monitor lifecycle or momentum changes." />
          <MonitorLink href="/creators" title="Track Creators" text="Follow canonical creator clusters without implying verified tool usage." />
          <MonitorLink href="/workflows" title="Track Workflows" text="Watch stack composition, category mix, and workflow movement." />
          <MonitorLink href="/heatmap" title="Open Heatmap" text="Monitor sector rotation and category pressure." />
          <MonitorLink href="/breaking-out" title="See Breaking Out" text="Review tools with high movement-model acceleration." />
          <MonitorLink href="/narratives" title="Follow Narratives" text="Track movement previews and ecosystem theses." />
        </div>
      </section>
    </div>
  );
}

function WatchPanel({ title, items }: { title: string; items: { id: string; name: string; meta: string; growth: number; sparkline: number[] }[] }) {
  return (
    <div className="sidePanel">
      <div className="panelHeader"><h2>{title}</h2></div>
      {items.length ? items.map((item) => <div className="miniRow" key={item.id}><span><strong>{item.name}</strong><small>{item.meta}</small></span>{item.growth ? <MovementBadge value={item.growth} /> : null}{item.sparkline.length ? <Sparkline data={item.sparkline} /> : null}</div>) : <p className="emptyState">Nothing saved yet. Use Save on tools, workflows, categories, or creators to build a local monitoring view.</p>}
    </div>
  );
}

function MonitorLink({ href, title, text }: { href: string; title: string; text: string }) {
  return <Link className="sidePanel" href={href}><div className="panelHeader"><h2>{title}</h2></div><p className="emptyState">{text}</p></Link>;
}
