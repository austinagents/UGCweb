import { CreatorCard } from "@/components/creator-card";
import { creatorIntelligenceStatus, creators } from "@/lib/data";

export default function CreatorsPage() {
  return (
    <div className="stack">
      {creatorIntelligenceStatus.publicReady ? <section className="creatorGrid">
        {creators.map((creator) => (
          <CreatorCard creator={creator} key={creator.id} />
        ))}
      </section> : <CreatorPlaceholder />}
    </div>
  );
}

function CreatorPlaceholder() {
  return (
    <section className="sidePanel">
      <div className="panelHeader">
        <h2>Creator Intelligence Expanding</h2>
      </div>
      <p className="emptyState">Creator profiles are being reviewed for usable identity, avatars, social links, and category fit before they appear publicly.</p>
    </section>
  );
}
