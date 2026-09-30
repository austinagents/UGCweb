"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { marketplaceCategories, type MarketplaceListing } from "@/lib/marketplace-data";
import { MarketplaceCard } from "./marketplace-card";

export function MarketplaceBrowser({ listings }: { listings: MarketplaceListing[] }) {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return listings.filter(({ product }) => {
      const inCategory = category === "All" || product.category === category;
      const matchesQuery = !normalized || [product.name, product.brand, product.category, product.description]
        .some((value) => value.toLowerCase().includes(normalized));
      return inCategory && matchesQuery;
    });
  }, [category, listings, query]);

  const hasFilters = category !== "All" || Boolean(query.trim());
  const clearFilters = () => {
    setCategory("All");
    setQuery("");
  };

  return (
    <>
      <nav className="marketplaceCategoryTabs" aria-label="Marketplace categories">
        {marketplaceCategories.map((item) => (
          <button className={category === item ? "active" : ""} type="button" onClick={() => setCategory(item)} key={item}>
            {item}
          </button>
        ))}
      </nav>

      <div className="marketplaceToolbar">
        <label className="marketplaceSearch">
          <Search size={15} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products or brands" />
          {query ? <button type="button" aria-label="Clear search" onClick={() => setQuery("")}><X size={14} /></button> : null}
        </label>
        <div className="marketplaceResultContext">
          <span>{filtered.length} {filtered.length === 1 ? "offer" : "offers"}</span>
          {hasFilters ? <button type="button" onClick={clearFilters}>Clear filters</button> : null}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="marketplaceGrid">
          {filtered.map((listing) => <MarketplaceCard listing={listing} key={listing.product.id} />)}
        </div>
      ) : (
        <section className="marketplaceEmptyState">
          <strong>No marketplace products match these filters.</strong>
          <span>Try another category or search term.</span>
          <button type="button" onClick={clearFilters}>Clear filters</button>
        </section>
      )}
    </>
  );
}
