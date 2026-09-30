#!/usr/bin/env node

import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const projectRoot = path.resolve(new URL("..", import.meta.url).pathname);

require.extensions[".ts"] = function loadTs(module, filename) {
  const source = require("node:fs").readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      resolveJsonModule: true,
      jsx: ts.JsxEmit.ReactJSX
    },
    fileName: filename
  });
  module._compile(output.outputText, filename);
};

const data = require(path.join(projectRoot, "lib/data.ts"));
const search = require(path.join(projectRoot, "lib/search.ts"));
const format = require(path.join(projectRoot, "lib/format.ts"));

const {
  canonicalAliases,
  categories,
  creatorToolRelationships,
  creators,
  microWorkflows,
  microWorkflowToolRelationships,
  tools,
  workflowMicroWorkflowRelationships,
  workflows
} = data;

const { graphSearchIndex } = search;
const displayCategory = format.displayCategory ?? ((value) => value.replace(/^AI\s+/, ""));

const normalize = (value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const compact = (value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const unique = (items) => [...new Set(items.filter(Boolean))];

const report = {
  errors: [],
  warnings: [],
  info: []
};

function add(level, label, detail) {
  report[level].push({ label, detail });
}

function sample(items, limit = 40) {
  return items.length > limit ? { count: items.length, sample: items.slice(0, limit) } : items;
}

function duplicateBy(items, keyFn) {
  const groups = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.entries()].filter(([, group]) => group.length > 1);
}

function slugSet(items) {
  return new Set(items.map((item) => item.slug));
}

const publicTools = tools.filter((tool) => tool.listingStatus === "accepted" && !tool.suppressed);
const toolSlugs = slugSet(tools);
const publicToolSlugs = slugSet(publicTools);
const workflowSlugs = slugSet(workflows);
const microWorkflowSlugs = slugSet(microWorkflows);
const creatorIds = new Set(creators.map((creator) => creator.id));
const categoryNames = new Set(categories.map((category) => category.name));

const graphNodes = [
  ...publicTools.map((tool) => ({ type: "tool", label: tool.name, slug: tool.slug })),
  ...creators.map((creator) => ({ type: "creator", label: creator.name, slug: creator.id })),
  ...workflows.map((workflow) => ({ type: "workflow", label: workflow.name, slug: workflow.slug })),
  ...microWorkflows.map((microWorkflow) => ({ type: "micro_workflow", label: microWorkflow.name, slug: microWorkflow.slug })),
  ...categories.map((category) => ({ type: "category", label: displayCategory(category.name), slug: category.slug }))
];

for (const [key, group] of duplicateBy(graphNodes, (node) => `${node.type}:${node.slug}`)) {
  add("errors", "Duplicate node slug", { key, nodes: group });
}

for (const [key, group] of duplicateBy(graphNodes, (node) => compact(node.label))) {
  const types = unique(group.map((node) => node.type));
  if (types.length > 1) add("warnings", "Cross-type normalized label collision", { key, nodes: group });
}

for (const [key, group] of duplicateBy(categories, (category) => compact(displayCategory(category.name)))) {
  add("errors", "Duplicate canonical category display label", { key, categories: group.map((category) => category.name) });
}

const categoryVariants = categories
  .filter((category) => category.name.startsWith("AI "))
  .map((category) => ({ internal: category.name, canonicalDisplay: displayCategory(category.name), slug: category.slug }));
add("info", "Canonical category display labels", categoryVariants);

const workflowToolRefs = workflows.flatMap((workflow) => workflow.toolSlugs.map((toolSlug) => ({ workflowSlug: workflow.slug, toolSlug })));
for (const ref of workflowToolRefs) {
  if (!toolSlugs.has(ref.toolSlug)) add("errors", "Invalid workflow/tool relationship", ref);
}

for (const relationship of workflowMicroWorkflowRelationships) {
  if (!workflowSlugs.has(relationship.workflowSlug)) add("errors", "Invalid workflow/micro workflow parent", relationship);
  if (!microWorkflowSlugs.has(relationship.microWorkflowSlug)) add("errors", "Invalid workflow/micro workflow child", relationship);
}

for (const relationship of microWorkflowToolRelationships) {
  if (!microWorkflowSlugs.has(relationship.microWorkflowSlug)) add("errors", "Invalid micro workflow/tool parent", relationship);
  if (!toolSlugs.has(relationship.toolSlug)) add("errors", "Invalid micro workflow/tool child", relationship);
}

for (const relationship of creatorToolRelationships) {
  if (!creatorIds.has(relationship.creatorId)) add("errors", "Invalid creator/tool creator", relationship);
  if (!toolSlugs.has(relationship.toolSlug)) add("errors", "Invalid creator/tool product", relationship);
}

for (const tool of publicTools) {
  if (!categoryNames.has(tool.category)) add("errors", "Missing product/category mapping", { tool: tool.name, slug: tool.slug, category: tool.category });
}

const toolsByWorkflow = new Map();
for (const ref of workflowToolRefs) toolsByWorkflow.set(ref.toolSlug, (toolsByWorkflow.get(ref.toolSlug) ?? 0) + 1);

const toolsByMicroWorkflow = new Map();
for (const relationship of microWorkflowToolRelationships.filter((item) => item.status === "accepted")) {
  toolsByMicroWorkflow.set(relationship.toolSlug, (toolsByMicroWorkflow.get(relationship.toolSlug) ?? 0) + 1);
}

const toolsByCreator = new Map();
for (const relationship of creatorToolRelationships.filter((item) => item.status === "accepted" && item.relationshipType !== "mentions")) {
  toolsByCreator.set(relationship.toolSlug, (toolsByCreator.get(relationship.toolSlug) ?? 0) + 1);
}

const orphanTools = publicTools
  .filter((tool) => !toolsByWorkflow.has(tool.slug) && !toolsByMicroWorkflow.has(tool.slug) && !toolsByCreator.has(tool.slug))
  .map((tool) => tool.slug);
if (orphanTools.length) add("warnings", "Public tools with category/search only and no workflow, micro workflow, or creator edge", orphanTools);

const weakTools = publicTools
  .filter((tool) => !toolsByWorkflow.has(tool.slug) || !toolsByMicroWorkflow.has(tool.slug))
  .map((tool) => ({
    slug: tool.slug,
    workflowEdges: toolsByWorkflow.get(tool.slug) ?? 0,
    microWorkflowEdges: toolsByMicroWorkflow.get(tool.slug) ?? 0,
    creatorEdges: toolsByCreator.get(tool.slug) ?? 0
  }));
if (weakTools.length) add("warnings", "Public tools missing workflow or micro-workflow minimums", weakTools);

const workflowsMissingTools = workflows.filter((workflow) => !workflow.toolSlugs.length).map((workflow) => workflow.slug);
if (workflowsMissingTools.length) add("errors", "Workflows with no tools", workflowsMissingTools);

const workflowsMissingMicroWorkflows = workflows
  .filter((workflow) => !workflowMicroWorkflowRelationships.some((relationship) => relationship.status === "accepted" && relationship.workflowSlug === workflow.slug))
  .map((workflow) => workflow.slug);
if (workflowsMissingMicroWorkflows.length) add("errors", "Workflows with no micro workflow mapping", workflowsMissingMicroWorkflows);

const microWorkflowsMissingTools = microWorkflows
  .filter((microWorkflow) => !microWorkflowToolRelationships.some((relationship) => relationship.status === "accepted" && relationship.microWorkflowSlug === microWorkflow.slug))
  .map((microWorkflow) => microWorkflow.slug);
if (microWorkflowsMissingTools.length) add("errors", "Micro workflows with no tools", microWorkflowsMissingTools);

const microWorkflowsMissingParents = microWorkflows
  .filter((microWorkflow) => !workflowMicroWorkflowRelationships.some((relationship) => relationship.status === "accepted" && relationship.microWorkflowSlug === microWorkflow.slug))
  .map((microWorkflow) => microWorkflow.slug);
if (microWorkflowsMissingParents.length) add("warnings", "Micro workflows with no parent workflow", microWorkflowsMissingParents);

const creatorToolCounts = new Map();
for (const relationship of creatorToolRelationships.filter((item) => item.status === "accepted")) {
  creatorToolCounts.set(relationship.creatorId, (creatorToolCounts.get(relationship.creatorId) ?? 0) + 1);
}

const orphanCreators = creators.filter((creator) => !creatorToolCounts.has(creator.id) && !creator.workflowSlugs.length).map((creator) => creator.id);
if (orphanCreators.length) add("warnings", "Creators with no active tool or workflow edge", orphanCreators);

const creatorsWithoutMicroWorkflows = creators
  .filter((creator) => !creator.workflowSlugs.some((workflowSlug) => workflowMicroWorkflowRelationships.some((relationship) => relationship.status === "accepted" && relationship.workflowSlug === workflowSlug)))
  .map((creator) => creator.id);
if (creatorsWithoutMicroWorkflows.length) add("warnings", "Creators with no derived micro-workflow context", creatorsWithoutMicroWorkflows);

const searchIds = new Set(graphSearchIndex.map((result) => result.id));
if (searchIds.size !== graphSearchIndex.length) {
  add("errors", "Duplicate search result IDs", duplicateBy(graphSearchIndex, (result) => result.id).map(([key, group]) => ({ key, count: group.length })));
}

const aliasOwners = new Map();
for (const result of graphSearchIndex) {
  for (const alias of unique([result.name, result.slug, ...(result.aliases ?? [])])) {
    const key = compact(alias);
    if (!key) continue;
    aliasOwners.set(key, [...(aliasOwners.get(key) ?? []), result.id]);
  }
}

const aliasConflicts = [...aliasOwners.entries()]
  .map(([alias, owners]) => [alias, unique(owners)])
  .filter(([, owners]) => owners.length > 1)
  .map(([alias, owners]) => ({ alias, owners }));
const publicAliasConflicts = aliasConflicts.filter((conflict) => conflict.owners.some((owner) => !owner.startsWith("topic:") && !owner.startsWith("category:")));
const taxonomyAliasConflicts = aliasConflicts.filter((conflict) => !publicAliasConflicts.includes(conflict));
if (publicAliasConflicts.length) add("errors", "Alias conflicts across public search nodes", publicAliasConflicts);
if (taxonomyAliasConflicts.length) add("warnings", "Topic/category alias overlap", sample(taxonomyAliasConflicts));

const searchAliasByCanonical = new Map(graphSearchIndex.map((result) => [result.slug, unique([result.name, result.slug, ...(result.aliases ?? [])]).map(compact)]));
const canonicalAliasesMissingFromSearch = canonicalAliases
  .filter((alias) => !(searchAliasByCanonical.get(alias.slug) ?? []).includes(compact(alias.alias)))
  .map((alias) => ({ alias: alias.alias, slug: alias.slug }));
if (canonicalAliasesMissingFromSearch.length) add("errors", "Canonical aliases missing from search index", canonicalAliasesMissingFromSearch);

const recommendedAliases = [
  { alias: "OpenAI", slug: "chatgpt" },
  { alias: "Anthropic", slug: "claude" },
  { alias: "Google Notebook LM", slug: "notebooklm" },
  { alias: "v0.dev", slug: "v0" }
].filter((alias) => !(searchAliasByCanonical.get(alias.slug) ?? []).includes(compact(alias.alias)));
if (recommendedAliases.length) add("warnings", "Recommended aliases not yet covered", recommendedAliases);

for (const item of report.warnings) {
  if (Array.isArray(item.detail)) item.detail = sample(item.detail);
}

const summary = {
  nodeCounts: {
    publicTools: publicTools.length,
    creators: creators.length,
    workflows: workflows.length,
    microWorkflows: microWorkflows.length,
    categories: categories.length,
    searchNodes: graphSearchIndex.length
  },
  relationshipCounts: {
    workflowTool: workflowToolRefs.length,
    workflowMicroWorkflow: workflowMicroWorkflowRelationships.length,
    microWorkflowTool: microWorkflowToolRelationships.length,
    creatorTool: creatorToolRelationships.length
  },
  issueCounts: {
    errors: report.errors.length,
    warnings: report.warnings.length,
    info: report.info.length
  }
};

console.log(JSON.stringify({ summary, ...report }, null, 2));

if (report.errors.length) {
  process.exitCode = 1;
}
