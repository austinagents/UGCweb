"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CommerceSearchResponse, CommerceSearchResult, CommerceSearchResultType } from "@/lib/commerce-search";
import { SearchAvatar, groupLabel, resultContext } from "@/components/command-search";

const filters: Array<{ label: string; value: "all" | CommerceSearchResultType }> = [
  { label: "All", value: "all" }, { label: "Shops", value: "shop" }, { label: "Creators", value: "creator" }, { label: "Categories", value: "category" },
];

export function CommerceSearchPage({ query, type, page }: { query: string; type: "all" | CommerceSearchResultType; page: number }) {
  const [data, setData] = useState<CommerceSearchResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(query.trim().length < 2 ? "idle" : "loading");

  useEffect(() => {
    if (query.trim().length < 2) { setData(null); setStatus("idle"); return; }
    const controller = new AbortController();
    setStatus("loading");
    fetch(`/api/search?${new URLSearchParams({ q: query, type, page: String(page), pageSize: "20" })}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as CommerceSearchResponse & { error?: string };
        if (!response.ok) throw new Error(result.error ?? "Search failed");
        setData(result); setStatus("ready");
      })
      .catch((error) => { if ((error as Error).name !== "AbortError") setStatus("error"); });
    return () => controller.abort();
  }, [page, query, type]);

  return (
    <div className="stack">
      <section className="searchSurface">
        <form className="searchPageForm" action="/search">
          <Search size={18} /><input name="q" defaultValue={query} placeholder="Search shops, creators, categories..." aria-label="Search shops, creators, categories" />
          <input type="hidden" name="type" value={type} /><button type="submit">Search</button>
        </form>
        <nav className="searchFilterRail" aria-label="Search result filters">
          {filters.map((filter) => <Link className={filter.value === type ? "active" : ""} href={searchHref(query, filter.value, 1)} key={filter.value}>{filter.label}</Link>)}
        </nav>
      </section>
      <section className="searchResultsStack" aria-live="polite">
        {status === "idle" ? <SearchMessage title="Search UGCWEB commerce" text="Enter at least two characters to find TikTok shops, creators, and categories." /> : null}
        {status === "loading" ? <SearchMessage title="Searching" text="Checking the commerce index…" /> : null}
        {status === "error" ? <SearchMessage title="Search unavailable" text="The commerce index could not be reached. Please try again." /> : null}
        {status === "ready" && data && !data.results.length ? <SearchMessage title="No results" text="No matching shops, creators, or categories were found." /> : null}
        {status === "ready" && data?.results.length ? (
          <section className="searchResultGroup">
            <div className="panelHeader"><h2>{type === "all" ? "Commerce results" : groupLabel(type)}</h2><p>{data.total.toLocaleString()} {data.total === 1 ? "match" : "matches"}</p></div>
            <div className="searchResultRows">{data.results.map((result) => <FullSearchResult result={result} key={`${result.type}:${result.id}`} />)}</div>
            {data.totalPages > 1 ? <SearchPagination data={data} query={query} type={type} /> : null}
          </section>
        ) : null}
      </section>
    </div>
  );
}

function FullSearchResult({ result }: { result: CommerceSearchResult }) {
  const external = result.type !== "category";
  return (
    <a className="searchResultRow commerceSearchResultRow" href={result.href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
      <div className="searchResultIdentity"><span><SearchAvatar item={result} size={28} /><strong>{result.name}</strong></span><span className={`searchTypeBadge ${result.type}`}>{groupLabel(result.type).slice(0, -1)}</span></div>
      <p>{resultContext(result)}</p><small>{result.type === "shop" ? `Shop ID ${result.id}` : result.type === "creator" ? `Creator ID ${result.id}` : result.secondary}</small>
    </a>
  );
}

function SearchPagination({ data, query, type }: { data: CommerceSearchResponse; query: string; type: "all" | CommerceSearchResultType }) {
  return <nav className="shopPagination commerceSearchPagination" aria-label="Search pages"><Link aria-disabled={data.page === 1} href={searchHref(query, type, Math.max(1, data.page - 1))}>← Previous</Link><strong>Page {data.page} of {data.totalPages}</strong><Link aria-disabled={data.page === data.totalPages} href={searchHref(query, type, Math.min(data.totalPages, data.page + 1))}>Next →</Link></nav>;
}

function SearchMessage({ title, text }: { title: string; text: string }) { return <div className="sidePanel"><div className="panelHeader"><h2>{title}</h2></div><p className="emptyState">{text}</p></div>; }
function searchHref(query: string, type: "all" | CommerceSearchResultType, page: number) { return `/search?${new URLSearchParams({ ...(query ? { q: query } : {}), type, ...(page > 1 ? { page: String(page) } : {}) })}`; }
