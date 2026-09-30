import type { CategoryName, LocalCreatorRecord, LocalProductRecord } from "./types";

export const LOCAL_PRODUCTS_KEY = "appscreener:localProducts";
export const LOCAL_CREATORS_KEY = "appscreener:localCreators";
export const ACTIVE_PRODUCT_SLUG_KEY = "appscreener:activeProductSlug";
export const ACTIVE_CREATOR_SLUG_KEY = "appscreener:activeCreatorSlug";

export function slugifyLocal(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "profile";
}

export function uniqueLocalSlug(base: string, existingSlugs: string[]) {
  const root = slugifyLocal(base);
  const existing = new Set(existingSlugs);
  if (!existing.has(root)) return root;
  let index = 2;
  while (existing.has(`${root}-${index}`)) index += 1;
  return `${root}-${index}`;
}

export function readLocalProducts() {
  return readLocalArray<LocalProductRecord>(LOCAL_PRODUCTS_KEY);
}

export function readLocalCreators() {
  return readLocalArray<LocalCreatorRecord>(LOCAL_CREATORS_KEY);
}

export function saveLocalProduct(record: LocalProductRecord) {
  const next = upsertBySlug(readLocalProducts(), record);
  localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(next));
  localStorage.setItem(ACTIVE_PRODUCT_SLUG_KEY, record.slug);
  window.dispatchEvent(new Event("appscreener:profile-updated"));
}

export function saveLocalCreator(record: LocalCreatorRecord) {
  const next = upsertBySlug(readLocalCreators(), record);
  localStorage.setItem(LOCAL_CREATORS_KEY, JSON.stringify(next));
  localStorage.setItem(ACTIVE_CREATOR_SLUG_KEY, record.slug);
  window.dispatchEvent(new Event("appscreener:profile-updated"));
}

export function latestLocalProduct() {
  const activeSlug = localStorage.getItem(ACTIVE_PRODUCT_SLUG_KEY);
  const records = readLocalProducts();
  return records.find((record) => record.slug === activeSlug) ?? records[records.length - 1] ?? null;
}

export function latestLocalCreator() {
  const activeSlug = localStorage.getItem(ACTIVE_CREATOR_SLUG_KEY);
  const records = readLocalCreators();
  return records.find((record) => record.slug === activeSlug) ?? records[records.length - 1] ?? null;
}

export function buildLocalProductRecord({
  category,
  description,
  existingSlugs,
  logoUrl,
  microWorkflowSlugs,
  name,
  socialUrl,
  tagline,
  website,
  workflowSlugs
}: {
  category: CategoryName;
  description: string;
  existingSlugs: string[];
  logoUrl: string;
  microWorkflowSlugs: string[];
  name: string;
  socialUrl: string;
  tagline: string;
  website: string;
  workflowSlugs: string[];
}) {
  const now = new Date().toISOString();
  const slug = uniqueLocalSlug(name, existingSlugs);
  return {
    id: `local_product_${slug}`,
    slug,
    name,
    logoUrl,
    website,
    socialUrl,
    tagline,
    description,
    category,
    workflowSlugs,
    microWorkflowSlugs,
    createdAt: now,
    updatedAt: now,
    ownershipStatus: "owner_created"
  } satisfies LocalProductRecord;
}

export function buildLocalCreatorRecord({
  avatarUrl,
  bio,
  existingSlugs,
  microWorkflowSlugs,
  name,
  socialUrl,
  toolSlugs,
  website,
  workflowSlugs
}: {
  avatarUrl: string;
  bio: string;
  existingSlugs: string[];
  microWorkflowSlugs: string[];
  name: string;
  socialUrl: string;
  toolSlugs: string[];
  website: string;
  workflowSlugs: string[];
}) {
  const now = new Date().toISOString();
  const slug = uniqueLocalSlug(name, existingSlugs);
  return {
    id: `local_creator_${slug}`,
    slug,
    name,
    avatarUrl,
    socialUrl,
    website,
    bio,
    toolSlugs,
    workflowSlugs,
    microWorkflowSlugs,
    createdAt: now,
    updatedAt: now,
    ownershipStatus: "owner_created"
  } satisfies LocalCreatorRecord;
}

function readLocalArray<T>(key: string) {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

function upsertBySlug<T extends { slug: string }>(records: T[], record: T) {
  const withoutExisting = records.filter((item) => item.slug !== record.slug);
  return [...withoutExisting, record];
}
