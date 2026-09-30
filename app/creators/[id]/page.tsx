import Script from "next/script";
import { CreatorAvatar } from "@/components/creator-avatar";
import { ClaimStatusBadge } from "@/components/claims/claim-status";
import { MovementBadge } from "@/components/movement-badge";
import { ToolLogo } from "@/components/tool-logo";
import { WorkflowStack } from "@/components/workflow-stack";
import { XProfileButton } from "@/components/x-profile-button";
import { creatorTagDisplayLabel, creatorTagSlug, creatorTagStyle } from "@/lib/creator-tags";
import { creatorClaimStatus, creatorToolRelationships, creators, getCreator, getTool, microWorkflows, tools, toolsForMicroWorkflow, workflows } from "@/lib/data";
import { betaEventBootstrapScript } from "@/lib/events";
import { LOCAL_CREATORS_KEY } from "@/lib/local-graph";
import type { CreatorToolRelationship } from "@/lib/types";

export function generateStaticParams() {
  return creators.map((creator) => ({ id: creator.id }));
}

export default function CreatorPage({ params }: { params: { id: string } }) {
  const creator = getCreator(params.id);
  if (!creator) return <LocalCreatorProfile slug={params.id} />;
  const creatorWorkflows = workflows.filter((workflow) => creator.workflowSlugs.includes(workflow.slug));
  const acceptedToolRelationships = creatorToolRelationships.filter((relationship) => relationship.status === "accepted" && relationship.creatorId === creator.id);
  const verifiedToolRelationships = acceptedToolRelationships.filter(isVerifiedToolRelationship);
  const mentionedToolRelationships = acceptedToolRelationships.filter((relationship) => relationship.relationshipType === "mentions");
  const creatorTools = verifiedToolRelationships.map((relationship) => ({ relationship, tool: getTool(relationship.toolSlug) })).filter((item): item is { relationship: CreatorToolRelationship; tool: NonNullable<ReturnType<typeof getTool>> } => Boolean(item.tool));
  const tags = publicCreatorTags(creator);
  const claimStatus = creatorClaimStatus(creator.id);

  return (
    <div className="stack">
      <script dangerouslySetInnerHTML={{ __html: creatorProfileEventScript(creator.id) }} />
      <section className="detailHeader">
        <div className="toolTitle">
          <CreatorAvatar name={creator.name} src={creator.avatarUrl} size={54} />
          <div>
            <p className="eyebrow">Creator signal</p>
            <h1>{creator.name}</h1>
            <p className="creatorMetaLine">
              <span>{[creator.handle, creator.platform, creator.followers ? `${creator.followers.toLocaleString()} followers` : ""].filter(Boolean).join(" · ")}</span>
              <XProfileButton href={creator.xUrl} label={`${creator.name} on X`} />
            </p>
            <div className="tagRail">
              {tags.slice(0, 8).map((tag) => <a href={`/tags/${creatorTagSlug(tag)}`} key={tag} style={creatorTagStyle(tag)}>{creatorTagDisplayLabel(tag)}</a>)}
            </div>
          </div>
        </div>
        <div className="headerActions">
          <ClaimStatusBadge status={claimStatus} />
          <a className="iconTextButton" href={`/claim/creator/${creator.id}`} data-beta-creator-claim-cta="true">{claimStatus === "claimed" ? "Manage Profile" : "Claim Profile"}</a>
        </div>
      </section>
      <section className="sidePanel ownershipPrompt">
        <div>
          <div className="panelHeader"><h2>Own this creator profile</h2></div>
          <p>Claiming lets a creator manage profile info, connect tools, connect workflows, and define topics or known-for areas.</p>
        </div>
        <a className="iconTextButton" href={`/claim/creator/${creator.id}`} data-beta-creator-claim-cta="true">{claimStatus === "claimed" ? "Manage Profile" : "Claim Profile"}</a>
      </section>
      <section className="gridTwo">
        <div className="sidePanel">
          <div className="panelHeader"><h2>Creator Snapshot</h2></div>
          <div className="miniList">
            <SnapshotRow label="Known For" value={tags.slice(0, 5).map(creatorTagDisplayLabel).join(" · ") || creator.creatorCategory} />
            <SnapshotRow label="Tools Used" value={creatorTools.length ? creatorTools.slice(0, 4).map(({ tool }) => tool.name).join(" · ") : "Add tools to strengthen discovery"} />
            <SnapshotRow label="Workflows" value={creatorWorkflows.length ? creatorWorkflows.slice(0, 3).map((workflow) => workflow.name).join(" · ") : "Add workflows to strengthen discovery"} />
          </div>
        </div>
        <div className="sidePanel">
          <div className="panelHeader"><h2>Relationship Status</h2></div>
          <div className="emptyState">{relationshipStatusText(verifiedToolRelationships.length, mentionedToolRelationships.length)}</div>
        </div>
      </section>
      {verifiedToolRelationships.length ? (
        <section>
          <div className="sectionHeader"><h2>Tools I Use</h2><p>Accepted uses and teaches relationships only. Each tool is shown with a safe graph context.</p></div>
          <div className="creatorToolRelationshipGrid">
            {verifiedToolRelationships.map((relationship) => <CreatorToolRow relationship={relationship} key={relationship.id} />)}
          </div>
        </section>
      ) : null}
      {mentionedToolRelationships.length ? (
        <section>
          <div className="sectionHeader"><h2>Tools Mentioned</h2><p>Mentioned tools are not treated as verified usage.</p></div>
          <div className="creatorToolRelationshipGrid">
            {mentionedToolRelationships.map((relationship) => <CreatorToolRow relationship={relationship} key={relationship.id} />)}
          </div>
        </section>
      ) : null}
      <section>
        <div className="sectionHeader"><h2>Workflows I Use / Teach</h2><p>Workflow adjacency connected through creator-tool relationships.</p></div>
        <div className="workflowGrid">
          {creatorWorkflows.map((workflow) => <a className="workflowRow" href={`/workflows/${workflow.slug}`} key={workflow.id}><WorkflowStack toolSlugs={workflow.toolSlugs} /><span><strong>{workflow.name}</strong><small>{workflow.outcome}</small></span><MovementBadge value={workflow.growth24h} /></a>)}
          {!creatorWorkflows.length && <div className="emptyState">Add workflow relationships to strengthen discovery.</div>}
        </div>
      </section>
      <section>
        <div className="sectionHeader"><h2>Topics / Known For</h2><p>Public identity categories connected to this creator node.</p></div>
        <div className="tagRail">
          {tags.map((tag) => <a href={`/tags/${creatorTagSlug(tag)}`} key={tag} style={creatorTagStyle(tag)}>{creatorTagDisplayLabel(tag)}</a>)}
        </div>
      </section>
      {creatorTools.length ? (
        <section>
          <div className="sectionHeader"><h2>Related Products</h2><p>Products connected through accepted creator-tool relationships.</p></div>
          <div className="creatorToolRelationshipGrid">
            {creatorTools.slice(0, 6).map(({ tool }) => (
              <a className="creatorToolRelationshipRow" href={`/tools/${tool.slug}`} key={tool.slug}>
                <ToolLogo officialSrc={tool.officialLogoUrl} src={tool.logoUrl} faviconSrc={tool.faviconUrl} fallback={tool.iconUrl} alt="" size={30} />
                <span><strong>{tool.name}</strong><small>{tool.category}</small></span>
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function LocalCreatorProfile({ slug }: { slug: string }) {
  const toolLookup = creatorToolLookupForClient();
  const workflowLookup = workflows.map((workflow) => ({
    slug: workflow.slug,
    name: workflow.name,
    href: `/workflows/${workflow.slug}`,
    outcome: workflow.outcome,
    tools: workflow.toolSlugs.map((toolSlug) => getTool(toolSlug)?.name).filter((name): name is string => Boolean(name))
  }));
  const microWorkflowLookup = microWorkflows.map((microWorkflow) => ({
    slug: microWorkflow.slug,
    name: microWorkflow.name,
    href: "/workflows",
    outcome: microWorkflow.outcome,
    tools: toolsForMicroWorkflow(microWorkflow.slug).map((tool) => tool.name)
  }));

  return (
    <div className="stack">
      <section className="detailHeader">
        <div className="toolTitle">
          <img className="creatorAvatar" id="localCreatorAvatar" alt="" width={54} height={54} style={{ display: "none" }} />
          <div>
            <p className="eyebrow">Creator profile</p>
            <h1 id="localCreatorName">Local creator profile</h1>
            <p id="localCreatorBio">Looking for this creator in your local AppScreener graph.</p>
          </div>
        </div>
        <div className="headerActions">
          <ClaimStatusBadge status="claimed" />
          <a className="iconTextButton" id="localCreatorSocial" href="/dashboard/creator">Social profile</a>
        </div>
      </section>
      <section className="sidePanel ownershipPrompt">
        <div>
          <div className="panelHeader"><h2>Creator workspace</h2></div>
          <p>Use the dashboard to connect more tools, workflows, and micro workflows that improve discovery.</p>
        </div>
        <a className="iconTextButton" href="/dashboard/creator">Open Dashboard</a>
      </section>
      <section>
        <div className="sectionHeader"><h2>Tools I Use</h2></div>
        <div className="creatorToolRelationshipGrid" id="localCreatorTools" />
      </section>
      <section>
        <div className="sectionHeader"><h2>Workflows I Use / Teach</h2></div>
        <div className="workflowGrid" id="localCreatorWorkflows" />
      </section>
      <section>
        <div className="sectionHeader"><h2>Micro Workflows</h2></div>
        <div className="workflowGrid" id="localCreatorMicroWorkflows" />
      </section>
      <Script id={`local-creator-${slug}`} strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: localCreatorScript(slug, toolLookup, workflowLookup, microWorkflowLookup) }} />
    </div>
  );
}

function creatorToolLookupForClient() {
  return tools
    .filter((tool) => tool.listingStatus === "accepted" && !tool.suppressed)
    .map((tool) => ({ slug: tool.slug, name: tool.name, href: `/tools/${tool.slug}`, category: tool.category }));
}

function localCreatorScript(slug: string, toolLookup: Array<{ slug: string; name: string; href: string; category: string } | undefined>, workflowLookup: Array<{ slug: string; name: string; href: string; outcome: string; tools: string[] }>, microWorkflowLookup: Array<{ slug: string; name: string; href: string; outcome: string; tools: string[] }>) {
  return `
    (function() {
      var slug = ${JSON.stringify(slug)};
      var tools = ${JSON.stringify(toolLookup.filter(Boolean))};
      var workflows = ${JSON.stringify(workflowLookup)};
      var microWorkflows = ${JSON.stringify(microWorkflowLookup)};
      var records = [];
      try { records = JSON.parse(localStorage.getItem(${JSON.stringify(LOCAL_CREATORS_KEY)}) || "[]"); } catch (error) { records = []; }
      var creator = Array.isArray(records) ? records.find(function(item) { return item && item.slug === slug; }) : null;
      function text(id, value) { var node = document.getElementById(id); if (node) node.textContent = value || ""; }
      function safeUrl(value) { return /^https?:\\/\\//i.test(value || "") ? value : ""; }
      function renderRows(id, slugs, lookup, emptyText) {
        var container = document.getElementById(id);
        if (!container) return;
        container.textContent = "";
        var matches = (slugs || []).map(function(item) { return lookup.find(function(entry) { return entry.slug === item; }); }).filter(Boolean);
        if (!matches.length) {
          var empty = document.createElement("div");
          empty.className = "emptyState";
          empty.textContent = emptyText;
          container.appendChild(empty);
          return;
        }
        matches.forEach(function(item) {
          var row = document.createElement("a");
          row.className = "creatorToolRelationshipRow";
          row.href = item.href || "#";
          var span = document.createElement("span");
          var strong = document.createElement("strong");
          strong.textContent = item.name;
          var small = document.createElement("small");
          small.textContent = item.tools && item.tools.length ? item.tools.join(" -> ") : item.category || item.outcome || "";
          span.appendChild(strong);
          span.appendChild(small);
          row.appendChild(span);
          container.appendChild(row);
        });
      }
      if (!creator) {
        text("localCreatorName", "Creator not found");
        text("localCreatorBio", "No local creator profile exists for this slug in this browser.");
        return;
      }
      text("localCreatorName", creator.name);
      text("localCreatorBio", creator.bio);
      var avatar = document.getElementById("localCreatorAvatar");
      if (avatar && creator.avatarUrl) {
        avatar.src = creator.avatarUrl;
        avatar.style.display = "";
      }
      var social = document.getElementById("localCreatorSocial");
      var socialUrl = safeUrl(creator.socialUrl);
      if (social && socialUrl) social.href = socialUrl;
      renderRows("localCreatorTools", creator.toolSlugs, tools, "Connect tools from the creator dashboard to improve discovery.");
      renderRows("localCreatorWorkflows", creator.workflowSlugs, workflows, "Connect workflows from the creator dashboard to show operating context.");
      renderRows("localCreatorMicroWorkflows", creator.microWorkflowSlugs, microWorkflows, "Connect micro workflows from the creator dashboard to show specific tasks.");
    })();
  `;
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return <div className="miniRow"><span><strong>{label}</strong><small>{value}</small></span></div>;
}

function creatorProfileEventScript(creatorId: string) {
  return `
    ${betaEventBootstrapScript()}
    document.addEventListener("click", function(event) {
      var target = event.target && event.target.closest ? event.target.closest("[data-beta-creator-claim-cta]") : null;
      if (!target) return;
      window.__appscreenerTrackBetaEvent && window.__appscreenerTrackBetaEvent("creator_claim_cta_clicked", {
        creatorId: ${JSON.stringify(creatorId)},
        source: "creator_profile"
      });
    });
  `;
}

function CreatorToolRow({ relationship }: { relationship: CreatorToolRelationship }) {
  const tool = getTool(relationship.toolSlug);
  if (!tool) return null;

  return (
    <a className="creatorToolRelationshipRow" href={`/tools/${tool.slug}`}>
      <ToolLogo officialSrc={tool.officialLogoUrl} src={tool.logoUrl} faviconSrc={tool.faviconUrl} fallback={tool.iconUrl} alt="" size={30} />
      <span>
        <strong>{tool.name}</strong>
        <small>{tool.category}</small>
      </span>
      <b className={`creatorToolRelationshipBadge ${relationship.relationshipType}`}>{relationshipLabel(relationship.relationshipType)}</b>
    </a>
  );
}

function isVerifiedToolRelationship(relationship: CreatorToolRelationship) {
  return relationship.relationshipType === "uses" || relationship.relationshipType === "teaches";
}

function relationshipLabel(type: CreatorToolRelationship["relationshipType"]) {
  if (type === "uses") return "USES";
  if (type === "teaches") return "TEACHES";
  return "MENTIONED";
}

function relationshipStatusText(verifiedCount: number, mentionCount: number) {
  if (!verifiedCount) {
    return "Add tool relationships to strengthen discovery. Mentioned tools are shown separately when available.";
  }

  return `${verifiedCount} verified tool ${verifiedCount === 1 ? "relationship" : "relationships"} mapped in the accepted graph. ${mentionCount ? `${mentionCount} mentioned ${mentionCount === 1 ? "tool is" : "tools are"} shown separately.` : "Mentioned tools remain separate when available."}`;
}

function publicCreatorTags(creator: NonNullable<ReturnType<typeof getCreator>>) {
  return [...new Set([
    creator.primarySpecialization,
    ...creator.specializationTags
  ].filter((tag): tag is NonNullable<typeof creator.primarySpecialization> => Boolean(tag)))];
}
