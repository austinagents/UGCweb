"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CreatorAvatar } from "@/components/creator-avatar";
import { WorkflowStack } from "@/components/workflow-stack";
import { creatorClaimRequests, getCreator, getTool, microWorkflows, toolsForMicroWorkflow, workflows } from "@/lib/data";
import { latestLocalCreator } from "@/lib/local-graph";
import type { LocalCreatorRecord } from "@/lib/types";

const mockTools = [
  { toolSlug: "clay", useCase: "Lead enrichment", priority: "Primary", workflowSlug: "founder-outbound-engine" },
  { toolSlug: "claude", useCase: "Research synthesis", priority: "Primary", workflowSlug: "research-assistant" },
  { toolSlug: "chatgpt", useCase: "Content repurposing", priority: "Secondary", workflowSlug: "ai-content-repurposing" }
];

const mockWorkflowSlugs = ["founder-outbound-engine", "research-assistant", "ai-content-repurposing"];
const mockTopics = ["Lead Generation", "AI Research", "Automation", "AI Agents"];

export default function CreatorDashboardPage() {
  const [localCreator, setLocalCreator] = useState<LocalCreatorRecord | null>(null);
  const [localGraphReady, setLocalGraphReady] = useState(false);
  const claim = creatorClaimRequests[0];
  const fallbackCreator = localGraphReady && !localCreator && claim ? getCreator(claim.creatorId) : undefined;
  const activeName = localCreator?.name || fallbackCreator?.name || "Creator profile";
  const activeBio = localCreator?.bio || fallbackCreator?.bio || "";
  const activeWebsite = localCreator?.website || fallbackCreator?.websiteUrl || fallbackCreator?.officialWebsite || "";
  const activeSocials = localCreator?.socialUrl || [fallbackCreator?.xUrl, fallbackCreator?.youtubeUrl, fallbackCreator?.linkedinUrl].filter(Boolean).join(" · ");
  const selectedToolSlugs = localCreator ? localCreator.toolSlugs : mockTools.map((item) => item.toolSlug);
  const selectedWorkflowSlugs = localCreator ? localCreator.workflowSlugs : mockWorkflowSlugs;
  const selectedMicroWorkflowSlugs = localCreator?.microWorkflowSlugs ?? [];
  const selectedWorkflows = workflows.filter((workflow) => selectedWorkflowSlugs.includes(workflow.slug));
  const selectedMicroWorkflows = microWorkflows.filter((microWorkflow) => selectedMicroWorkflowSlugs.includes(microWorkflow.slug));
  const hasProfile = Boolean(localCreator || fallbackCreator);

  useEffect(() => {
    setLocalCreator(latestLocalCreator());
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
              <OwnershipMetric label="Profile completion" value={localCreator ? "76%" : "72%"} />
              <OwnershipMetric label="Next action" value="Confirm tools used" />
            </div>
            <p className="emptyState">Static beta shell. Complete your profile, strengthen graph relationships, and improve discovery.</p>
          </section>

          <section className="sidePanel" id="profile">
            <div className="panelHeader"><h2>Profile</h2></div>
            {hasProfile ? (
              <div className="ownershipProfileStack">
                <div className="ownershipProfileAsset">
                  <CreatorAvatar name={activeName} src={localCreator?.avatarUrl || fallbackCreator?.avatarUrl} size={52} />
                </div>
                <div className="ownershipFormGrid">
                  <MockField label="Name" value={activeName} />
                  <MockField label="Title" value={fallbackCreator?.creatorCategory || "Creator / Operator"} />
                  <MockField label="Bio" value={activeBio || "Add bio"} />
                  <MockField label="Website" value={activeWebsite || "Add website"} />
                  <MockField label="Socials" value={activeSocials || "Add socials"} />
                  <div className="ownershipFormActions"><button className="primaryButton" type="button">Update Profile</button></div>
                </div>
              </div>
            ) : <p className="emptyState">No active creator claim is selected in this static beta shell.</p>}
          </section>

          <section className="sidePanel" id="tools">
            <div className="panelHeader"><h2>Tools I Use</h2></div>
            <div className="ownershipRows">
              {selectedToolSlugs.map((toolSlug, index) => {
                const tool = getTool(toolSlug);
                const mockTool = mockTools.find((item) => item.toolSlug === toolSlug);
                const workflow = workflows.find((entry) => entry.slug === mockTool?.workflowSlug || entry.toolSlugs.includes(toolSlug));
                if (!tool) return null;
                return <OwnershipRow key={toolSlug} title={tool.name} meta={mockTool ? `${mockTool.useCase} · ${mockTool.priority}` : `${index === 0 ? "Primary" : "Selected"} tool`} detail={workflow ? `Related workflow: ${workflow.name}` : "Connect a related workflow"} />;
              })}
            </div>
            <button className="iconTextButton" type="button">Add Tool Used</button>
          </section>

          <section className="sidePanel" id="workflows">
            <div className="panelHeader"><h2>Workflows I Use / Teach</h2></div>
            <div className="ownershipRows">
              {selectedWorkflows.map((workflow, index) => (
                <OwnershipRow key={workflow.slug} title={workflow.name} meta={index === 0 ? "Primary" : "Secondary"} detail={workflow.toolSlugs.map((slug) => getTool(slug)?.name).filter(Boolean).join(" -> ")} />
              ))}
              {selectedMicroWorkflows.map((microWorkflow) => (
                <OwnershipRow key={microWorkflow.slug} title={microWorkflow.name} meta="Specific task" detail={toolsForMicroWorkflow(microWorkflow.slug).map((tool) => tool.name).join(" -> ")} />
              ))}
            </div>
            <button className="iconTextButton" type="button">Add Workflow Association</button>
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
                <CreatorAvatar name={activeName} src={localCreator?.avatarUrl || fallbackCreator?.avatarUrl} size={44} />
                <span><strong>{activeName}</strong><small>{mockTopics.slice(0, 3).join(" · ")}</small></span>
                <Link className="iconTextButton" href={localCreator ? `/creators/${localCreator.slug}` : fallbackCreator ? `/creators/${fallbackCreator.id}` : "/dashboard/creator"}>{localCreator || fallbackCreator ? "Preview Public Profile" : "Preview Workspace"}</Link>
              </div>
            ) : <Link className="iconTextButton" href="/creators">Browse Creators</Link>}
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
