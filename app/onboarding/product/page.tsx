"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { WorkflowStack } from "@/components/workflow-stack";
import { categories, microWorkflows, tools, toolsForMicroWorkflow, toolsForWorkflow, workflows } from "@/lib/data";
import { buildLocalProductRecord, readLocalProducts, saveLocalProduct } from "@/lib/local-graph";
import type { CategoryName } from "@/lib/types";

type SelectorItem = {
  id: string;
  label: string;
  toolSlugs?: string[];
  categories?: string[];
};

export default function ProductOnboardingPage() {
  const [submitted, setSubmitted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedWorkflows, setSelectedWorkflows] = useState<string[]>([]);
  const [selectedMicroWorkflows, setSelectedMicroWorkflows] = useState<string[]>([]);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoError, setLogoError] = useState("");
  const workflowItems = workflows.map((workflow) => ({
    id: workflow.slug,
    label: workflow.name,
    toolSlugs: workflow.toolSlugs,
    categories: toolsForWorkflow(workflow).map((tool) => tool.category)
  }));
  const microWorkflowItems = microWorkflows.map((microWorkflow) => {
    const relatedTools = toolsForMicroWorkflow(microWorkflow.slug);
    return {
      id: microWorkflow.slug,
      label: microWorkflow.name,
      toolSlugs: relatedTools.map((tool) => tool.slug),
      categories: relatedTools.map((tool) => tool.category)
    };
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!logoUrl) {
      setLogoError("Upload a product logo to create this profile.");
      return;
    }
    const formData = new FormData(event.currentTarget);
    const record = buildLocalProductRecord({
      existingSlugs: [...tools.map((tool) => tool.slug), ...readLocalProducts().map((product) => product.slug)],
      logoUrl,
      name: String(formData.get("productName") ?? ""),
      website: String(formData.get("website") ?? ""),
      socialUrl: String(formData.get("socialProfile") ?? ""),
      tagline: String(formData.get("tagline") ?? ""),
      description: String(formData.get("description") ?? ""),
      category: selectedCategory as CategoryName,
      workflowSlugs: selectedWorkflows,
      microWorkflowSlugs: selectedMicroWorkflows
    });
    saveLocalProduct(record);
    setSubmitted(true);
  }

  return (
    <div className="stack onboardingPage">
      {submitted ? (
        <section className="sidePanel claimConfirmation">
          <div className="panelHeader"><h2>Your product profile has been created</h2></div>
          <p>Continue to your profile to manage this product asset and add workflow, micro workflow, and creator relationships that improve discovery.</p>
          <p className="onboardingNote">You can keep strengthening your product profile as you connect more graph relationships.</p>
          <div className="claimActionRail">
            <Link className="primaryButton" href="/dashboard">Continue to Profile</Link>
          </div>
        </section>
      ) : (
        <section>
          <form className="claimForm" onSubmit={handleSubmit}>
            <div className="panelHeader onboardingFormHeader">
              <div>
                <h2>Product details</h2>
                <p>Create your product profile, then continue to your profile to improve discovery.</p>
              </div>
              <p className="onboardingSecondaryPath">Already listed?<br /><Link href="/search?type=product">Search & claim an existing product →</Link></p>
            </div>
            <ImageUploadField
              error={logoError}
              help="Recommended: 512x512px or larger."
              label="Product Logo *"
              name="logo"
              previewUrl={logoUrl}
              setError={setLogoError}
              setPreviewUrl={setLogoUrl}
            />
            <Field label="Product name">
              <input name="productName" placeholder="xLikes" required />
            </Field>
            <Field label="Website">
              <input name="website" type="url" placeholder="https://example.com" required />
            </Field>
            <Field label="X / social profile">
              <input name="socialProfile" type="url" placeholder="https://x.com/product" />
            </Field>
            <Field label="Short tagline" help="One-line product positioning.">
              <input name="tagline" placeholder="Turn any list into a qualified lead pipeline." required />
            </Field>
            <Field label="One-sentence description" help="What the product helps users do.">
              <textarea name="description" placeholder="Describe the core job your product helps users complete." required />
            </Field>
            <Field label="Primary category" help="Broad ecosystem category.">
              <select name="category" required value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
                <option value="" disabled>Select a category</option>
                {categories.map((category) => <option value={category.name} key={category.slug}>{categoryLabel(category.name)}</option>)}
              </select>
            </Field>
            <GraphSelector
              help="Choose up to 3 workflows where your product belongs."
              items={workflowItems}
              label="Associated Workflows"
              limit={3}
              optional
              selected={selectedWorkflows}
              suggestions={suggestByCategory(workflowItems, selectedCategory)}
              setSelected={setSelectedWorkflows}
            />
            <GraphSelector
              help="Choose up to 5 specific tasks your product helps complete."
              items={microWorkflowItems}
              label="Associated Micro Workflows"
              limit={5}
              optional
              selected={selectedMicroWorkflows}
              suggestions={suggestByCategory(microWorkflowItems, selectedCategory)}
              setSelected={setSelectedMicroWorkflows}
            />
            <p className="fieldHint">You can add more after your profile is created.</p>
            <button className="primaryButton" type="submit">Create product profile</button>
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
  limit: number;
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
    if (selected.length < limit) setSelected([...selected, id]);
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
      <small className="fieldHint">{selected.length}/{limit} selected</small>
    </div>
  );
}

function SelectorButton({ closeOnSelect = false, item, limit, selected, setOpen, toggle }: { closeOnSelect?: boolean; item: SelectorItem; limit: number; selected: string[]; setOpen?: (open: boolean) => void; toggle: (id: string) => void }) {
  const active = selected.includes(item.id);
  const disabled = !active && selected.length >= limit;
  return (
    <button className={active ? "active" : ""} disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => { toggle(item.id); if (closeOnSelect) setOpen?.(false); }} type="button">
      <SelectorVisual item={item} />
    </button>
  );
}

function SelectorVisual({ item }: { item: SelectorItem }) {
  return (
    <>
      {item.toolSlugs?.length ? <WorkflowStack toolSlugs={item.toolSlugs} limit={5} /> : null}
      <span>{item.label}</span>
    </>
  );
}

function categoryLabel(name: string) {
  return name.replace(/^AI\s+/, "");
}

function suggestByCategory(items: SelectorItem[], selectedCategory: string) {
  const categoryMatches = selectedCategory
    ? items.filter((item) => item.categories?.includes(selectedCategory))
    : [];
  return uniqueItems([...categoryMatches, ...items]).slice(0, 4);
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
