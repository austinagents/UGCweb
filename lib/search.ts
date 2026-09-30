import { attentionSubCategories, canonicalAliases, categories, creatorToolRelationships, creators, edgesForTool, getTool, microWorkflows, microWorkflowsForWorkflow, microWorkflowToolRelationships, tools, toolsForMicroWorkflow, toolsForWorkflow, workflowMicroWorkflowRelationships, workflows } from "./data";
import { ecosystemTags } from "./ecosystem-tags";
import { displayCategory } from "./format";

export type SearchResultType = "product" | "creator" | "workflow" | "micro_workflow" | "topic" | "category";
export type PublicSearchResultType = Exclude<SearchResultType, "topic" | "category">;

export type SearchRelatedNode = {
  label: string;
  href: string;
  type: PublicSearchResultType;
};

export type SearchResult = {
  id: string;
  type: SearchResultType;
  name: string;
  slug: string;
  href: string;
  description: string;
  tags: string[];
  graphContext: string;
  scoreSeed: number;
  searchable: string;
  aliases: string[];
  toolSlugs: string[];
  relatedWorkflows: SearchRelatedNode[];
  relatedCreators: SearchRelatedNode[];
  relatedProducts: SearchRelatedNode[];
  relatedMicroWorkflows: SearchRelatedNode[];
};

export type SearchFilters = {
  type?: PublicSearchResultType | "all";
};

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const compactNormalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");
const workflowIntentTerms = ["workflow", "workflows", "lead generation", "outbound", "founder", "ai video", "research", "automation", "agents", "coding"];
const creatorIntentTerms = ["creator", "creators", "influencer", "thought leader"];
const outboundTerms = ["outbound", "lead generation", "prospecting", "sales"];
const aiVideoTerms = ["ai video", "video", "faceless", "tiktok", "youtube"];
const broadExplorationTerms = ["lead generation", "ai video", "research", "automation", "agents", "outbound", "coding"];
const publicResultTypes: PublicSearchResultType[] = ["product", "creator", "workflow", "micro_workflow"];
const defaultGroupOrder: PublicSearchResultType[] = ["product", "creator", "workflow", "micro_workflow"];
const workflowGroupOrder: PublicSearchResultType[] = ["workflow", "product", "creator", "micro_workflow"];
const creatorGroupOrder: PublicSearchResultType[] = ["creator", "product", "workflow", "micro_workflow"];
const microWorkflowGroupOrder: PublicSearchResultType[] = ["micro_workflow", "workflow", "product", "creator"];
const workflowGroupIntentTerms = ["workflow", "workflows", "process", "playbook", "system", "engine", "how to"];
const creatorGroupIntentTerms = ["creator", "creators", "influencer", "operator", "expert"];
const productGroupIntentTerms = ["tool", "tools", "product", "products", "app", "software"];
const microWorkflowGroupIntentTerms = ["micro workflow", "micro workflows", "step", "task", "action", "implementation"];

function aliasesForSlug(slug: string) {
  return canonicalAliases.filter((alias) => alias.slug === slug).flatMap((alias) => [alias.alias, alias.canonical]);
}

function node(label: string, href: string, type: PublicSearchResultType): SearchRelatedNode {
  return { label, href, type };
}

function publicOnly(result: SearchResult): result is SearchResult & { type: PublicSearchResultType } {
  return publicResultTypes.includes(result.type as PublicSearchResultType);
}

function relatedCreatorsForTool(toolSlug: string) {
  return creatorToolRelationships
    .filter((relationship) => relationship.status === "accepted" && relationship.toolSlug === toolSlug && relationship.relationshipType !== "mentions")
    .map((relationship) => creators.find((creator) => creator.id === relationship.creatorId))
    .filter(Boolean)
    .slice(0, 4)
    .map((creator) => node(creator!.name, `/creators/${creator!.id}`, "creator"));
}

