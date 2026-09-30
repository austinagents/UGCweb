import { MovementBadge } from "@/components/movement-badge";
import { ToolLogo } from "@/components/tool-logo";
import { movementEvents, tools } from "@/lib/data";
import { displayCategory } from "@/lib/format";

export default function EventsPage() {
  const launches = [...tools].sort((a, b) => new Date(b.launchDate).getTime() - new Date(a.launchDate).getTime()).slice(0, 12);

  return (
    <div className="stack">
      <section className="terminalStatus">
        <div className="statusIdentity"><strong>News & Events</strong><span>CURATED</span></div>
        <div className="metric hotMetric"><span>events</span><strong>{movementEvents.length}</strong></div>
        <div className="metric"><span>launches</span><strong>{launches.length}</strong></div>
      </section>
      <section className="gridTwo">
        <div className="previewPanel">
          <div className="panelHeader"><h1>Ecosystem Catalysts</h1><small>launches, API releases, product updates</small></div>
          {movementEvents.map((event) => <article className="eventItem" key={event.id}><span>{event.timestamp}</span><strong>{event.title}</strong><p>{event.description}</p></article>)}
        </div>
        <div className="previewPanel">
          <div className="panelHeader"><h2>Recently Indexed</h2><small>new product records</small></div>
          {launches.map((tool) => (
            <a className="workflowPreview" href={`/tools/${tool.slug}`} key={tool.slug}>
              <ToolLogo officialSrc={tool.officialLogoUrl} src={tool.logoUrl} faviconSrc={tool.faviconUrl} fallback={tool.iconUrl} alt="" size={26} />
              <span><strong>{tool.name}</strong><small>{tool.launchDate} · {displayCategory(tool.category)}</small></span>
              <MovementBadge value={tool.growth24h} />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
