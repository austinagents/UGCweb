import "server-only";

import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { CommerceSearchResponse, CommerceSearchResult, CommerceSearchResultType } from "@/lib/commerce-search";

type SearchEntityRow = {
  entity_type: CommerceSearchResultType;
  entity_id: string;
  name: string;
  secondary: string;
  normalized_name: string;
  normalized_secondary: string;
  normalized_id: string;
  aliases: string;
  normalized_aliases: string;
  descendants: string;
  normalized_descendants: string;
  category: string | null;
  category_kind: "navigation" | "heatmap" | null;
  followers: number | null;
  image_url: string | null;
  destination_url: string;
};

type RankedEntity = { row: SearchEntityRow; relevance: number };

let database: DatabaseSync | null = null;

export function commerceSearchPreview(): CommerceSearchResponse {
  const db = getDatabase();
  const shops = previewEntities(`
    SELECT ${entityColumns}
    FROM search_entities
    WHERE entity_type = 'shop' AND followers IS NOT NULL
    ORDER BY followers DESC, name, entity_id
    LIMIT 5
  `);
  const creators = previewEntities(`
    SELECT ${entityColumns}
    FROM search_entities
    WHERE entity_type = 'creator' AND followers IS NOT NULL
    ORDER BY followers DESC, name, entity_id
    LIMIT 5
  `);
  const metadata = getMetadata();
  const results = [...shops, ...creators].map((row) => toResult({ row, relevance: 0 }));
  return {
    query: "",
    results,
    page: 1,
    pageSize: 10,
    total: results.length,
    totalPages: 1,
    groupCounts: { shop: shops.length, creator: creators.length, category: 0 },
    indexVersion: metadata.model_version ?? "unknown",
    indexBuiltAt: metadata.built_at ?? "",
  };
}

export function searchCommerce(input: {
  query: string;
  type: CommerceSearchResultType | "all";
  page: number;
  pageSize: number;
  commandMode?: boolean;
}): CommerceSearchResponse {
  const query = input.query.trim();
  const normalizedQuery = normalize(query);
  const pageSize = Math.min(50, Math.max(1, Math.floor(input.pageSize) || 20));
  const requestedPage = Math.max(1, Math.floor(input.page) || 1);
  const metadata = getMetadata();
  const empty = {
    query,
    results: [],
    page: 1,
    pageSize,
    total: 0,
    totalPages: 1,
    groupCounts: { shop: 0, creator: 0, category: 0 },
    indexVersion: metadata.model_version ?? "unknown",
    indexBuiltAt: metadata.built_at ?? "",
  } satisfies CommerceSearchResponse;
  if (normalizedQuery.length < 2) return empty;

  const rows = candidateRows(normalizedQuery, input.type);
  const ranked = rows
    .map((row) => ({ row, relevance: relevanceFor(row, query, normalizedQuery) }))
    .filter((item) => Number.isFinite(item.relevance))
    .sort(compareRanked);
  const groupCounts = ranked.reduce<CommerceSearchResponse["groupCounts"]>((counts, item) => {
    counts[item.row.entity_type] += 1;
    return counts;
  }, { shop: 0, creator: 0, category: 0 });

  if (input.commandMode && input.type === "all") {
    const perGroup = { shop: 0, creator: 0, category: 0 };
    const selected = ranked.filter((item) => {
      const type = item.row.entity_type;
      if (perGroup[type] >= 5) return false;
      perGroup[type] += 1;
      return true;
    }).slice(0, 10);
    return { ...empty, results: selected.map(toResult), total: ranked.length, groupCounts };
  }

  const total = ranked.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const start = (page - 1) * pageSize;
  return {
    ...empty,
    results: ranked.slice(start, start + pageSize).map(toResult),
    page,
    total,
    totalPages,
    groupCounts,
  };
}

