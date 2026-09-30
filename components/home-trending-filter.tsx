"use client";

import { useState } from "react";
import { CreatorTable } from "@/components/creator-table";
import { CommerceCategoryMap } from "@/components/heatmap";
import { PromotedMomentumRail } from "@/components/promoted-momentum-rail";
import { ShopTable } from "@/components/shop-table";
import { commerceParentCategories, type CommerceCategory } from "@/lib/commerce-categories";

type ScreenerCategory = "All" | CommerceCategory;
type ScreenerMode = "shops" | "creators";

export function HomeTrendingFilter() {
  const [mode, setMode] = useState<ScreenerMode>("shops");
  const [shopCategory, setShopCategory] = useState<ScreenerCategory>("All");
  const [creatorCategory, setCreatorCategory] = useState<ScreenerCategory>("All");
  const screenerCategories: ScreenerCategory[] = ["All", ...commerceParentCategories];
  const activeCategory = mode === "shops" ? shopCategory : creatorCategory;
  const setActiveCategory = mode === "shops" ? setShopCategory : setCreatorCategory;

  return (
    <>
      <PromotedMomentumRail mode={mode} category={creatorCategory} />

      <nav className="screenTabs" aria-label={`TikTok ${mode === "shops" ? "Shop" : "Creator"} category filters`}>
        {screenerCategories.map((category) => (
          <button
            className={activeCategory === category ? "active" : ""}
            onClick={() => setActiveCategory(category)}
            type="button"
            key={category}
          >
            {category}
          </button>
        ))}
      </nav>

      <section className="homePrimary">
        <div className="primaryTable">
          <div className="sectionHeader tightHeader commerceScreenerHeader">
            <h1 className="entityModeHeading">
              <span>Trending TikTok</span>
              <span className="entityModeToggle" role="group" aria-label="Trending entity type">
                <button className={mode === "shops" ? "active" : ""} type="button" aria-pressed={mode === "shops"} onClick={() => setMode("shops")}>Shops</button>
                <button className={mode === "creators" ? "active" : ""} type="button" aria-pressed={mode === "creators"} onClick={() => setMode("creators")}>Creators</button>
              </span>
            </h1>
            <div className="timeframeToggle compact commerceTimeframe" aria-label={`${mode === "shops" ? "Shop" : "Creator"} performance timeframe`}>
              <button type="button" disabled title="24-hour data is not available yet">24H</button>
              <button className={mode === "shops" ? "active" : ""} type="button" aria-pressed={mode === "shops"} disabled={mode === "creators"}>7D</button>
              <button className={mode === "creators" ? "active" : ""} type="button" aria-pressed={mode === "creators"} disabled={mode === "shops"} title={mode === "shops" ? "30-day shop data is not available yet" : "Creator GMV reporting timeframe"}>30D</button>
            </div>
          </div>
          <div hidden={mode !== "shops"}><ShopTable category={shopCategory} /></div>
          <div hidden={mode !== "creators"}><CreatorTable category={creatorCategory} /></div>
        </div>
        <aside className="homeRail">
          <section className="previewPanel commerceCategoryPanel">
            <div className="panelHeader">
              <div><h2>Category Map</h2><small>TikTok Shop taxonomy</small></div>
            </div>
            <CommerceCategoryMap mode={mode} activeCategory={activeCategory} onSelect={setActiveCategory} />
          </section>
        </aside>
      </section>
    </>
  );
}
