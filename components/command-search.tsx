"use client";

import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ToolLogo } from "@/components/tool-logo";
import { WorkflowStack } from "@/components/workflow-stack";
import { getTool } from "@/lib/data";
import { trackBetaEvent } from "@/lib/events";
import { type PublicSearchResultType, type SearchResult, searchEcosystem } from "@/lib/search";

type CommandSearchResult = SearchResult & { score?: number };

export function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchState = useMemo(() => searchEcosystem(query), [query]);
  const results = useMemo(() => {
    return searchState.results.slice(0, query.trim() ? 10 : 8);
  }, [query, searchState.results]);
  const grouped = useMemo(() => {
    const groups = results.reduce<Record<PublicSearchResultType, typeof results>>((groups, item) => {
      const type = item.type as PublicSearchResultType;
      groups[type] = [...(groups[type] ?? []), item];
      return groups;
    }, {
      product: [],
      creator: [],
      workflow: [],
      micro_workflow: []
    });

    return searchState.groupOrder
      .map((type) => [type, groups[type]] as const)
      .filter(([, items]) => items.length > 0);
  }, [results, searchState.groupOrder]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
      if (!open) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((current) => Math.min(current + 1, results.length - 1));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((current) => Math.max(current - 1, 0));
      }
      if (event.key === "Enter" && results[active]) {
        trackBetaEvent("search_performed", { query });
        trackBetaEvent("search_result_clicked", {
          query,
          resultType: results[active].type,
          resultId: results[active].id,
          resultHref: results[active].href,
          resultRank: active + 1
        });
        window.location.href = results[active].href;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, open, query, results]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <>
      {open && <button className="commandOverlay" onClick={() => setOpen(false)} type="button" aria-label="Close command search" />}
      <div className={`commandSearchRoot${open ? " open" : ""}`} role={open ? "dialog" : undefined} aria-label={open ? "Command search" : undefined}>
        {open ? (
          <div className="searchBox commandInput">
            <Search size={16} />
            <input ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setActive(0); }} placeholder="Search products, creators, workflows..." />
            <button onClick={() => setOpen(false)} type="button"><X size={16} /></button>
          </div>
        ) : (
          <button className="searchBox commandTrigger" onClick={() => setOpen(true)} type="button">
            <Search size={16} />
            <span>Search products, creators, workflows...</span>
            <kbd>/</kbd>
          </button>
        )}
        {open && (
          <div className="commandPanel">
            <div className="commandResults">
              {results.length ? grouped.map(([type, items]) => (
                <div className="commandGroup" key={type}>
                  <span>{typeLabel(type)}</span>
                  {items.map((item) => {
                    const index = results.findIndex((result) => result.href === item.href && result.type === item.type);
                    return (
                      <a className={index === active ? "active" : ""} href={item.href} key={`${item.type}-${item.href}`} onClick={() => {
                        trackBetaEvent("search_result_clicked", {
                          query,
                          resultType: item.type,
                          resultId: item.id,
                          resultHref: item.href,
                          resultRank: index + 1
                        });
                      }}>
                        <CommandResultTitle item={item} />
                        <CommandResultContext item={item} />
                      </a>
                    );
                  })}
                </div>
              )) : <p className="emptyState">No matching ecosystem nodes found.</p>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function CommandResultTitle({ item }: { item: CommandSearchResult }) {
  if (item.type === "product") {
    const tool = getTool(item.slug);

    if (tool) {
      return (
        <strong className="commandResultTitle">
          <ToolLogo officialSrc={tool.officialLogoUrl} src={tool.logoUrl} faviconSrc={tool.faviconUrl} fallback={tool.iconUrl} alt={tool.name} size={22} />
          {item.name}
        </strong>
      );
    }
  }

  return <strong>{item.name}</strong>;
}

function CommandResultContext({ item }: { item: CommandSearchResult }) {
  if ((item.type === "workflow" || item.type === "micro_workflow") && item.toolSlugs.length) {
    return <WorkflowStack toolSlugs={item.toolSlugs} limit={5} />;
  }

  if (item.type === "product") {
    return <small>{item.description}</small>;
  }

  return <small>{item.graphContext}</small>;
}

function typeLabel(type: PublicSearchResultType) {
  if (type === "product") return "Products";
  if (type === "creator") return "Creators";
  if (type === "workflow") return "Workflows";
  if (type === "micro_workflow") return "Micro Workflows";
  return "Results";
}
