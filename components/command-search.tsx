"use client";

import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CommerceSearchResponse, CommerceSearchResult, CommerceSearchResultType } from "@/lib/commerce-search";

const groupOrder: CommerceSearchResultType[] = ["shop", "creator", "category"];

export function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CommerceSearchResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const grouped = useMemo(() => groupOrder.map((type) => [type, results.filter((item) => item.type === type)] as const).filter(([, items]) => items.length), [results]);

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) {
      if (!open) return;
      const controller = new AbortController();
      setStatus("loading");
      fetch("/api/search?preview=true", { signal: controller.signal })
        .then(async (response) => {
          const data = await response.json() as CommerceSearchResponse & { error?: string };
          if (!response.ok) throw new Error(data.error ?? "Search failed");
          setResults(data.results);
          setActive(0);
          setStatus("ready");
        })
        .catch((error) => {
          if ((error as Error).name !== "AbortError") {
            setResults([]);
            setStatus("error");
          }
        });
      return () => controller.abort();
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("loading");
      try {
        const response = await fetch(`/api/search?${new URLSearchParams({ q: normalized, mode: "command", pageSize: "10" })}`, { signal: controller.signal });
        const data = await response.json() as CommerceSearchResponse & { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Search failed");
        setResults(data.results);
        setActive(0);
        setStatus("ready");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setResults([]);
          setStatus("error");
        }
      }
    }, 175);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

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
      if (event.key === "Enter" && results[active]) window.location.href = results[active].href;
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, open, results]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
      <div ref={rootRef} className={`commandSearchRoot${open ? " open" : ""}`} role={open ? "dialog" : undefined} aria-label={open ? "Commerce search" : undefined}>
        {open ? (
          <div className="searchBox commandInput">
            <Search size={16} />
            <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search shops, creators, categories..." aria-label="Search shops, creators, categories" />
            <button onClick={() => setOpen(false)} type="button"><X size={16} /></button>
          </div>
        ) : (
          <button className="searchBox commandTrigger" onClick={() => setOpen(true)} type="button">
            <Search size={16} />
            <span>Search shops, creators, categories...</span>
            <kbd>/</kbd>
          </button>
        )}
        {open && (
          <div className="commandPanel">
            <div className="commandResults" aria-live="polite">
              {status === "loading" ? <p className="emptyState">Searching commerce data…</p> : null}
              {status === "error" ? <p className="emptyState">Search is temporarily unavailable.</p> : null}
              {status === "ready" && !results.length ? <p className="emptyState">No matching shops, creators, or categories.</p> : null}
              {status === "ready" ? grouped.map(([type, items]) => (
                <div className="commandGroup" key={type}>
                  <span>{groupLabel(type)}</span>
                  {items.map((item) => {
                    const index = results.findIndex((result) => result.type === item.type && result.id === item.id);
                    return <CommerceSearchLink active={index === active} item={item} key={`${item.type}:${item.id}`} />;
                  })}
                </div>
              )) : null}
            </div>
          </div>
        )}
      </div>
  );
}

function CommerceSearchLink({ item, active }: { item: CommerceSearchResult; active: boolean }) {
  const external = item.type !== "category";
  return (
    <a className={active ? "active" : ""} href={item.href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
      <strong className="commandResultTitle"><SearchAvatar item={item} />{item.name}</strong>
      <small>{resultContext(item)}</small>
    </a>
  );
}

export function SearchAvatar({ item, size = 22 }: { item: CommerceSearchResult; size?: number }) {
  if (item.imageUrl) return <img className="commerceSearchAvatar" src={item.imageUrl} alt="" width={size} height={size} />;
  return <span className={`commerceSearchAvatar commerceSearchAvatarFallback ${item.type}`} style={{ width: size, height: size }}>{item.name.slice(0, 1).toUpperCase()}</span>;
}

export function resultContext(item: CommerceSearchResult) {
  if (item.type === "category") return `${item.categoryKind === "heatmap" ? "Category Map" : "Navigation"} · ${item.category ?? "Commerce"}`;
  const identity = item.type === "creator" && item.secondary ? item.secondary : item.type === "shop" ? "Shop" : "Creator";
  return [identity, item.category, item.followers === null ? null : `${formatCompactNumber(item.followers)} followers`].filter(Boolean).join(" · ");
}

export function groupLabel(type: CommerceSearchResultType) {
  if (type === "shop") return "Shops";
  if (type === "creator") return "Creators";
  return "Categories";
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", { notation: value >= 10_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}
