import { MovementBadge } from "@/components/movement-badge";
import { Sparkline } from "@/components/sparkline";
import { TimeframeToggle } from "@/components/timeframe-toggle";
import { ToolTable } from "@/components/tool-table";
import { ToolLogo } from "@/components/tool-logo";
import { breakingOutTools, categories, movementEvents, tools } from "@/lib/data";
import { displayCategory } from "@/lib/format";

export default function BreakingOutPage() {
  const emerging = tools.filter((tool) => tool.mentions24h < 850 && tool.growth24h > 25).slice(0, 8);
  const established = tools.filter((tool) => tool.mentions24h >= 850 && tool.growth24h > 10).slice(0, 8);

  return (
    <div className="stack">
      <section className="terminalStatus">
        <div className="statusIdentity"><strong>Breaking Out</strong><span>MODEL</span></div>
        <div className="metric hotMetric"><span>active breakouts</span><strong>{breakingOutTools.length}</strong></div>
        <div className="metric"><span>top acceleration</span><strong>+{breakingOutTools[0]?.growth24h}%</strong></div>
        <div className="metric"><span>leader</span><strong>{breakingOutTools[0]?.name}</strong></div>
        <TimeframeToggle compact />
      </section>

      <section className="gridTwo wideLeft">
        <div><div className="sectionHeader"><h1>Full Breakout Rankings</h1><p>Products with unusual acceleration in the local momentum model.</p></div><ToolTable tools={breakingOutTools.concat(emerging)} /></div>
        <aside className="previewPanel">
          <div className="panelHeader"><h2>Why They’re Moving</h2><small>movement drivers</small></div>
          {movementEvents.map((event) => <div className="feedLine" key={event.id}><strong>{event.title}</strong><small>{event.description}</small></div>)}
        </aside>
      </section>

      <section className="gridTwo">
        <div className="previewPanel">
          <div className="panelHeader"><h2>Emerging Breakouts</h2><small>early movement</small></div>
          {emerging.map((tool) => <BreakoutRow tool={tool} key={tool.slug} />)}
        </div>
        <div className="previewPanel">
          <div className="panelHeader"><h2>Established Acceleration</h2><small>larger tools moving again</small></div>
          {established.map((tool) => <BreakoutRow tool={tool} key={tool.slug} />)}
        </div>
      </section>

      <section className="previewPanel">
        <div className="panelHeader"><h2>Category Rotation Behind Breakouts</h2><small>sector pressure</small></div>
        <div className="rotationGrid">{categories.slice(0, 8).map((category) => <div className="rotationRow" key={category.slug}><span>{displayCategory(category.name)}</span><MovementBadge value={category.growth24h} /></div>)}</div>
      </section>
    </div>
  );
}

function BreakoutRow({ tool }: { tool: typeof tools[number] }) {
  return (
    <a className="workflowPreview" href={`/tools/${tool.slug}`}>
      <ToolLogo officialSrc={tool.officialLogoUrl} src={tool.logoUrl} faviconSrc={tool.faviconUrl} fallback={tool.iconUrl} alt="" size={26} />
      <span><strong>{tool.name}</strong><small>{displayCategory(tool.category)} · breakout signal {tool.breakoutScore}</small></span>
      <MovementBadge value={tool.growth24h} />
      <Sparkline data={tool.sparkline} />
    </a>
  );
}
