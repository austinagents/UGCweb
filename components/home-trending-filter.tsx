"use client";

import { useState } from "react";
import { CreatorTable } from "@/components/creator-table";
import { CommerceCategoryMap } from "@/components/heatmap";
import { PromotedMomentumRail } from "@/components/promoted-momentum-rail";
import { ShopTable } from "@/components/shop-table";
import { commerceNavigationCategories, type CommerceChildCategory, type CommerceNavigationCategoryName } from "@/lib/commerce-categories";
import { isCommerceHeatmapCategory } from "@/lib/commerce-heatmap-categories";
import { commerceHeatmapClassificationIds } from "@/lib/commerce-classification-map";
import type { ShopRankingWindow } from "@/lib/types";

type ScreenerCategory = "All" | CommerceNavigationCategoryName;
type ScreenerMode = "shops" | "creators";

export function HomeTrendingFilter({ initialMode, initialCategory, initialHeatmapCategory }: { initialMode?: string; initialCategory?: string; initialHeatmapCategory?: string }) {
  const initialNavigationCategory = commerceNavigationCategories.find((category) => category.key === initialCategory);
  const [mode, setMode] = useState<ScreenerMode>(initialMode === "creators" ? "creators" : "shops");
  const [shopCategoryKey, setShopCategoryKey] = useState<string>(initialNavigationCategory?.key ?? "all");
  const [creatorCategory, setCreatorCategory] = useState<ScreenerCategory>(initialNavigationCategory?.name ?? "All");
  const [shopWindow, setShopWindow] = useState<ShopRankingWindow>("30d");
  const [heatmapCategory, setHeatmapCategory] = useState<CommerceChildCategory | null>(isCommerceHeatmapCategory(initialHeatmapCategory ?? null) ? initialHeatmapCategory as CommerceChildCategory : null);
  const shopCategory = commerceNavigationCategories.find((category) => category.key === shopCategoryKey);
  const shopCategoryIds = shopCategory?.categoryIds ?? [];
  const creatorCategoryIds = commerceNavigationCategories.find((category) => category.name === creatorCategory)?.categoryIds ?? [];
  const mapClassificationIds = heatmapCategory ? commerceHeatmapClassificationIds[heatmapCategory] : null;
  const shopClassification = classificationFilter(shopCategoryIds, mapClassificationIds);
  const creatorClassification = classificationFilter(creatorCategoryIds, mapClassificationIds);
  const mapScopeIds = heatmapCategory ? [] : mode === "shops" ? shopCategoryIds : creatorCategoryIds;
  const selectedCategoryName = heatmapCategory ?? (mode === "shops" ? shopCategory?.name : creatorCategory);
  return (
    <>
      <PromotedMomentumRail
        mode={mode}
        category={creatorCategory}
        shopCategoryId={shopCategoryIds.join(",") || "all"}
        heatmapCategory={heatmapCategory}
        {...(mode === "shops" ? shopClassification : creatorClassification)}
      />

      <nav className="screenTabs" aria-label={`TikTok ${mode === "shops" ? "Shop" : "Creator"} category filters`}>
        {([{ key: "all", name: "All", categoryIds: [] }, ...commerceNavigationCategories]).map((category) => (
          <button
            className={!heatmapCategory && (mode === "shops" ? shopCategoryKey === category.key : creatorCategory === category.name) ? "active" : ""}
            onClick={() => { setHeatmapCategory(null); mode === "shops" ? setShopCategoryKey(category.key) : setCreatorCategory(category.name as ScreenerCategory); }}
            type="button"
            key={category.key}
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
            <div hidden className="timeframeToggle compact commerceTimeframe" aria-label={`${mode === "shops" ? "Shop" : "Creator"} performance timeframe`}>
              <button hidden className={mode === "shops" && shopWindow === "1d" ? "active" : ""} type="button" disabled={mode === "creators"} onClick={() => setShopWindow("1d")} title="Yesterday">1D</button>
              <button hidden className={mode === "shops" && shopWindow === "7d" ? "active" : ""} type="button" disabled={mode === "creators"} onClick={() => setShopWindow("7d")}>7D</button>
              <button className={(mode === "shops" && shopWindow === "30d") || mode === "creators" ? "active" : ""} type="button" aria-pressed={mode === "creators" || shopWindow === "30d"} onClick={() => mode === "shops" && setShopWindow("30d")}>30D</button>
            </div>
          </div>
          {mapClassificationIds?.length === 0 ? (
            <p className="creatorTableStatus shopPagination" role="status">No verified graph classification is available for {heatmapCategory}.</p>
          ) : <>
          <div hidden={mode !== "shops"}><ShopTable categoryLabel={heatmapCategory ?? shopCategory?.name} categoryId={shopCategoryIds.join(",") || "all"} {...shopClassification} heatmapCategory={heatmapCategory} window={shopWindow} metric="total_gmv" active={mode === "shops"} /></div>
          <div hidden={mode !== "creators"}><CreatorTable categoryLabel={heatmapCategory ?? (creatorCategory === "All" ? undefined : creatorCategory)} category={creatorCategory} {...creatorClassification} heatmapCategory={heatmapCategory} active={mode === "creators"} /></div>
          </>}
        </div>
        <aside className="homeRail">
          <section className="previewPanel commerceCategoryPanel">
            <div className="panelHeader">
              <div>
                <h2>Category Map</h2>
                <small>{selectedCategoryName && selectedCategoryName !== "All" ? selectedCategoryName : `TikTok ${mode === "shops" ? "Shop" : "Creator"} taxonomy`}</small>
              </div>
            </div>
            <CommerceCategoryMap
              mode={mode}
              activeCategory={heatmapCategory}
              scopeIds={mapScopeIds}
              onSelect={setHeatmapCategory}
            />
          </section>
        </aside>
      </section>
    </>
  );
}


function classificationFilter(categoryIds: readonly string[], mapIds: readonly string[] | null) {
  if (mapIds) return { classificationId: null, classificationIds: mapIds };
  return categoryIds.length === 1
    ? { classificationId: categoryIds[0], classificationIds: [] }
    : { classificationId: null, classificationIds: categoryIds };
}
