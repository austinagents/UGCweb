import Link from "next/link";
import { notFound } from "next/navigation";
import { ClaimStatusBadge } from "@/components/claims/claim-status";
import { ToolLogo } from "@/components/tool-logo";
import { getTool, productClaimStatus, tools } from "@/lib/data";
import { betaEventBootstrapScript } from "@/lib/events";
import { displayCategory } from "@/lib/format";

export function generateStaticParams() {
  return tools.map((tool) => ({ slug: tool.slug }));
}

export default function ProductClaimPage({ params, searchParams }: { params: { slug: string }; searchParams: { submitted?: string } }) {
  const tool = getTool(params.slug);
  if (!tool) notFound();
  const submitted = searchParams.submitted === "1";
  const claimStatus = submitted ? "pending" : productClaimStatus(tool.slug);

  return (
    <div className="stack claimPage">
      <script dangerouslySetInnerHTML={{ __html: productClaimEventScript(tool.slug, submitted) }} />
      <section className="detailHeader">
        <div className="toolTitle">
          <ToolLogo officialSrc={tool.officialLogoUrl} src={tool.logoUrl} faviconSrc={tool.faviconUrl} fallback={tool.iconUrl} alt="" size={54} />
          <div>
            <p className="eyebrow">Product Ownership</p>
            <h1>Claim {tool.name}</h1>
            <p>{displayCategory(tool.category)} product profile ownership requests are reviewed before access is granted.</p>
          </div>
        </div>
        <div className="headerActions">
          <ClaimStatusBadge status={claimStatus} />
          <Link className="iconTextButton" href={`/tools/${tool.slug}`}>View Product Profile</Link>
        </div>
      </section>

      {submitted ? <ClaimConfirmation href={`/tools/${tool.slug}`} /> : (
        <section className="claimGrid">
          <form className="claimForm" action={`/claim/product/${tool.slug}`} data-beta-product-claim-form="true">
            <input type="hidden" name="submitted" value="1" />
            <label>Requester name<input placeholder="Your name" required /></label>
            <label>Work email<input type="email" placeholder="you@company.com" required /></label>
            <label>Role<input placeholder="Founder, product lead, growth, operations..." required /></label>
            <label>Company/product website<input defaultValue={tool.websiteUrl} required /></label>
            <label>Claim proof<input placeholder="Company email, website access, public team page, or official social proof" required /></label>
            <label>Claim note<textarea placeholder="Briefly explain your relationship to this product." /></label>
            <button className="primaryButton" type="submit">Submit Product Claim</button>
          </form>
          <aside className="sidePanel claimSidePanel">
            <div className="panelHeader"><h2>Review policy</h2></div>
            <div className="miniList">
              <div className="miniRow"><span><strong>Ownership only</strong><small>Claims grant profile participation after review, not automatic promotion.</small></span></div>
              <div className="miniRow"><span><strong>No auto-publishing</strong><small>Suggested workflow or creator relationships stay pending until reviewed.</small></span></div>
              <div className="miniRow"><span><strong>Beta dashboard</strong><small>Approved owners can preview product profile management surfaces.</small></span></div>
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
      <div className="panelHeader"><h2>Product claim submitted</h2></div>
      <p>This product claim is pending review. The next step is the product dashboard, where ownership will let founders manage product info, workflow associations, creator adjacency, and topics once reviewed.</p>
      <div className="claimActionRail">
        <Link className="iconTextButton" href={href}>Back to Product Profile</Link>
        <Link className="iconTextButton" href="/dashboard/product">Open Product Dashboard</Link>
      </div>
    </section>
  );
}

function productClaimEventScript(toolSlug: string, submitted: boolean) {
  return `
    ${betaEventBootstrapScript()}
    window.__appscreenerTrackBetaEvent && window.__appscreenerTrackBetaEvent("product_claim_cta_clicked", {
      toolSlug: ${JSON.stringify(toolSlug)},
      source: "claim_route"
    });
    ${submitted ? `window.__appscreenerTrackBetaEvent && window.__appscreenerTrackBetaEvent("product_claim_submitted", {
      toolSlug: ${JSON.stringify(toolSlug)},
      source: "claim_confirmation"
    });` : ""}
    document.addEventListener("submit", function(event) {
      var form = event.target;
      if (!form || form.getAttribute("data-beta-product-claim-form") !== "true") return;
      window.__appscreenerTrackBetaEvent && window.__appscreenerTrackBetaEvent("product_claim_submitted", {
        toolSlug: ${JSON.stringify(toolSlug)},
        source: "claim_form"
      });
    });
  `;
}