function relatedMicroWorkflowsForTool(toolSlug: string) {
  return microWorkflowToolRelationships
    .filter((relationship) => relationship.status === "accepted" && relationship.toolSlug === toolSlug)
    .map((relationship) => microWorkflows.find((microWorkflow) => microWorkflow.slug === relationship.microWorkflowSlug))
    .filter(Boolean)
    .slice(0, 4)
    .map((microWorkflow) => {
      const workflow = workflows.find((item) => workflowMicroWorkflowRelationships.some((relationship) => relationship.status === "accepted" && relationship.workflowSlug === item.slug && relationship.microWorkflowSlug === microWorkflow!.slug));
      return node(microWorkflow!.name, workflow ? `/workflows/${workflow.slug}` : "/workflows", "micro_workflow");
    });
}

function productResults(): SearchResult[] {
  return tools
    .filter((tool) => tool.listingStatus === "accepted" && !tool.suppressed)
    .map((tool) => {
      const relatedWorkflows = workflows.filter((workflow) => workflow.toolSlugs.includes(tool.slug)).slice(0, 3);
      const relatedCreators = creatorToolRelationships.filter((relationship) => relationship.status === "accepted" && relationship.toolSlug === tool.slug).length;
      const tags = [...new Set([displayCategory(tool.category), ...tool.subCategoryTags, ...tool.tags])].slice(0, 8);
      const graphContext = relatedWorkflows.length
        ? `Used in ${relatedWorkflows.map((workflow) => workflow.name).join(", ")}`
        : relatedCreators
          ? `${relatedCreators} accepted creator relationship${relatedCreators === 1 ? "" : "s"}`
          : "Product node ready for workflow and creator connections";

      return {
        id: `product:${tool.slug}`,
        type: "product" as const,
        name: tool.name,
        slug: tool.slug,
        href: `/tools/${tool.slug}`,
        description: tool.tagline || tool.description,
        tags,
        graphContext,
        scoreSeed: tool.qualityScore + tool.momentumScore + relatedWorkflows.length * 8 + relatedCreators * 5,
        aliases: [...new Set([tool.name, tool.slug, ...aliasesForSlug(tool.slug)])],
        toolSlugs: [tool.slug],
        relatedWorkflows: relatedWorkflows.map((workflow) => node(workflow.name, `/workflows/${workflow.slug}`, "workflow")),
        relatedCreators: relatedCreatorsForTool(tool.slug),
        relatedProducts: edgesForTool(tool.slug)
          .map((edge) => getTool(edge.fromSlug === tool.slug ? edge.toSlug : edge.fromSlug))
          .filter((item): item is NonNullable<ReturnType<typeof getTool>> => Boolean(item))
          .slice(0, 4)
          .map((item) => node(item.name, `/tools/${item.slug}`, "product")),
        relatedMicroWorkflows: relatedMicroWorkflowsForTool(tool.slug),
        searchable: [
          tool.name,
          tool.slug,
          tool.description,
          tool.tagline,
          tool.longDescription,
          tool.category,
          tool.subCategoryTags.join(" "),
          tool.tags.join(" "),
          tool.useCases.join(" "),
          relatedWorkflows.map((workflow) => workflow.name).join(" ")
        ].join(" ")
      };
    });
}

