"use client";

import { useState } from "react";
import { CommerceCategoryMap } from "@/components/heatmap";
import { ShopTable } from "@/components/shop-table";
import { commerceParentCategories, type CommerceCategory } from "@/lib/commerce-categories";

export function HomeTrendingFilter() {
  const [activeCategory, setActiveCategory] = useState<CommerceCategory>("Sports & Outdoors");

  return (
    <>
      <nav className="screenTabs" aria-label="TikTok Shop category filters">
        {commerceParentCategories.map((category) => (
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
            <div>
              <h1>Top TikTok Shops</h1>
              <p>{activeCategory} · ranked by 7-day GMV</p>
            </div>
          </div>
          <ShopTable category={activeCategory} />
        </div>
        <aside className="homeRail">
          <section className="previewPanel">
            <div className="panelHeader">
              <div><h2>Category Map</h2><small>TikTok Shop taxonomy</small></div>
            </div>
            <CommerceCategoryMap activeCategory={activeCategory} onSelect={setActiveCategory} />
          </section>
        </aside>
      </section>
    </>
  );
}
