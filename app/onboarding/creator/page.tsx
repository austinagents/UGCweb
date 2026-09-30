"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { ToolLogo } from "@/components/tool-logo";
import { WorkflowStack } from "@/components/workflow-stack";
import { creators, microWorkflows, tools, toolsForMicroWorkflow, workflowMicroWorkflowRelationships, workflows } from "@/lib/data";
import { buildLocalCreatorRecord, readLocalCreators, saveLocalCreator } from "@/lib/local-graph";

type SelectorItem = {
  id: string;
  label: string;
  logo?: {
    officialSrc: string;
    src: string;
    faviconSrc: string;
    fallback: string;
  };
  toolSlugs?: string[];
};

export default function CreatorOnboardingPage() {
  const [submitted, setSubmitted] = useState(false);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedWorkflows, setSelectedWorkflows] = useState<string[]>([]);
  const [selectedMicroWorkflows, setSelectedMicroWorkflows] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const toolItems = tools.filter((tool) => tool.listingStatus === "accepted" && !tool.suppressed).map((tool) => ({
    id: tool.slug,
    label: tool.name,
    logo: {
      officialSrc: tool.officialLogoUrl,
      src: tool.logoUrl,
      faviconSrc: tool.faviconUrl,
      fallback: tool.iconUrl
    }
  }));
  const workflowItems = workflows.map((workflow) => ({ id: workflow.slug, label: workflow.name, toolSlugs: workflow.toolSlugs }));
  const microWorkflowItems = microWorkflows.map((microWorkflow) => ({ id: microWorkflow.slug, label: microWorkflow.name, toolSlugs: toolsForMicroWorkflow(microWorkflow.slug).map((tool) => tool.slug) }));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!avatarUrl) {
      setAvatarError("Upload a profile photo to create this profile.");
      return;
    }
    const formData = new FormData(event.currentTarget);
    const record = buildLocalCreatorRecord({
      avatarUrl,
      existingSlugs: [...creators.map((creator) => creator.id), ...readLocalCreators().map((creator) => creator.slug)],
      name: String(formData.get("name") ?? ""),
      socialUrl: String(formData.get("socialProfile") ?? ""),
      website: String(formData.get("website") ?? ""),
      bio: String(formData.get("bio") ?? ""),
      toolSlugs: selectedTools,
      workflowSlugs: selectedWorkflows,
      microWorkflowSlugs: selectedMicroWorkflows
    });
    saveLocalCreator(record);
    setSubmitted(true);
  }

  return (
    <div className="stack onboardingPage">
      {submitted ? (
        <section className="sidePanel claimConfirmation">
          <div className="panelHeader"><h2>Your creator profile has been created</h2></div>
          <p>Continue to your profile to manage this creator asset and add tools, workflows, and micro workflows that improve discovery.</p>
          <p className="onboardingNote">You can keep strengthening your creator profile as you connect more graph relationships.</p>
          <div className="claimActionRail">
            <Link className="primaryButton" href="/dashboard">Continue to Profile</Link>
          </div>
        </section>
      ) : (
        <section>
          <form className="claimForm" onSubmit={handleSubmit}>
            <div className="panelHeader onboardingFormHeader">
              <div>
                <h2>Creator details</h2>
                <p>Create your creator profile, then continue to your profile to improve discovery.</p>
              </div>
              <p className="onboardingSecondaryPath">Already have a profile?<br /><Link href="/search?type=creator">Search & claim an existing creator profile →</Link></p>
            </div>
            <ImageUploadField
              error={avatarError}
              help="Recommended: 512x512px or larger."
              label="Profile Photo *"
              name="profilePhoto"
              previewUrl={avatarUrl}
              setError={setAvatarError}
              setPreviewUrl={setAvatarUrl}
            />
            <Field label="Name">
              <input name="name" placeholder="Your public name" required />
            </Field>
            <Field label="X / social profile">
              <input name="socialProfile" type="url" placeholder="https://x.com/handle" required />
            </Field>
            <Field label="Website">
              <input name="website" type="url" placeholder="https://your-site.com" />
            </Field>
            <Field label="Short bio" help="One-line expertise summary.">
              <textarea name="bio" placeholder="Explain what you teach, build, or help people understand." required />
            </Field>
            <GraphSelector
              help="Choose the tools you actively use, teach, or talk about."
              items={toolItems}
              label="Tools Used"
              selected={selectedTools}
              suggestions={suggestTools(toolItems)}
              setSelected={setSelectedTools}
            />
            <GraphSelector
              help="Choose up to 3 workflows you use, teach, or want associated with your profile."
              items={workflowItems}
              label="Associated Workflows"
              limit={3}
              optional
              selected={selectedWorkflows}
              suggestions={suggestWorkflows(workflowItems, selectedTools)}
              setSelected={setSelectedWorkflows}
            />
            <GraphSelector
              help="Choose up to 5 specific tasks you teach or help people complete."
              items={microWorkflowItems}
              label="Associated Micro Workflows"
              limit={5}
              optional
              selected={selectedMicroWorkflows}
              suggestions={suggestMicroWorkflows(microWorkflowItems, selectedTools, selectedWorkflows)}
              setSelected={setSelectedMicroWorkflows}
            />
            <p className="fieldHint">You can add more after your profile is created.</p>
            <button className="primaryButton" type="submit">Create creator profile</button>
          </form>
        </section>
      )}
    </div>
  );
}