function workflowResults(): SearchResult[] {
  return workflows.map((workflow) => {
    const stackTools = toolsForWorkflow(workflow);
    const relatedMicroWorkflows = microWorkflowsForWorkflow(workflow.slug);
    const tags = [...new Set([workflow.outcome, ...stackTools.map((tool) => displayCategory(tool.category)), ...stackTools.flatMap((tool) => tool.subCategoryTags)])].slice(0, 8);
    return {
      id: `workflow:${workflow.slug}`,
      type: "workflow" as const,
      name: workflow.name,
      slug: workflow.slug,
      href: `/workflows/${workflow.slug}`,
      description: workflow.outcome,
      tags,
      graphContext: stackTools.map((tool) => tool.name).join(" -> "),
      scoreSeed: workflow.momentumScore + workflow.savesCount / 100 + stackTools.length * 10,
      aliases: [workflow.name, workflow.slug],
      toolSlugs: workflow.toolSlugs,
      relatedWorkflows: workflows
        .filter((item) => item.slug !== workflow.slug && item.toolSlugs.some((slug) => workflow.toolSlugs.includes(slug)))
        .slice(0, 3)
        .map((item) => node(item.name, `/workflows/${item.slug}`, "workflow")),
      relatedCreators: creators
        .filter((creator) => creator.workflowSlugs.includes(workflow.slug))
        .slice(0, 4)
        .map((creator) => node(creator.name, `/creators/${creator.id}`, "creator")),
      relatedProducts: stackTools.slice(0, 5).map((tool) => node(tool.name, `/tools/${tool.slug}`, "product")),
      relatedMicroWorkflows: relatedMicroWorkflows.slice(0, 5).map((microWorkflow) => node(microWorkflow.name, `/workflows/${workflow.slug}`, "micro_workflow")),
      searchable: [
        workflow.name,
        workflow.slug,
        workflow.description,
        workflow.outcome,
        relatedMicroWorkflows.map((microWorkflow) => `${microWorkflow.name} ${microWorkflow.outcome}`).join(" "),
        stackTools.map((tool) => `${tool.name} ${tool.category} ${tool.tags.join(" ")} ${tool.subCategoryTags.join(" ")}`).join(" ")
      ].join(" ")
    };
  });
}

function creatorResults(): SearchResult[] {
  return creators.map((creator) => {
    const creatorTools = tools.filter((tool) => creator.toolSlugs.includes(tool.slug)).slice(0, 4);
    const creatorWorkflows = workflows.filter((workflow) => creator.workflowSlugs.includes(workflow.slug)).slice(0, 3);
    const tags = [...new Set([creator.primarySpecialization, ...creator.specializationTags, ...creator.creatorTypes, ...creator.platformFocus].filter(Boolean) as string[])].slice(0, 8);
    const graphContext = [
      creatorTools.length ? `Tools: ${creatorTools.map((tool) => tool.name).join(", ")}` : "",
      creatorWorkflows.length ? `Workflows: ${creatorWorkflows.map((workflow) => workflow.name).join(", ")}` : ""
    ].filter(Boolean).join(" · ") || "Creator node ready for tool and workflow connections";

    return {
      id: `creator:${creator.id}`,
      type: "creator" as const,
      name: creator.name,
      slug: creator.id,
      href: `/creators/${creator.id}`,
      description: creator.bio,
      tags,
      graphContext,
      scoreSeed: creator.creatorScore + creatorTools.length * 8 + creatorWorkflows.length * 10,
      aliases: [creator.name, creator.id, creator.handle?.replace(/^@/, "") ?? ""].filter(Boolean),
      toolSlugs: creatorTools.map((tool) => tool.slug),
      relatedWorkflows: creatorWorkflows.map((workflow) => node(workflow.name, `/workflows/${workflow.slug}`, "workflow")),
      relatedCreators: creators
        .filter((item) => item.id !== creator.id && item.specializationTags.some((tag) => creator.specializationTags.includes(tag)))
        .slice(0, 4)
        .map((item) => node(item.name, `/creators/${item.id}`, "creator")),
      relatedProducts: creatorTools.map((tool) => node(tool.name, `/tools/${tool.slug}`, "product")),
      relatedMicroWorkflows: creatorWorkflows
        .flatMap((workflow) => microWorkflowsForWorkflow(workflow.slug).map((microWorkflow) => node(microWorkflow.name, `/workflows/${workflow.slug}`, "micro_workflow")))
        .slice(0, 4),
      searchable: [
        creator.name,
        creator.handle,
        creator.bio,
        creator.creatorCategory,
        creator.specializationTags.join(" "),
        creator.creatorTypes.join(" "),
        creator.platformFocus.join(" "),
        creator.audienceTags.join(" "),
        creator.influenceTags.join(" "),
        creatorTools.map((tool) => tool.name).join(" "),
        creatorWorkflows.map((workflow) => workflow.name).join(" ")
      ].join(" ")
    };
  });
}

