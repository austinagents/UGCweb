"use client";

import { useMemo, useState } from "react";
import { boostTiers, canonicalAliases, categories, creatorIntelligenceStatus, creators, featureFlags, importedCreators, importStats, ingestionSources, movementEvents, attentionFeed, promotionPlacements, tools, workflows } from "@/lib/data";
import { displayCategory } from "@/lib/format";
import { mvpListingRequirements, trustedDiscoverySources } from "@/lib/listing-policy";
import { ToolLogo } from "@/components/tool-logo";
import type { LifecycleState } from "@/lib/types";

const adminSections = [
  "Overview",
  "Tools",
  "Workflows",
  "Categories",
  "Creators",
  "Movement Events",
  "Signals",
  "Attention Feed",
  "Imports",
  "Moderation",
  "Logos",
  "Promotions",
  "Feature Flags",
  "Rankings",
  "Analytics",
  "Settings"
];

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [section, setSection] = useState("Overview");
  const [selected, setSelected] = useState<string[]>([]);
  const expected = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "appscreener-admin";
  const stats = useMemo(() => ({
    tools: tools.length,
    workflows: workflows.length,
    categories: categories.length,
    creators: creators.length,
    breaking: tools.filter((tool) => tool.lifecycleState === "Breaking Out").length,
    accepted: tools.filter((tool) => tool.listingStatus === "accepted").length,
    pendingReview: tools.filter((tool) => tool.listingStatus === "pending_review").length,
    campaigns: promotionPlacements.filter((placement) => placement.status === "active").length
  }), []);

  if (!unlocked) {
    return (
      <div className="adminGate">
        <h1>Admin</h1>
        <p>Enter the admin password from the environment.</p>
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Admin password" />
        <button onClick={() => setUnlocked(password === expected)}>Unlock</button>
      </div>
    );
  }

  return (
    <div className="adminShell">
      <aside className="adminSidebar">
        <strong>Admin OS</strong>
        {adminSections.map((item) => <button className={section === item ? "active" : ""} onClick={() => setSection(item)} key={item}>{item}</button>)}
      </aside>
      <main className="stack">
        <section className="terminalStatus">
          <div className="statusIdentity"><strong>{section}</strong><span>OPS</span></div>
          <Metric label="tools" value={stats.tools} />
          <Metric label="workflows" value={stats.workflows} />
          <Metric label="creators" value={stats.creators} />
          <Metric label="accepted" value={stats.accepted} />
          <Metric label="review" value={stats.pendingReview} />
          <Metric label="campaigns" value={stats.campaigns} />
        </section>
        {section === "Overview" && <Overview />}
        {section === "Tools" && <ToolsAdmin selected={selected} setSelected={setSelected} />}
        {section === "Workflows" && <AdminList title="Featured Workflows" items={workflows.map((workflow) => `${workflow.name} · ${workflow.momentumScore} momentum`)} actions={["set featured", "pin workflow", "edit stack"]} />}
        {section === "Categories" && <AdminList title="Category Rotation" items={categories.map((category) => `${displayCategory(category.name)} · ${category.growth24h}% 24h`)} actions={["edit category", "pin sector", "boost narrative"]} />}
        {section === "Creators" && <AdminList title="Creator Profiles" items={[`accepted · ${creatorIntelligenceStatus.accepted}`, `pending review · ${creatorIntelligenceStatus.pendingReview}`, ...importedCreators.map((creator) => `${creator.name} · ${creator.listingStatus} · ${creator.creatorScore} score · ${creator.platform}`)]} actions={["edit creator", "verify signal", "suppress creator"]} />}
        {section === "Movement Events" && <AdminList title="Movement Events" items={movementEvents.map((event) => `${event.eventType} · ${event.title}`)} actions={["create event", "attach to tool", "push to ticker"]} />}
        {section === "Signals" && <AdminList title="Signal Types" items={["creator relationship review", "workflow acceleration", "launch event", "trend shift", "category surge", "AI rotation event"]} actions={["create signal", "score signal", "merge duplicate"]} />}
        {section === "Attention Feed" && <AdminList title="Attention Feed" items={attentionFeed.map((item) => `${item.severity} · ${item.title}`)} actions={["publish", "mute", "attach alert"]} />}
        {section === "Imports" && <AdminList title="Ingestion Sources" items={[`imported products · ${importStats.totalImportedProducts}`, `accepted imports · ${importStats.acceptedImportedProducts}`, `pending review · ${importStats.pendingReviewProducts}`, `duplicate merges · ${importStats.duplicateMergeCount}`, `fallback logos · ${importStats.logoFallbackCount}`, `source coverage · ${importStats.sourceCoverage}`, ...ingestionSources.map((source) => `${source.enabled ? "on" : "off"} · ${source.sourceName} · ${source.sourceType}`)]} actions={["run import", "pause source", "view payloads"]} />}
        {section === "Moderation" && <AdminList title="MVP Listing Gate" items={[`trusted sources · ${trustedDiscoverySources.join(" / ")}`, ...mvpListingRequirements, ...tools.slice(0, 8).map((tool) => `${tool.name} · ${tool.listingStatus} · ${tool.trustedDiscoverySources.join(" + ")}`)]} actions={["verify source", "accept listing", "reject spam"]} />}
        {section === "Logos" && <AdminList title="Logo Queue" items={tools.slice(0, 12).map((tool) => `${tool.name} · ${tool.logoSource}`)} actions={["upload logo", "replace logo", "merge logo"]} />}
        {section === "Promotions" && <AdminList title="Boost Campaigns" items={[...promotionPlacements.map((placement) => `${placement.status} · ${placement.sponsorName} · ${placement.placement} · ${placement.momentumLift}% lift · ${placement.ctr}% CTR`), ...boostTiers.map((tier) => `${tier.label} package · ${tier.price} · ${tier.duration}`)]} actions={["approve campaign", "pause placement", "review analytics", "adjust weight"]} />}
        {section === "Feature Flags" && <AdminList title="Feature Flags" items={featureFlags.map((flag) => `${flag.enabled ? "enabled" : "off"} · ${flag.name}`)} actions={["toggle", "rollout", "disable"]} />}
        {section === "Rankings" && <AdminList title="Ranking Controls" items={tools.slice(0, 12).map((tool) => `${tool.name} · ${tool.organicRankingLabel} · trend ${tool.organicTrendingScore} · ${tool.sizeClass}`)} actions={["pin trending", "force breakout", "recompute"]} />}
        {section === "Analytics" && <AdminList title="Analytics" items={["daily active reviewers", "watchlist saves", "compare shares", "search opens", "ticker clicks"]} actions={["export", "inspect", "segment"]} />}
        {section === "Settings" && <AdminList title="Canonicalization" items={canonicalAliases.map((alias) => `${alias.alias} → ${alias.canonical}`)} actions={["merge aliases", "set canonical slug", "reconcile category"]} />}
      </main>
    </div>
  );
}

