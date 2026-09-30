import Link from "next/link";
import { creatorClaimRequests, getCreator, getTool, productClaimRequests } from "@/lib/data";

export default function OperatorClaimsPage() {
  return (
    <div className="stack">
      <section className="detailHeader">
        <div>
          <p className="eyebrow">Operator Review</p>
          <h1>Claim Requests</h1>
          <p>Static beta queue for creator and product ownership requests. Approval actions are placeholders only.</p>
        </div>
      </section>
      <section className="gridTwo">
        <div className="sidePanel">
          <div className="panelHeader"><h2>Creator Claims</h2></div>
          <div className="miniList">
            {creatorClaimRequests.map((claim) => {
              const creator = getCreator(claim.creatorId);
              return (
                <div className="miniRow" key={claim.id}>
                  <span><strong>{creator?.name ?? claim.name}</strong><small>{claim.email} · {claim.status}</small></span>
                  <Link className="viewLink" href={`/creators/${claim.creatorId}`}>Profile</Link>
                </div>
              );
            })}
          </div>
        </div>
        <div className="sidePanel">
          <div className="panelHeader"><h2>Product Claims</h2></div>
          <div className="miniList">
            {productClaimRequests.map((claim) => {
              const tool = getTool(claim.toolSlug);
              return (
                <div className="miniRow" key={claim.id}>
                  <span><strong>{tool?.name ?? claim.toolSlug}</strong><small>{claim.workEmail} · {claim.status}</small></span>
                  <Link className="viewLink" href={`/tools/${claim.toolSlug}`}>Product</Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