function ImageUploadField({ error, help, label, name, previewUrl, setError, setPreviewUrl }: { error: string; help: string; label: string; name: string; previewUrl: string; setError: (value: string) => void; setPreviewUrl: (value: string) => void }) {
  return (
    <label>
      {label}
      <small className="fieldHint">{help}</small>
      {previewUrl ? <img className="creatorAvatar" src={previewUrl} alt="" width={56} height={56} /> : null}
      <input
        accept="image/*"
        name={name}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) {
            setPreviewUrl("");
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            setPreviewUrl(String(reader.result ?? ""));
            setError("");
          };
          reader.readAsDataURL(file);
        }}
        required
        type="file"
      />
      {error ? <small className="fieldHint">{error}</small> : null}
    </label>
  );
}

function GraphSelector({
  help,
  items,
  label,
  limit,
  optional = false,
  selected,
  suggestions,
  setSelected
}: {
  help: string;
  items: SelectorItem[];
  label: string;
  limit?: number;
  optional?: boolean;
  selected: string[];
  suggestions: SelectorItem[];
  setSelected: (value: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const dropdownItems = items
    .filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.label.localeCompare(b.label));
  const selectedItems = selected
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is SelectorItem => Boolean(item));
  const visibleItems = selectedItems.length ? selectedItems : suggestions.slice(0, 4);

  function toggle(id: string) {
    if (selected.includes(id)) {
      setSelected(selected.filter((item) => item !== id));
      return;
    }
    if (!limit || selected.length < limit) setSelected([...selected, id]);
  }

  return (
    <div className="graphSelector">
      <div>
        <strong className="graphSelectorLabel">{label}{optional ? <span>(optional)</span> : null}</strong>
        <small className="fieldHint">{help}</small>
      </div>
      <input value={query} onBlur={() => setTimeout(() => setOpen(false), 120)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder={`Search ${label.toLowerCase()}`} />
      {open ? (
        <div className="graphSelectorDropdown">
          <div className="graphSelectorDropdownHeader">
            <span>{dropdownItems.length} options</span>
            <button onMouseDown={(event) => event.preventDefault()} onClick={() => setOpen(false)} type="button">Done</button>
          </div>
          {dropdownItems.map((item) => <SelectorButton closeOnSelect item={item} key={item.id} limit={limit} selected={selected} setOpen={setOpen} toggle={toggle} />)}
        </div>
      ) : null}
      <div className="graphSuggestionRow">
        {visibleItems.map((item) => {
          return <SelectorButton item={item} key={item.id} limit={limit} selected={selected} toggle={toggle} />;
        })}
      </div>
      {selected.map((id) => <input name={label.toLowerCase().replace(/\s+/g, "-")} type="hidden" value={id} key={id} />)}
      {limit ? <small className="fieldHint">{selected.length}/{limit} selected</small> : <small className="fieldHint">{selected.length} selected</small>}
    </div>
  );
}

function SelectorButton({ closeOnSelect = false, item, limit, selected, setOpen, toggle }: { closeOnSelect?: boolean; item: SelectorItem; limit?: number; selected: string[]; setOpen?: (open: boolean) => void; toggle: (id: string) => void }) {
  const active = selected.includes(item.id);
  const disabled = Boolean(limit && !active && selected.length >= limit);
  return (
    <button className={active ? "active" : ""} disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => { toggle(item.id); if (closeOnSelect) setOpen?.(false); }} type="button">
      <SelectorVisual item={item} />
    </button>
  );
}

function SelectorVisual({ item }: { item: SelectorItem }) {
  return (
    <>
      {item.logo ? <ToolLogo officialSrc={item.logo.officialSrc} src={item.logo.src} faviconSrc={item.logo.faviconSrc} fallback={item.logo.fallback} alt="" size={20} /> : null}
      {item.toolSlugs?.length ? <WorkflowStack toolSlugs={item.toolSlugs} limit={5} /> : null}
      <span>{item.label}</span>
    </>
  );
}

function suggestTools(items: SelectorItem[]) {
  const defaults = ["chatgpt", "claude", "cursor", "clay"];
  return uniqueItems([...defaults.map((slug) => items.find((item) => item.id === slug)).filter(Boolean) as SelectorItem[], ...items]).slice(0, 4);
}

function suggestWorkflows(items: SelectorItem[], selectedTools: string[]) {
  const matches = selectedTools.length
    ? items.filter((item) => item.toolSlugs?.some((slug) => selectedTools.includes(slug)))
    : [];
  return uniqueItems([...matches, ...items]).slice(0, 4);
}

function suggestMicroWorkflows(items: SelectorItem[], selectedTools: string[], selectedWorkflows: string[]) {
  const microWorkflowSlugsFromWorkflows = workflowMicroWorkflowRelationships
    .filter((relationship) => relationship.status === "accepted" && selectedWorkflows.includes(relationship.workflowSlug))
    .map((relationship) => relationship.microWorkflowSlug);
  const matches = items.filter((item) =>
    item.toolSlugs?.some((slug) => selectedTools.includes(slug)) || microWorkflowSlugsFromWorkflows.includes(item.id)
  );
  return uniqueItems([...matches, ...items]).slice(0, 4);
}

function uniqueItems(items: SelectorItem[]) {
  return items.filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index);
}

function Field({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return (
    <label>
      {label}
      {help ? <small className="fieldHint">{help}</small> : null}
      {children}
    </label>
  );
}