function topicResults(): SearchResult[] {
  const attentionTopics = attentionSubCategories.map((topic) => {
    const topicTools = tools.filter((tool) => topic.relatedToolSlugs.includes(tool.slug)).slice(0, 4);
    return {
      id: `topic:${topic.slug}`,
      type: "topic" as const,
      name: topic.label,
      slug: topic.slug,
      href: `/tags/${topic.slug}`,
      description: `${topic.label} attention cluster across tools, workflows, creators, and categories.`,
      tags: topicTools.map((tool) => tool.name).slice(0, 6),
      graphContext: topicTools.length ? `Related tools: ${topicTools.map((tool) => tool.name).join(", ")}` : "Topic node ready for graph traversal",
      scoreSeed: topic.momentumScore + topic.toolsTracked * 4,
      aliases: [topic.label, topic.slug],
      toolSlugs: topicTools.map((tool) => tool.slug),
      relatedWorkflows: workflows
        .filter((workflow) => toolsForWorkflow(workflow).some((tool) => topic.relatedToolSlugs.includes(tool.slug)))
        .slice(0, 4)
        .map((workflow) => node(workflow.name, `/workflows/${workflow.slug}`, "workflow")),
      relatedCreators: [],
      relatedProducts: topicTools.map((tool) => node(tool.name, `/tools/${tool.slug}`, "product")),
      relatedMicroWorkflows: [],
      searchable: [topic.label, topic.slug, topicTools.map((tool) => `${tool.name} ${tool.tags.join(" ")}`).join(" ")].join(" ")
    };
  });

  const ecosystemTopicResults = ecosystemTags.map((tag) => {
    const tagSlug = slugify(tag.label);
    const relatedTools = tools.filter((tool) => tool.tags.includes(tag.label) || tool.subCategoryTags.includes(tag.label) || tool.category === tag.categories[0]).slice(0, 4);
    return {
      id: `topic:${tag.slug}`,
      type: "topic" as const,
      name: tag.label,
      slug: tag.slug,
      href: `/tags/${tag.slug}`,
      description: `${tag.label} ecosystem tag across AppScreener graph nodes.`,
      tags: [...tag.categories, tag.kind].slice(0, 6),
      graphContext: relatedTools.length ? `Related tools: ${relatedTools.map((tool) => tool.name).join(", ")}` : "Ecosystem tag for creator and attention navigation",
      scoreSeed: relatedTools.length * 8 + (tag.slug === tagSlug ? 20 : 10),
      aliases: [tag.label, tag.slug],
      toolSlugs: relatedTools.map((tool) => tool.slug),
      relatedWorkflows: workflows
        .filter((workflow) => toolsForWorkflow(workflow).some((tool) => relatedTools.some((relatedTool) => relatedTool.slug === tool.slug)))
        .slice(0, 4)
        .map((workflow) => node(workflow.name, `/workflows/${workflow.slug}`, "workflow")),
      relatedCreators: [],
      relatedProducts: relatedTools.map((tool) => node(tool.name, `/tools/${tool.slug}`, "product")),
      relatedMicroWorkflows: [],
      searchable: [tag.label, tag.slug, tag.kind, tag.categories.join(" "), relatedTools.map((tool) => tool.name).join(" ")].join(" ")
    };
  });

  return [...attentionTopics, ...ecosystemTopicResults].filter((item, index, list) => list.findIndex((candidate) => candidate.href === item.href) === index);
}

