"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CreatorAvatar } from "@/components/creator-avatar";
import { ToolLogo } from "@/components/tool-logo";
import { creatorToolRelationships, creators, getTool, microWorkflows, productClaimRequests, toolsForMicroWorkflow, toolsForWorkflow, workflows } from "@/lib/data";
import { displayCategory } from "@/lib/format";
import { latestLocalProduct } from "@/lib/local-graph";
import type { LocalProductRecord } from "@/lib/types";

const mockWorkflowSlugs = ["founder-outbound-engine", "agency-prospecting", "b2b-lead-research"];
const mockTopics = ["Lead Generation", "Outbound", "AI Sales", "Automation"];

export default function ProductDashboardPage() {
  const [localProduct, setLocalProduct] = useState<LocalProductRecord | null>(null);
  const [localGraphReady, setLocalGraphReady] = useState(false);
  const claim = productClaimRequests[0];
  const fallbackTool = localGraphReady && !localProduct && claim ? getTool(claim.toolSlug) : undefined;
  const activeProductName = localProduct?.name || fallbackTool?.name || "Product profile";
  const activeWebsite = localProduct?.website || fallbackTool?.websiteUrl || "";
  const activeDescription = localProduct?.description || fallbackTool?.description || "";
  const activeTagline = localProduct?.tagline || fallbackTool?.tagline || "";
  const activeCategory = localProduct?.category ? displayCategory(localProduct.category) : fallbackTool ? fallbackTool.categories.map(displayCategory).join(" · ") : "Add category";
  const selectedWorkflowSlugs = localProduct ? localProduct.workflowSlugs : mockWorkflowSlugs;
  const selectedMicroWorkflowSlugs = localProduct?.microWorkflowSlugs ?? [];
  const selectedWorkflows = workflows.filter((workflow) => selectedWorkflowSlugs.includes(workflow.slug));
  const selectedMicroWorkflows = microWorkflows.filter((microWorkflow) => selectedMicroWorkflowSlugs.includes(microWorkflow.slug));
  const relatedCreators = fallbackTool ? creatorToolRelationships
    .filter((relationship) => relationship.status === "accepted" && relationship.toolSlug === fallbackTool.slug)
    .map((relationship) => creators.find((creator) => creator.id === relationship.creatorId))
    .filter(Boolean)
    .slice(0, 4) : [];
  const hasProfile = Boolean(localProduct || fallbackTool);

  useEffect(() => {
    setLocalProduct(latestLocalProduct());
    setLocalGraphReady(true);
  }, []);

  return (
    <div className="stack">
      <section className="dashboardGrid ownershipDashboard ownershipDashboardFull">
        <main className="dashboardMain">
          <section className="sidePanel" id="overview">
            <div className="panelHeader"><h2>Overview</h2></div>
            <div className="ownershipMetricGrid">
              <OwnershipMetric label="Ownership" value={hasProfile ? "Claimed" : "Ownership available"} />
              <OwnershipMetric label="Profile completion" value={localProduct ? "74%" : "68%"} />
              <OwnershipMetric label="Next action" value={selectedWorkflows.length ? "Connect creator adjacency" : "Connect workflow role"} />
            </div>
            <p className="emptyState">Static beta shell. Complete your product profile, strengthen graph relationships, and improve discovery.</p>
          </section>

          <section className="sidePanel" id="profile">
            <div className="panelHeader"><h2>Profile</h2></div>
            {hasProfile ? (
              <div className="ownershipProfileStack">
                <div className="ownershipProfileAsset">
                  {localProduct ? <img className="creatorAvatar" src={localProduct.logoUrl} alt="" width={52} height={52} /> : fallbackTool ? <ToolLogo officialSrc={fallbackTool.officialLogoUrl} src={fallbackTool.logoUrl} faviconSrc={fallbackTool.faviconUrl} fallback={fallbackTool.iconUrl} alt="" size={52} /> : null}
                </div>
                <div className="ownershipFormGrid">
                  <MockField label="Product name" value={activeProductName} />
                  <MockField label="Website" value={activeWebsite || "Add website"} />
                  <MockField label="Description" value={activeDescription || "Add description"} />
                  <MockField label="Tagline" value={activeTagline || "Add tagline"} />
                  <MockField label="Categories" value={activeCategory} />
                  <div className="ownershipFormActions"><button className="primaryButton" type="button">Update Product Profile</button></div>
                </div>
              </div>
            ) : <p className="emptyState">No active product claim is selected in this static beta shell.</p>}
          </section>

          <section className="sidePanel" id="workflows">
            <div className="panelHeader"><h2>Used In Workflows</h2></div>
            <div className="ownershipRows">
              {selectedWorkflows.map((workflow) => (
                <OwnershipRow key={workflow.slug} title={workflow.name} meta={roleForWorkflow(workflow.slug)} detail={toolsForWorkflow(workflow).map((item) => item.name).join(" -> ")} />
              ))}
              {selectedMicroWorkflows.map((microWorkflow) => (
                <OwnershipRow key={microWorkflow.slug} title={microWorkflow.name} meta="Specific task" detail={toolsForMicroWorkflow(microWorkflow.slug).map((item) => item.name).join(" -> ")} />
              ))}
            </div>
            <button className="iconTextButton" type="button">Add Workflow Association</button>
          </section>

          <section className="sidePanel" id="creators">
            <div className="panelHeader"><h2>Creators</h2></div>
            <div className="ownershipRows">
              {relatedCreators.length ? relatedCreators.map((creator) => creator ? (
                <div className="miniRow" key={creator.id}>
                  <CreatorAvatar name={creator.name} src={creator.avatarUrl} size={28} />
                  <span><strong>{creator.name}</strong><small>Connected in the current graph</small></span>
                </div>
              ) : null) : <p className="emptyState">Connect creator relationships to strengthen discovery.</p>}
            </div>
          </section>

          <section className="sidePanel" id="topics">
            <div className="panelHeader"><h2>Topics</h2></div>
            <div className="ownershipChipRail">
              {mockTopics.map((topic) => <span key={topic}>{topic}</span>)}
              <button type="button">Add Topic</button>
            </div>
          </section>

          <section className="sidePanel" id="preview">
            <div className="panelHeader"><h2>Preview</h2></div>
            {hasProfile ? (
              <div className="ownershipPreview">
                {fallbackTool ? <ToolLogo officialSrc={fallbackTool.officialLogoUrl} src={fallbackTool.logoUrl} faviconSrc={fallbackTool.faviconUrl} fallback={fallbackTool.iconUrl} alt="" size={44} /> : null}
                {localProduct ? <img className="creatorAvatar" src={localProduct.logoUrl} alt="" width={44} height={44} /> : null}
                <span><strong>{activeProductName}</strong><small>{[activeCategory, ...mockTopics].filter(Boolean).slice(0, 3).join(" · ")}</small></span>
                <Link className="iconTextButton" href={localProduct ? `/tools/${localProduct.slug}` : fallbackTool ? `/tools/${fallbackTool.slug}` : "/dashboard/product"}>{localProduct || fallbackTool ? "Preview Public Product" : "Preview Workspace"}</Link>
              </div>
            ) : <Link className="iconTextButton" href="/search?type=product">Browse Products</Link>}
          </section>
        </main>
      </section>
    </div>
  );
}

function OwnershipMetric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function MockField({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <label className={wide ? "wide" : ""}>{label}<input value={value} readOnly /></label>;
}

function OwnershipRow({ title, meta, detail }: { title: string; meta: string; detail: string }) {
  return <div className="miniRow"><span><strong>{title}</strong><small>{meta}</small><small>{detail}</small></span></div>;
}

function roleForWorkflow(slug: string) {
  if (slug === "founder-outbound-engine") return "Role: Lead enrichment";
  if (slug === "agency-prospecting") return "Role: Prospect qualification";
  return "Role: Account research";
}