function Overview() {
  return (
    <section className="adminGrid">
      <AdminList title="Operating Loop" items={["verify Product Hunt or TAAFT provenance", "ingest signals", "canonicalize products", "rank momentum", "publish movement feed"]} actions={["run loop"]} />
      <AdminList title="Editorial Controls" items={["featured workflows", "featured tools", "homepage modules", "manual breakout boosts"]} actions={["edit modules"]} />
      <AdminList title="Alert Architecture" items={["breakout detection", "creator relationship changes", "workflow growth", "category momentum", "tool acceleration"]} actions={["create alert"]} />
      <AdminList title="Listing Policy" items={mvpListingRequirements} actions={["view policy"]} />
    </section>
  );
}

function ToolsAdmin({ selected, setSelected }: { selected: string[]; setSelected: (items: string[]) => void }) {
  function toggle(slug: string) {
    setSelected(selected.includes(slug) ? selected.filter((item) => item !== slug) : [...selected, slug]);
  }

  return (
    <section className="sidePanel">
      <div className="panelHeader"><h2>Tool Management</h2><div className="adminActions">{["create", "archive", "merge duplicates", "pin trending", "force breakout", "suppress low quality"].map((action) => <button key={action}>{action}</button>)}</div></div>
      <div className="tableWrap">
        <table className="terminalTable">
          <thead><tr><th></th><th>Tool</th><th>Source</th><th>Pricing</th><th>Lifecycle</th><th>Momentum</th><th>Quality</th><th>Eligibility</th><th>Actions</th></tr></thead>
          <tbody>
            {tools.map((tool) => (
              <tr key={tool.slug}>
                <td><input checked={selected.includes(tool.slug)} onChange={() => toggle(tool.slug)} type="checkbox" /></td>
                <td><span className="toolCell"><ToolLogo officialSrc={tool.officialLogoUrl} src={tool.logoUrl} faviconSrc={tool.faviconUrl} fallback={tool.iconUrl} alt="" /><strong>{tool.name}</strong></span></td>
                <td>{tool.trustedDiscoverySources.join(" + ")}</td>
                <td><span className={`pricingBadge ${tool.pricingType}`}>{tool.pricingType}</span></td>
                <td><span className={`lifecycle ${tool.lifecycleState.toLowerCase().replace(/\s/g, "-")}`}>{tool.lifecycleState}</span></td>
                <td><span className="score">{tool.momentumScore}</span></td>
                <td>{tool.qualityScore}</td>
                <td>{tool.boostEligible ? "boost + workflow + creator" : "not eligible"}</td>
                <td><button>edit metrics</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AdminList({ title, items, actions }: { title: string; items: string[]; actions: string[] }) {
  return <div className="sidePanel"><div className="panelHeader"><h2>{title}</h2></div><div className="adminActions">{actions.map((action) => <button key={action}>{action}</button>)}</div>{items.slice(0, 10).map((item) => <div className="miniRow" key={item}><span><strong>{item}</strong><small>admin control surface</small></span></div>)}</div>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}
