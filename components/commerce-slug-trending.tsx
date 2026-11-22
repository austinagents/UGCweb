"use client";
import { useState } from "react";
import { CreatorTable } from "@/components/creator-table";
import { ShopTable } from "@/components/shop-table";
import { ClassificationProductTable } from "@/components/classification-product-table";
import type { ShopRankingWindow } from "@/lib/types";

export function CommerceSlugTrending({ name, classificationIds }: { name: string; classificationIds: readonly string[] }) {
  const [mode, setMode] = useState<"shops" | "products" | "creators">("shops");
  const [window, setWindow] = useState<ShopRankingWindow>("30d");
  return <div className="commerceSlugResults"><div className="sectionHeader tightHeader commerceScreenerHeader"><h2 className="entityModeHeading"><span>{mode === "shops" ? "Top Shops" : mode === "products" ? "Verified Products" : "Verified Creators"}</span><span className="entityModeToggle" role="group" aria-label={`${name} entity type`}><button className={mode === "shops" ? "active" : ""} type="button" onClick={() => setMode("shops")}>Shops</button><button className={mode === "products" ? "active" : ""} type="button" onClick={() => setMode("products")}>Products</button><button className={mode === "creators" ? "active" : ""} type="button" onClick={() => setMode("creators")}>Creators</button></span></h2><div hidden className="timeframeToggle compact commerceTimeframe"><button hidden className={mode === "shops" && window === "1d" ? "active" : ""} type="button" disabled={mode !== "shops"} onClick={() => setWindow("1d")}>1D</button><button hidden className={mode === "shops" && window === "7d" ? "active" : ""} type="button" disabled={mode !== "shops"} onClick={() => setWindow("7d")}>7D</button><button className={mode === "shops" && window === "30d" ? "active" : ""} type="button" disabled={mode !== "shops"} onClick={() => setWindow("30d")}>30D</button></div></div><div hidden={mode !== "shops"}><ShopTable categoryId="all" classificationIds={classificationIds} window={window} metric="total_gmv" active={mode === "shops"} /></div><div hidden={mode !== "products"}><ClassificationProductTable classificationIds={classificationIds} active={mode === "products"}/></div><div hidden={mode !== "creators"}><CreatorTable category="All" classificationIds={classificationIds} active={mode === "creators"} /></div></div>;
}
