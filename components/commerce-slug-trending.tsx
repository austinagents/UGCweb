"use client";
import { useState } from "react";
import { CreatorTable } from "@/components/creator-table";
import { ShopTable } from "@/components/shop-table";
import type { ShopRankingWindow } from "@/lib/types";

export function CommerceSlugTrending({ name }: { name: string }) {
  const [mode, setMode] = useState<"shops" | "creators">("shops");
  const [window, setWindow] = useState<ShopRankingWindow>("7d");
  return <div className="commerceSlugResults"><div className="sectionHeader tightHeader commerceScreenerHeader"><h2 className="entityModeHeading"><span>Top {mode === "shops" ? "Shops" : "Creators"}</span><span className="entityModeToggle" role="group" aria-label={`${name} entity type`}><button className={mode === "shops" ? "active" : ""} type="button" onClick={() => setMode("shops")}>Shops</button><button className={mode === "creators" ? "active" : ""} type="button" onClick={() => setMode("creators")}>Creators</button></span></h2><div className="timeframeToggle compact commerceTimeframe"><button className={mode === "shops" && window === "1d" ? "active" : ""} type="button" disabled={mode === "creators"} onClick={() => setWindow("1d")}>1D</button><button className={mode === "shops" && window === "7d" ? "active" : ""} type="button" disabled={mode === "creators"} onClick={() => setWindow("7d")}>7D</button><button className={(mode === "shops" && window === "30d") || mode === "creators" ? "active" : ""} type="button" onClick={() => mode === "shops" && setWindow("30d")}>30D</button></div></div><div hidden={mode !== "shops"}><ShopTable categoryId="all" window={window} metric="total_gmv" active={mode === "shops"} /></div><div hidden={mode !== "creators"}><CreatorTable category="All" active={mode === "creators"} /></div></div>;
}
