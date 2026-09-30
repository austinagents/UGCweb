"use client";

import { Box, ChevronRight, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CreatorAvatar } from "@/components/creator-avatar";
import { ToolLogo } from "@/components/tool-logo";
import { tools } from "@/lib/data";
import { displayCategory } from "@/lib/format";
import { latestLocalCreator, latestLocalProduct } from "@/lib/local-graph";
import type { LocalCreatorRecord, LocalProductRecord, Tool } from "@/lib/types";

type WatchlistState = {
  categories: string[];
  creators: string[];
  tools: string[];
  workflows: string[];
};

export default function DashboardPage() {
  const [product, setProduct] = useState<LocalProductRecord | null>(null);
  const [creator, setCreator] = useState<LocalCreatorRecord | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistState>({ categories: [], creators: [], tools: [], workflows: [] });

  useEffect(() => {
    const loadProfileAssets = () => {
      setProduct(latestLocalProduct());
      setCreator(latestLocalCreator());
      setWatchlist(readWatchlistState());
    };

    loadProfileAssets();
    window.addEventListener("storage", loadProfileAssets);
    window.addEventListener("appscreener-watchlist", loadProfileAssets);
    window.addEventListener("appscreener:profile-updated", loadProfileAssets);
    return () => {
      window.removeEventListener("storage", loadProfileAssets);
      window.removeEventListener("appscreener-watchlist", loadProfileAssets);
      window.removeEventListener("appscreener:profile-updated", loadProfileAssets);
    };
  }, []);

  const watchlistItems = useMemo(() => tools.filter((tool) => watchlist.tools.includes(tool.slug)).slice(0, 4), [watchlist.tools]);
  const watchlistCount = watchlist.tools.length + watchlist.workflows.length + watchlist.categories.length + watchlist.creators.length;
  const workflowCount = new Set([...(product?.workflowSlugs ?? []), ...(creator?.workflowSlugs ?? [])]).size;
  const profileName = creator?.name ?? product?.name ?? "AppScreener Profile";
  const profileRole = [product ? "Founder" : null, creator ? "Creator" : null].filter(Boolean).join(" · ") || "Founder · Creator";
  const profileDescription = "Manage products, creator profiles, watchlist, and account settings from one profile.";

  return (
    <div className="profileHub">
      <section className="profileHeroGrid">
        <div className="profileHeroCard">
          <div className="profileIdentity">
            <ProfileAvatar creator={creator} product={product} profileName={profileName} />
            <div>
              <h1>{profileName}</h1>
              <p className="profileRole">{profileRole}</p>
              <p>{profileDescription}</p>
            </div>
          </div>
          <div className="profileStatRow">
            <ProfileStat label="Products" value={product ? "1" : "0"} />
            <ProfileStat label="Creator Profiles" value={creator ? "1" : "0"} />
            <ProfileStat label="Watchlist Items" value={String(watchlistCount)} />
            <ProfileStat label="Workflows" value={String(workflowCount)} />
            <ProfileStat label="Following" value={String(watchlist.creators.length)} />
          </div>
        </div>

        <aside className="profileStartPanel">
          <ProfileAction href="/onboarding/product" title="List Your Product" text="Create a product asset and attach it to this profile." />
          <ProfileAction href="/onboarding/creator" title="Match With Brands" text="Create a creator asset and attach it to this profile." />
        </aside>
      </section>

      <section className="profileContentGrid">
        <main className="profileAssetsPanel">
          <div className="profileSectionHeader">
            <h2>Your Assets</h2>
          </div>
          <div className="profileAssetGrid">
            {product ? <ProductAssetCard product={product} /> : <EmptyAssetCard href="/onboarding/product" title="Product" text="List Your Product" />}
            {creator ? <CreatorAssetCard creator={creator} /> : <EmptyAssetCard href="/onboarding/creator" title="Creator Profile" text="Match With Brands" />}
          </div>
        </main>

        <aside className="profileWatchlistPanel">
          <div className="profileSectionHeader">
            <h2>Watchlist</h2>
            <Link href="/watchlist">View all</Link>
          </div>
          <div className="profileWatchlistRows">
            {watchlistItems.length ? watchlistItems.map((tool) => <WatchlistToolRow key={tool.slug} tool={tool} />) : <p className="profileEmptyText">No watchlist items yet.</p>}
          </div>
          <Link className="profileWatchlistFooter" href="/watchlist">
            Go to Watchlist
            <ChevronRight size={15} />
          </Link>
        </aside>
      </section>

    </div>
  );
}

