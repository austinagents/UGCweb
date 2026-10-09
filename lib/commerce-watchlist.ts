export const COMMERCE_WATCHLIST_KEY = "ugcweb:commerce-watchlist:v1";
export const COMMERCE_WATCHLIST_EVENT = "ugcweb-commerce-watchlist";

export type CommerceWatchlistKind = "shop" | "creator";

export type CommerceWatchlistItem = {
  kind: CommerceWatchlistKind;
  id: string;
  name: string;
  imageUrl: string | null;
  href: string;
  rank: string;
  category: string;
  gmv: string;
  audience: string;
  unitsSold: string;
  followers: string;
  savedAt: string;
};

export function readCommerceWatchlist(): CommerceWatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(COMMERCE_WATCHLIST_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter(isCommerceWatchlistItem);
  } catch {
    return [];
  }
}

export function toggleCommerceWatchlist(item: CommerceWatchlistItem) {
  const current = readCommerceWatchlist();
  const exists = current.some((saved) => saved.kind === item.kind && saved.id === item.id);
  const next = exists
    ? current.filter((saved) => saved.kind !== item.kind || saved.id !== item.id)
    : [...current, item];
  window.localStorage.setItem(COMMERCE_WATCHLIST_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(COMMERCE_WATCHLIST_EVENT));
  return !exists;
}

function isCommerceWatchlistItem(value: unknown): value is CommerceWatchlistItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CommerceWatchlistItem>;
  return (item.kind === "shop" || item.kind === "creator")
    && typeof item.id === "string"
    && typeof item.name === "string"
    && typeof item.href === "string";
}