function categoryResults(): SearchResult[] {
  return categories.map((category) => {
    const categoryTools = tools.filter((tool) => tool.category === category.name).slice(0, 4);
    const categoryWorkflows = workflows.filter((workflow) => toolsForWorkflow(workflow).some((tool) => tool.category === category.name)).slice(0, 3);
    return {
      id: `category:${category.slug}`,
      type: "category" as const,
      name: displayCategory(category.name),
      slug: category.slug,
      href: `/categories/${category.slug}`,
      description: category.description,
      tags: [...categoryTools.map((tool) => tool.name), ...categoryWorkflows.map((workflow) => workflow.name)].slice(0, 8),
      graphContext: `${categoryTools.length} related products · ${categoryWorkflows.length} related workflows`,
      scoreSeed: category.momentumScore + category.toolsTracked * 2,
      aliases: [category.name, category.slug, displayCategory(category.name)],
      toolSlugs: categoryTools.map((tool) => tool.slug),
      relatedWorkflows: categoryWorkflows.map((workflow) => node(workflow.name, `/workflows/${workflow.slug}`, "workflow")),
      relatedCreators: [],
      relatedProducts: categoryTools.map((tool) => node(tool.name, `/tools/${tool.slug}`, "product")),
      relatedMicroWorkflows: [],
      searchable: [category.name, category.slug, category.description, categoryTools.map((tool) => tool.name).join(" "), categoryWorkflows.map((workflow) => workflow.name).join(" ")].join(" ")
    };
  });
}

function microWorkflowResults(): SearchResult[] {
  return microWorkflows.map((microWorkflow) => {
    const relatedWorkflows = workflows.filter((workflow) => workflowMicroWorkflowRelationships.some((relationship) => relationship.status === "accepted" && relationship.workflowSlug === workflow.slug && relationship.microWorkflowSlug === microWorkflow.slug));
    const relatedTools = toolsForMicroWorkflow(microWorkflow.slug);
    const href = relatedWorkflows[0] ? `/workflows/${relatedWorkflows[0].slug}` : "/workflows";

    return {
      id: `micro_workflow:${microWorkflow.slug}`,
      type: "micro_workflow" as const,
      name: microWorkflow.name,
      slug: microWorkflow.slug,
      href,
      description: microWorkflow.outcome,
      tags: [...relatedTools.map((tool) => tool.name), ...relatedWorkflows.map((workflow) => workflow.name)].slice(0, 8),
      graphContext: [
        relatedTools.length ? `Tools: ${relatedTools.map((tool) => tool.name).join(" -> ")}` : "",
        relatedWorkflows.length ? `Workflows: ${relatedWorkflows.slice(0, 3).map((workflow) => workflow.name).join(", ")}` : ""
      ].filter(Boolean).join(" · ") || microWorkflow.description,
      scoreSeed: microWorkflow.confidence + relatedWorkflows.length * 12 + relatedTools.length * 8,
      aliases: [microWorkflow.name, microWorkflow.slug],
      toolSlugs: relatedTools.map((tool) => tool.slug),
      relatedWorkflows: relatedWorkflows.slice(0, 5).map((workflow) => node(workflow.name, `/workflows/${workflow.slug}`, "workflow")),
      relatedCreators: [],
      relatedProducts: relatedTools.map((tool) => node(tool.name, `/tools/${tool.slug}`, "product")),
      relatedMicroWorkflows: [],
      searchable: [
        microWorkflow.name,
        microWorkflow.slug,
        microWorkflow.description,
        microWorkflow.outcome,
        relatedTools.map((tool) => `${tool.name} ${tool.category} ${tool.tags.join(" ")} ${tool.useCases.join(" ")}`).join(" "),
        relatedWorkflows.map((workflow) => `${workflow.name} ${workflow.outcome}`).join(" ")
      ].join(" ")
    };
  });
}

export const graphSearchIndex: SearchResult[] = [
  ...productResults(),
  ...workflowResults(),
  ...microWorkflowResults(),
  ...creatorResults(),
  ...topicResults(),
  ...categoryResults()
];

