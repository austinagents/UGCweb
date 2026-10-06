"use client";

import { useState } from "react";
import { CreatorTable } from "@/components/creator-table";
import { CommerceCategoryMap } from "@/components/heatmap";
import { PromotedMomentumRail } from "@/components/promoted-momentum-rail";
import { ShopTable } from "@/components/shop-table";
import { commerceCategoryGroups, commerceParentCategories, defaultTikTokShopCategoryId, tiktokShopCategories, type CommerceCategory } from "@/lib/commerce-categories";
import type { ShopRankingWindow } from "@/lib/types";

type ScreenerCategory = "All" | CommerceCategory;
type ScreenerMode = "shops" | "creators";

export function HomeTrendingFilter() {
  const [mode, setMode] = useState<ScreenerMode>("shops");
  const [shopCategoryId, setShopCategoryId] = useState<string>(defaultTikTokShopCategoryId);
  const [creatorCategory, setCreatorCategory] = useState<ScreenerCategory>("All");
  const [shopWindow, setShopWindow] = useState<ShopRankingWindow>("7d");
  const creatorCategories: ScreenerCategory[] = [
    "All",
    ...commerceParentCategories,
    ...commerceCategoryGroups.flatMap((group) => [...group.children]),
  ];

  return (
    <>
      <PromotedMomentumRail mode={mode} category={creatorCategory} />

      <nav className="screenTabs" aria-label={`TikTok ${mode === "shops" ? "Shop" : "Creator"} category filters`}>
        {(mode === "shops" ? tiktokShopCategories : creatorCategories.map((name) => ({ id: name, name }))).map((category) => (
          <button
            className={(mode === "shops" ? shopCategoryId === category.id : creatorCategory === category.id) ? "active" : ""}
            onClick={() => mode === "shops" ? setShopCategoryId(category.id) : setCreatorCategory(category.id as ScreenerCategory)}
            type="button"
            key={category.id ?? "all"}
          >
            {category.name}
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
              <button className={mode === "shops" && shopWindow === "1d" ? "active" : ""} type="button" disabled={mode === "creators"} onClick={() => setShopWindow("1d")} title="Yesterday">1D</button>
              <button className={mode === "shops" && shopWindow === "7d" ? "active" : ""} type="button" disabled={mode === "creators"} onClick={() => setShopWindow("7d")}>7D</button>
              <button className={(mode === "shops" && shopWindow === "30d") || mode === "creators" ? "active" : ""} type="button" aria-pressed={mode === "creators" || shopWindow === "30d"} onClick={() => mode === "shops" && setShopWindow("30d")}>30D</button>
            </div>
          </div>
          <div hidden={mode !== "shops"}><ShopTable categoryId={shopCategoryId} window={shopWindow} metric="total_gmv" active={mode === "shops"} /></div>
          <div hidden={mode !== "creators"}><CreatorTable category={creatorCategory} active={mode === "creators"} /></div>
        </div>
        <aside className="homeRail">
          <section className="previewPanel commerceCategoryPanel">
            <div className="panelHeader">
              <div>
                <h2>Category Map</h2>
                <small>TikTok Creator taxonomy</small>
              </div>
            </div>
            <CommerceCategoryMap
              mode={mode}
              activeCategory={mode === "shops" ? shopCategoryId : creatorCategory}
              onSelect={(category) => mode === "shops" ? setShopCategoryId(category as string) : setCreatorCategory(category as ScreenerCategory)}
            />
          </section>
        </aside>
      </section>
    </>
  );
}
