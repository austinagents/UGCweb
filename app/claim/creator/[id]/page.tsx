import Link from "next/link";
import { notFound } from "next/navigation";
import { ClaimStatusBadge } from "@/components/claims/claim-status";
import { CreatorAvatar } from "@/components/creator-avatar";
import { creatorClaimStatus, creators, getCreator } from "@/lib/data";
import { betaEventBootstrapScript } from "@/lib/events";

export function generateStaticParams() {
  return creators.map((creator) => ({ id: creator.id }));
}

export default function CreatorClaimPage({ params, searchParams }: { params: { id: string }; searchParams: { submitted?: string } }) {
  const creator = getCreator(params.id);
  if (!creator) notFound();
  const submitted = searchParams.submitted === "1";
  const claimStatus = submitted ? "pending" : creatorClaimStatus(creator.id);

  return (
    <div className="stack claimPage">
      <script dangerouslySetInnerHTML={{ __html: creatorClaimEventScript(creator.id, submitted) }} />
      <section className="detailHeader">
        <div className="toolTitle">
          <CreatorAvatar name={creator.name} src={creator.avatarUrl} size={54} />
          <div>
            <p className="eyebrow">Creator Ownership</p>
            <h1>Claim {creator.name}</h1>
            <p>AppScreener reviews creator claims before profile ownership is granted.</p>
          </div>
        </div>
        <div className="headerActions">
          <ClaimStatusBadge status={claimStatus} />
          <Link className="iconTextButton" href={`/creators/${creator.id}`}>View Public Profile</Link>
        </div>
      </section>

      {submitted ? <ClaimConfirmation href={`/creators/${creator.id}`} /> : (
        <section className="claimGrid">
          <form className="claimForm" action={`/claim/creator/${creator.id}`} data-beta-creator-claim-form="true">
            <input type="hidden" name="submitted" value="1" />
            <label>Name<input defaultValue={creator.name} required /></label>
            <label>Email<input type="email" placeholder="you@example.com" required /></label>
            <label>Creator social proof URL<input defaultValue={creator.xUrl || creator.websiteUrl || ""} placeholder="https://x.com/handle" required /></label>
            <label>Claim note<textarea placeholder="Briefly explain how AppScreener can verify this is your profile." /></label>
            <button className="primaryButton" type="submit">Submit Claim For Review</button>
          </form>
          <aside className="sidePanel claimSidePanel">
            <div className="panelHeader"><h2>What happens next</h2></div>
            <div className="miniList">
              <div className="miniRow"><span><strong>1. Identity review</strong><small>We compare your submitted email and social proof to the public creator profile.</small></span></div>
              <div className="miniRow"><span><strong>2. Ownership pending</strong><small>No public fields or relationships change while the claim is pending.</small></span></div>
              <div className="miniRow"><span><strong>3. Dashboard access</strong><small>Approved creators can manage profile basics and preview their public page.</small></span></div>
            </div>
          </aside>
        </section>
      )}
    </div>
  );
}

function ClaimConfirmation({ href }: { href: string }) {
  return (
    <section className="sidePanel claimConfirmation">
      <div className="panelHeader"><h2>Claim submitted</h2></div>
      <p>Thanks. This creator claim is pending review. The next step is the creator dashboard, where profile ownership will let creators manage profile info, tools, workflows, and topics once reviewed.</p>
      <div className="claimActionRail">
        <Link className="iconTextButton" href={href}>Back to Creator Profile</Link>
        <Link className="iconTextButton" href="/dashboard/creator">Open Creator Dashboard</Link>
      </div>
    </section>
  );
}

function creatorClaimEventScript(creatorId: string, submitted: boolean) {
  return `
    ${betaEventBootstrapScript()}
    window.__appscreenerTrackBetaEvent && window.__appscreenerTrackBetaEvent("creator_claim_cta_clicked", {
      creatorId: ${JSON.stringify(creatorId)},
      source: "claim_route"
    });
    ${submitted ? `window.__appscreenerTrackBetaEvent && window.__appscreenerTrackBetaEvent("creator_claim_submitted", {
      creatorId: ${JSON.stringify(creatorId)},
      source: "claim_confirmation"
    });` : ""}
    document.addEventListener("submit", function(event) {
      var form = event.target;
      if (!form || form.getAttribute("data-beta-creator-claim-form") !== "true") return;
      window.__appscreenerTrackBetaEvent && window.__appscreenerTrackBetaEvent("creator_claim_submitted", {
        creatorId: ${JSON.stringify(creatorId)},
        source: "claim_form"
      });
    });
  `;
}
