"use client";

import { useMemo, useState } from "react";
import { Sparkline } from "@/components/sparkline";
import { TimeframeToggle } from "@/components/timeframe-toggle";
import { ToolLogo } from "@/components/tool-logo";
import { tools } from "@/lib/data";

const metrics = [
  ["Momentum", "momentumScore"],
  ["24h growth", "growth24h"],
  ["7d growth", "growth7d"],
  ["Mentions", "mentions24h"],
  ["Saves", "savesCount"],
  ["Workflow inclusion", "workflowInclusions"]
] as const;

export default function ComparePage() {
  const [selected, setSelected] = useState(["chatgpt", "claude", "cursor"]);
  const selectedTools = useMemo(() => tools.filter((tool) => selected.includes(tool.slug)), [selected]);

  function toggle(slug: string) {
    setSelected((current) => current.includes(slug) ? current.filter((item) => item !== slug) : current.length < 4 ? [...current, slug] : current);
  }

  return (
    <div className="stack">
      <section className="terminalStatus">
        <div className="statusIdentity"><strong>Compare Terminal</strong><span>LIVE</span></div>
        <div className="metric hotMetric"><span>suggested matchup</span><strong>Cursor vs Windsurf</strong></div>
        <div className="metric"><span>selected</span><strong>{selectedTools.length}/4</strong></div>
        <TimeframeToggle compact />
      </section>
      <div className="pickerGrid">
        {tools.slice(0, 18).map((tool) => <button className={selected.includes(tool.slug) ? "selected" : ""} onClick={() => toggle(tool.slug)} key={tool.slug}><ToolLogo officialSrc={tool.officialLogoUrl} src={tool.logoUrl} faviconSrc={tool.faviconUrl} fallback={tool.iconUrl} alt="" size={24} />{tool.name}</button>)}
      </div>
      <section className="compareChart">
        {selectedTools.map((tool) => <div className="compareColumn" key={tool.slug}><ToolLogo officialSrc={tool.officialLogoUrl} src={tool.logoUrl} faviconSrc={tool.faviconUrl} fallback={tool.iconUrl} alt="" size={24} /><strong>{tool.name}</strong><small>{tool.lifecycleState}</small><span style={{ height: `${tool.momentumScore}%` }} /><Sparkline data={tool.sparkline} /></div>)}
      </section>
      <div className="tableWrap">
        <table className="terminalTable">
          <thead><tr><th>Metric</th>{selectedTools.map((tool) => <th key={tool.slug}>{tool.name}</th>)}</tr></thead>
          <tbody>
            {metrics.map(([label, key]) => <tr key={key}><td>{label}</td>{selectedTools.map((tool) => <td key={tool.slug}>{tool[key].toLocaleString()}{key.includes("growth") ? "%" : ""}</td>)}</tr>)}
            <tr><td>Category</td>{selectedTools.map((tool) => <td key={tool.slug}>{tool.category.replace(/^AI\s+/, "")}</td>)}</tr>
            <tr><td>Lifecycle state</td>{selectedTools.map((tool) => <td key={tool.slug}><span className="lifecycle">{tool.lifecycleState}</span></td>)}</tr>
          </tbody>
        </table>
      </div>
      <section className="narrativeGrid">
        <span>Decision read: compare momentum, workflow inclusion, category position, and lifecycle before choosing a stack.</span>
        <span>Workflow inclusion shows which tools are becoming operating systems, not just apps.</span>
      </section>
    </div>
  );
}