function scoreResult(result: SearchResult, query: string) {
  if (!query) return result.scoreSeed;
  const normalizedQuery = normalize(query);
  const normalizedName = normalize(result.name);
  const normalizedSlug = normalize(result.slug);
  const normalizedTags = normalize(result.tags.join(" "));
  const normalizedContext = normalize(result.graphContext);
  const normalizedSearchable = normalize(result.searchable);
  let score = result.scoreSeed;
  const hasWorkflowIntent = workflowIntentTerms.some((term) => normalizedQuery.includes(term));
  const hasCreatorIntent = creatorIntentTerms.some((term) => normalizedQuery.includes(term));
  const hasOutboundIntent = outboundTerms.some((term) => normalizedQuery.includes(term));
  const hasAiVideoIntent = aiVideoTerms.some((term) => normalizedQuery.includes(term));

  if (normalizedName === normalizedQuery || normalizedSlug === normalizedQuery) score += 1000;
  if (normalizedName.startsWith(normalizedQuery) || normalizedSlug.startsWith(normalizedQuery)) score += 700;
  if (normalizedTags.includes(normalizedQuery)) score += 450;
  if (normalizedContext.includes(normalizedQuery)) score += 360;
  if (normalizedSearchable.includes(normalizedQuery)) score += 220;

  const queryTerms = normalizedQuery.split(" ").filter(Boolean);
  score += queryTerms.reduce((sum, term) => sum + (normalizedSearchable.includes(term) ? 34 : 0), 0);

  if (hasCreatorIntent) {
    if (result.type === "creator") score += 700;
    if (result.type === "product") score -= 180;
  }

  if (hasWorkflowIntent) {
    if (result.type === "workflow") score += 420;
    if (result.type === "product" && normalizedContext.includes("used in")) score += 160;
    if (result.type === "category") score -= 120;
  }

  if (hasOutboundIntent) {
    if (result.type === "workflow" && /outbound|prospecting|lead/.test(normalizedSearchable)) score += 520;
    if (result.type === "product" && /clay|apollo|hubspot|lindy|instantly|linkedin|taplio/.test(normalizedSearchable)) score += 360;
    if (result.type === "topic" && /lead|outreach/.test(normalizedName)) score += 260;
  }

  if (hasAiVideoIntent) {
    if (result.type === "workflow" && /video|tiktok|youtube|influencer/.test(normalizedSearchable)) score += 540;
    if (result.type === "product" && /runway|kling|capcut|elevenlabs|heygen|descript|pika/.test(normalizedSearchable)) score += 380;
    if (result.type === "creator" && /video|creator|runway|kling|capcut|elevenlabs/.test(normalizedSearchable)) score += 180;
  }

  if (normalizedQuery === "workflow" || normalizedQuery === "workflows") {
    if (result.type === "workflow") score += 800;
    if (result.type === "product") score -= 260;
  }

  if (normalizedQuery === "founder") {
    if (result.type === "workflow" && /founder|saas|mvp|outbound/.test(normalizedSearchable)) score += 540;
    if (result.type === "product" && !normalizedContext.includes("founder")) score -= 120;
  }

  return score;
}

