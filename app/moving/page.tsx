import { TimeframeToggle } from "@/components/timeframe-toggle";
import { attentionFeed, movementEvents } from "@/lib/data";

export default function MovingPage() {
  return (
    <div className="stack">
      <section className="terminalStatus">
        <div className="statusIdentity"><strong>What’s Moving</strong><span>PREVIEW</span></div>
        <div className="metric hotMetric"><span>feed items</span><strong>{attentionFeed.length + movementEvents.length}</strong></div>
        <div className="metric"><span>filters</span><strong>signals</strong></div>
        <TimeframeToggle compact />
      </section>
      <section className="gridTwo">
        <div className="previewPanel">
          <div className="panelHeader"><h1>Movement Stream</h1><small>local momentum model</small></div>
          {attentionFeed.map((item) => <article className="eventItem" key={item.id}><span>{item.timestamp}</span><strong>{item.title}</strong><p>{item.description}</p><a className="viewLink" href={`/${item.entityType === "tool" ? "tools" : item.entityType === "workflow" ? "workflows" : item.entityType === "category" ? "categories" : "creators"}/${item.entitySlug}`}>Monitor →</a></article>)}
        </div>
        <div className="previewPanel">
          <div className="panelHeader"><h2>Model Drivers</h2><small>launches, category pressure, workflow spread</small></div>
          {movementEvents.map((event) => <article className="eventItem" key={event.id}><span>{event.timestamp}</span><strong>{event.title}</strong><p>{event.description}</p></article>)}
        </div>
      </section>
    </div>
  );
}