function candidateRows(query: string, type: CommerceSearchResultType | "all") {
  const db = getDatabase();
  const tokens = query.split(" ").filter(Boolean);
  const ftsQuery = tokens.map((token) => `"${token.replaceAll('"', '""')}"*`).join(" AND ");
  const typeClause = type === "all" ? "" : "AND entity_type = ?";
  const parameters = type === "all" ? [ftsQuery, `%${query}%`] : [ftsQuery, `%${query}%`, type];
  return db.prepare(`
    SELECT entity_type, entity_id, name, secondary, normalized_name, normalized_secondary,
           normalized_id, aliases, normalized_aliases, descendants, normalized_descendants,
           category, category_kind, followers, image_url, destination_url
    FROM search_entities
    WHERE (
      rowid IN (SELECT rowid FROM search_entities_fts WHERE search_entities_fts MATCH ?)
      OR normalized_name LIKE ?2
      OR normalized_secondary LIKE ?2
      OR normalized_id LIKE ?2
      OR normalized_aliases LIKE ?2
      OR normalized_descendants LIKE ?2
    ) ${typeClause}
  `).all(...parameters) as SearchEntityRow[];
}

const entityColumns = `
  entity_type, entity_id, name, secondary, normalized_name, normalized_secondary,
  normalized_id, aliases, normalized_aliases, descendants, normalized_descendants,
  category, category_kind, followers, image_url, destination_url
`;

function previewEntities(sql: string) {
  return getDatabase().prepare(sql).all() as SearchEntityRow[];
}

function relevanceFor(row: SearchEntityRow, rawQuery: string, query: string) {
  const raw = rawQuery.trim().toLowerCase();
  const rawFields = [row.name, row.secondary, row.entity_id].map((value) => value.trim().toLowerCase()).filter(Boolean);
  const directFields = [row.normalized_name, row.normalized_secondary, row.normalized_id].filter(Boolean);
  const aliases = row.normalized_aliases.split(" ").filter(Boolean);
  const descendants = row.normalized_descendants.split(" ").filter(Boolean);
  const primaryText = directFields.join(" ");
  const primaryTokens = primaryText.split(" ").filter(Boolean);
  const queryTokens = query.split(" ").filter(Boolean);

  if (rawFields.includes(raw)) return 0;
  if (directFields.includes(query)) return 1;
  if (directFields.some((field) => field.startsWith(query))) return 2;
  if (directFields.some((field) => {
    const fieldTokens = field.split(" ").filter(Boolean);
    return queryTokens.every((token, index) => fieldTokens[index]?.startsWith(token));
  })) return 3;
  if (queryTokens.every((token) => primaryTokens.includes(token))) return 4;
  if (row.entity_type === "category" && (aliases.includes(query) || descendants.includes(query) || row.normalized_aliases.includes(query) || row.normalized_descendants.includes(query))) return 5;
  if ([primaryText, row.normalized_aliases, row.normalized_descendants].some((field) => field.includes(query))) return 6;
  return Number.POSITIVE_INFINITY;
}

function compareRanked(left: RankedEntity, right: RankedEntity) {
  return left.relevance - right.relevance
    || (right.row.followers ?? -1) - (left.row.followers ?? -1)
    || left.row.name.localeCompare(right.row.name)
    || left.row.entity_id.localeCompare(right.row.entity_id);
}

function toResult({ row }: RankedEntity): CommerceSearchResult {
  return {
    type: row.entity_type,
    id: row.entity_id,
    name: row.name,
    secondary: row.secondary,
    category: row.category,
    categoryKind: row.category_kind,
    followers: row.followers,
    imageUrl: row.image_url,
    href: row.destination_url,
  };
}

function getDatabase() {
  database ??= new DatabaseSync(path.join(process.cwd(), "data/commerce-search.sqlite"), { readOnly: true });
  return database;
}

function getMetadata() {
  const rows = getDatabase().prepare("SELECT key, value FROM search_metadata").all() as Array<{ key: string; value: string }>;
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

function normalize(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}