export function searchGraph(query: string, filters: SearchFilters = {}) {
  const normalizedQuery = normalize(query);
  const filtered = graphSearchIndex.filter((result) => {
    if (!publicOnly(result)) return false;
    const typeMatch = !filters.type || filters.type === "all" || result.type === filters.type;
    if (!typeMatch) return false;
    if (!normalizedQuery) return true;
    if (resultMatchesIntentGroup(result, normalizedQuery)) return true;
    return normalize(`${result.name} ${result.slug} ${result.description} ${result.tags.join(" ")} ${result.graphContext} ${result.searchable}`).includes(normalizedQuery)
      || normalizedQuery.split(" ").filter(Boolean).some((term) => normalize(result.searchable).includes(term));
  });

  return filtered
    .map((result) => ({ ...result, score: scoreResult(result, query) }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

export function exactSearchMatch(query: string) {
  const normalizedQuery = normalize(query);
  const compactQuery = compactNormalize(query);
  if (!normalizedQuery) return undefined;

  return graphSearchIndex
    .filter(publicOnly)
    .filter((result) => {
      const aliases = [result.name, result.slug, ...result.aliases].map(normalize).filter(Boolean);
      const compactAliases = [result.name, result.slug, ...result.aliases].map(compactNormalize).filter(Boolean);
      return aliases.includes(normalizedQuery) || compactAliases.includes(compactQuery);
    })
    .sort((a, b) => typeExactPriority(a.type) - typeExactPriority(b.type) || b.scoreSeed - a.scoreSeed)[0];
}

export function isBroadExplorationQuery(query: string) {
  const normalizedQuery = normalize(query);
  return broadExplorationTerms.includes(normalizedQuery);
}

export function searchEcosystem(query: string, filters: SearchFilters = {}) {
  const exactMatch = isBroadExplorationQuery(query) ? undefined : exactSearchMatch(query);
  const results = searchGraph(query, filters);
  const mode = exactMatch && (!filters.type || filters.type === "all" || filters.type === exactMatch.type) ? "exact" : "exploration";
  const explorationResults = mode === "exact" && exactMatch ? exactExplorationResults(results, exactMatch) : results;

  return {
    mode,
    exactMatch,
    results: explorationResults,
    groupOrder: groupOrderForQuery(query),
    groupedResults: groupSearchResults(explorationResults)
  };
}

function exactExplorationResults(results: Array<SearchResult & { score?: number }>, exactMatch: SearchResult) {
  if (exactMatch.type !== "product") return results.filter((result) => result.id !== exactMatch.id);

  const hasMatchedProduct = results.some((result) => result.id === exactMatch.id);
  return [
    ...(hasMatchedProduct ? results.filter((result) => result.id === exactMatch.id) : [exactMatch]),
    ...results.filter((result) => result.type !== "product" && result.id !== exactMatch.id)
  ];
}

export function groupSearchResults(results: Array<SearchResult & { score?: number }>) {
  return publicResultTypes.reduce<Record<PublicSearchResultType, typeof results>>((groups, type) => {
    groups[type] = results.filter((result) => result.type === type);
    return groups;
  }, {
    product: [],
    creator: [],
    workflow: [],
    micro_workflow: []
  });
}

function typeExactPriority(type: PublicSearchResultType) {
  if (type === "product") return 1;
  if (type === "creator") return 2;
  if (type === "workflow") return 3;
  return 4;
}

export function groupOrderForQuery(query: string): PublicSearchResultType[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return defaultGroupOrder;
  if (hasMicroWorkflowIntent(normalizedQuery)) return microWorkflowGroupOrder;
  if (workflowGroupIntentTerms.some((term) => normalizedQuery.includes(term))) return workflowGroupOrder;
  if (creatorGroupIntentTerms.some((term) => normalizedQuery.includes(term))) return creatorGroupOrder;
  if (productGroupIntentTerms.some((term) => normalizedQuery.includes(term))) return defaultGroupOrder;
  return defaultGroupOrder;
}

function resultMatchesIntentGroup(result: SearchResult, normalizedQuery: string) {
  if (hasMicroWorkflowIntent(normalizedQuery)) return result.type === "micro_workflow";
  if (workflowGroupIntentTerms.some((term) => normalizedQuery.includes(term))) return result.type === "workflow";
  if (creatorGroupIntentTerms.some((term) => normalizedQuery.includes(term))) return result.type === "creator";
  if (productGroupIntentTerms.some((term) => normalizedQuery.includes(term))) return result.type === "product";
  return false;
}

function hasMicroWorkflowIntent(normalizedQuery: string) {
  return microWorkflowGroupIntentTerms.some((term) => {
    if (term.includes(" ")) return normalizedQuery.includes(term);
    return normalizedQuery.split(" ").includes(term);
  });
}