function ProductAssetCard({ product }: { product: LocalProductRecord }) {
  return (
    <section className="profileAssetCard">
      <div className="profileAssetTop">
        <ToolLogo src={product.logoUrl} fallback={product.logoUrl} alt="" size={42} />
        <span className="profileStatusPill">Live</span>
      </div>
      <h3>{product.name}</h3>
      <p className="profileAssetMeta">{displayCategory(product.category)}</p>
      <p>{product.tagline || product.description || "Product profile attached to this account."}</p>
      <div className="profileAssetMetrics">
        <ProfileMetric label="Workflows" value={String(product.workflowSlugs.length)} />
        <ProfileMetric label="Micro" value={String(product.microWorkflowSlugs.length)} />
        <ProfileMetric label="Category" value={displayCategory(product.category)} />
      </div>
      <div className="profileAssetActions">
        <Link href="/dashboard/product">Open Workspace</Link>
        <Link href={`/tools/${product.slug}`}>View Public Page</Link>
      </div>
    </section>
  );
}

function CreatorAssetCard({ creator }: { creator: LocalCreatorRecord }) {
  return (
    <section className="profileAssetCard">
      <div className="profileAssetTop">
        <CreatorAvatar name={creator.name} src={creator.avatarUrl} size={42} />
        <span className="profileStatusPill">Live</span>
      </div>
      <h3>{creator.name}</h3>
      <p className="profileAssetMeta">Creator Profile</p>
      <p>{creator.bio || "Creator profile attached to this account."}</p>
      <div className="profileAssetMetrics">
        <ProfileMetric label="Tools" value={String(creator.toolSlugs.length)} />
        <ProfileMetric label="Workflows" value={String(creator.workflowSlugs.length)} />
        <ProfileMetric label="Micro" value={String(creator.microWorkflowSlugs.length)} />
      </div>
      <div className="profileAssetActions">
        <Link href="/dashboard/creator">Open Dashboard</Link>
        <Link href={`/creators/${creator.slug}`}>View Public Page</Link>
      </div>
    </section>
  );
}

function EmptyAssetCard({ href, text, title }: { href: string; text: string; title: string }) {
  return (
    <Link className="profileAssetCard profileAssetCardEmpty" href={href}>
      <div className="profileAssetTop">
        <span className="profileIconBox"><Plus size={16} /></span>
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
    </Link>
  );
}

function ProfileAction({ href, text, title }: { href: string; text: string; title: string }) {
  return (
    <Link className="profileActionRow" href={href}>
      <span className="profileIconBox"><Box size={15} /></span>
      <span><strong>{title}</strong><small>{text}</small></span>
      <ChevronRight size={16} />
    </Link>
  );
}

function ProfileAvatar({ creator, product, profileName }: { creator: LocalCreatorRecord | null; product: LocalProductRecord | null; profileName: string }) {
  if (creator) return <CreatorAvatar name={creator.name} src={creator.avatarUrl} size={76} />;
  if (product) return <ToolLogo src={product.logoUrl} fallback={product.logoUrl} alt="" size={76} />;
  return <span className="profileAvatarFallback"><UserRound size={30} /><span>{initialsFor(profileName)}</span></span>;
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return <span><strong>{value}</strong><small>{label}</small></span>;
}

function ProfileMetric({ label, value }: { label: string; value: string }) {
  return <span><strong>{value}</strong><small>{label}</small></span>;
}

function WatchlistToolRow({ tool }: { tool: Tool }) {
  return (
    <Link className="profileWatchlistRow" href={`/tools/${tool.slug}`}>
      <ToolLogo officialSrc={tool.officialLogoUrl} src={tool.logoUrl} faviconSrc={tool.faviconUrl} fallback={tool.iconUrl} alt="" size={30} />
      <span><strong>{tool.name}</strong><small>{displayCategory(tool.category)}</small></span>
    </Link>
  );
}

function readWatchlistState() {
  return {
    categories: readLocalStringArray("appscreener:categories"),
    creators: readLocalStringArray("appscreener:creators"),
    tools: readLocalStringArray("appscreener:tools"),
    workflows: readLocalStringArray("appscreener:workflows")
  };
}

function readLocalStringArray(key: string) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function initialsFor(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "AS";
}
