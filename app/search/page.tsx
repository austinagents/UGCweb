import Link from "next/link";
import { Search } from "lucide-react";
import { ToolLogo } from "@/components/tool-logo";
import { WorkflowStack } from "@/components/workflow-stack";
import { getTool } from "@/lib/data";
import { betaEventBootstrapScript } from "@/lib/events";
import { searchEcosystem, type PublicSearchResultType, type SearchRelatedNode, type SearchResult, type SearchResultType } from "@/lib/search";

const filters: Array<{ label: string; value: "all" | PublicSearchResultType }> = [
  { label: "All", value: "all" },
  { label: "Products", value: "product" },
  { label: "Creators", value: "creator" },
  { label: "Workflows", value: "workflow" },
  { label: "Micro Workflows", value: "micro_workflow" }
];

export default function SearchPage({ searchParams }: { searchParams: { q?: string; type?: string } }) {
  const query = searchParams.q ?? "";
  const activeType = validType(searchParams.type);
  const searchState = searchEcosystem(query, { type: activeType });
  const hasResults = Boolean(searchState.exactMatch) || searchState.groupOrder.some((type) => searchState.groupedResults[type].length);

  return (
    <div className="stack">
      <script dangerouslySetInnerHTML={{ __html: searchEventScript() }} />
      <section className="searchSurface">
        <form className="searchPageForm" action="/search" data-beta-search-form="true">
          <Search size={18} />
          <input name="q" defaultValue={query} placeholder="Search lead generation, Claude, founder outbound, AI coding..." />
          <input type="hidden" name="type" value={activeType} />
          <button type="submit">Search</button>
        </form>
        <nav className="searchFilterRail" aria-label="Search result filters">
          {filters.map((filter) => {
            const href = `/search?${new URLSearchParams({ ...(query ? { q: query } : {}), type: filter.value }).toString()}`;
            return <Link className={filter.value === activeType ? "active" : ""} href={href} key={filter.value}>{filter.label}</Link>;
          })}
        </nav>
      </section>

      <section className="searchResultsStack">
        {searchState.exactMatch ? <ExactMatchResult result={searchState.exactMatch} /> : null}
        {hasResults ? (
          searchState.groupOrder.map((type) => {
            if (activeType !== "all" && activeType !== type) return null;
            const results = searchState.groupedResults[type].slice(0, searchState.mode === "exact" ? 5 : 12);
            if (!results.length) return null;
            return <ResultGroup results={results} title={groupLabel(type)} key={type} />;
          })
        ) : (
          <div className="sidePanel">
            <div className="panelHeader"><h2>No graph nodes found</h2></div>
            <p className="emptyState">Try a product, creator, workflow, micro workflow, topic, or category. Search supports partial names, tags, workflows, and graph context.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function ExactMatchResult({ result }: { result: SearchResult & { score?: number } }) {
  return (
    <section className="searchExactPanel">
      <div className="searchExactHeader">
        <span className={`searchTypeBadge ${result.type}`}>{typeLabel(result.type)}</span>
        <span>Dominant exact match</span>
      </div>
      <Link
        className="searchExactTitle"
        href={result.href}
        data-beta-search-result="true"
        data-result-type={result.type}
        data-result-id={result.id}
        data-result-href={result.href}
      >
        <span className="searchExactIdentity">
          <SearchResultVisual result={result} />
          <strong>{result.name}</strong>
        </span>
        <small>{result.description}</small>
      </Link>
      {visibleGraphContext(result) ? <div className="searchGraphContext">{visibleGraphContext(result)}</div> : null}
      <div className="searchRelationshipGrid">
        <RelationshipBucket title="Related Workflows" items={result.relatedWorkflows} />
        <RelationshipBucket title="Related Creators" items={result.relatedCreators} />
        <RelationshipBucket title="Related Products" items={result.relatedProducts} />
        <RelationshipBucket title="Related Micro Workflows" items={result.relatedMicroWorkflows} />
      </div>
    </section>
  );
}

function ResultGroup({ title, results }: { title: string; results: Array<SearchResult & { score?: number }> }) {
  return (
    <section className="searchResultGroup">
      <div className="panelHeader"><h2>{title}</h2><p>{results.length} graph {results.length === 1 ? "match" : "matches"}</p></div>
      <div className="searchResultRows">
        {results.map((result) => <SearchResultRow result={result} key={result.id} />)}
      </div>
    </section>
  );
}

function SearchResultRow({ result }: { result: SearchResult & { score?: number } }) {
  return (
    <Link
      className="searchResultRow"
      href={result.href}
      data-beta-search-result="true"
      data-result-type={result.type}
      data-result-id={result.id}
      data-result-href={result.href}
    >
      <div className="searchResultIdentity">
        <span>
          <SearchResultVisual result={result} />
          <strong>{result.name}</strong>
        </span>
        <span className={`searchTypeBadge ${result.type}`}>{typeLabel(result.type)}</span>
      </div>
      <p>{rowContext(result)}</p>
      <small>{secondaryContext(result)}</small>
      <div className="searchTagRail">
        {result.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
      </div>
    </Link>
  );
}

function SearchResultVisual({ result }: { result: SearchResult & { score?: number } }) {
  if (result.type === "product") {
    const tool = getTool(result.slug);
    if (!tool) return null;
    return <ToolLogo officialSrc={tool.officialLogoUrl} src={tool.logoUrl} faviconSrc={tool.faviconUrl} fallback={tool.iconUrl} alt="" size={24} />;
  }

  if ((result.type === "workflow" || result.type === "micro_workflow") && result.toolSlugs.length) {
    return <WorkflowStack toolSlugs={result.toolSlugs} limit={5} />;
  }

  return null;
}

function rowContext(result: SearchResult) {
  if ((result.type === "workflow" || result.type === "micro_workflow") && result.toolSlugs.length) {
    return result.toolSlugs.map((slug) => getTool(slug)?.name).filter(Boolean).join(" -> ");
  }

  return result.description;
}

function secondaryContext(result: SearchResult) {
  if (result.type === "workflow") return result.description;
  if (result.type === "micro_workflow") {
    return result.relatedWorkflows.length
      ? `Used in ${result.relatedWorkflows.slice(0, 3).map((workflow) => workflow.label).join(", ")}`
      : result.description;
  }
  if (result.type === "product") return visibleGraphContext(result);

  return result.graphContext;
}

function visibleGraphContext(result: SearchResult) {
  if (result.type === "product" && result.graphContext === "Product node ready for workflow and creator connections") return "";
  return result.graphContext;
}

function RelationshipBucket({ title, items }: { title: string; items: SearchRelatedNode[] }) {
  return (
    <div className="searchRelationshipBucket">
      <strong>{title}</strong>
      {items.length ? items.slice(0, 5).map((item) => <Link href={item.href} key={`${item.type}-${item.href}`}>{item.label}</Link>) : <span>None mapped yet</span>}
    </div>
  );
}

function validType(type?: string): "all" | PublicSearchResultType {
  if (type === "product" || type === "creator" || type === "workflow" || type === "micro_workflow") return type;
  return "all";
}

function typeLabel(type: SearchResultType) {
  if (type === "product") return "Product";
  if (type === "creator") return "Creator";
  if (type === "workflow") return "Workflow";
  if (type === "micro_workflow") return "Micro Workflow";
  if (type === "topic") return "Topic";
  return "Category";
}

function groupLabel(type: PublicSearchResultType) {
  if (type === "product") return "Products";
  if (type === "creator") return "Creators";
  if (type === "workflow") return "Workflows";
  return "Micro Workflows";
}

function searchEventScript() {
  return `
    ${betaEventBootstrapScript()}
    document.addEventListener("submit", function(event) {
      var form = event.target;
      if (!form || form.getAttribute("data-beta-search-form") !== "true") return;
      var input = form.querySelector('input[name="q"]');
      window.__appscreenerTrackBetaEvent && window.__appscreenerTrackBetaEvent("search_performed", {
        query: input ? input.value : ""
      });
    });
    document.addEventListener("click", function(event) {
      var target = event.target && event.target.closest ? event.target.closest("[data-beta-search-result]") : null;
      if (!target) return;
      var cards = Array.prototype.slice.call(document.querySelectorAll("[data-beta-search-result]"));
      var search = new URLSearchParams(window.location.search);
      window.__appscreenerTrackBetaEvent && window.__appscreenerTrackBetaEvent("search_result_clicked", {
        query: search.get("q") || "",
        resultType: target.getAttribute("data-result-type") || "",
        resultId: target.getAttribute("data-result-id") || "",
        resultHref: target.getAttribute("data-result-href") || "",
        resultRank: cards.indexOf(target) + 1
      });
    });
  `;
}
