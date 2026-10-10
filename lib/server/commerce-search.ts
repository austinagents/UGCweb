import "server-only";

import type { CommerceSearchResponse, CommerceSearchResult, CommerceSearchResultType } from "@/lib/commerce-search";
import { getSearchDatabase } from "@/lib/server/cloudflare-d1";

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
let metadataPromise: Promise<Record<string, string>> | null = null;

export async function commerceSearchPreview(): Promise<CommerceSearchResponse> {
  const db = getSearchDatabase();
  const [previewRows, metadata] = await Promise.all([
    previewEntities(db, `
      SELECT ${entityColumns}
      FROM search_entities
      WHERE rowid IN (
        SELECT rowid FROM (SELECT rowid FROM search_entities WHERE entity_type = 'shop' AND followers IS NOT NULL ORDER BY followers DESC, name, entity_id LIMIT 5)
        UNION ALL
        SELECT rowid FROM (SELECT rowid FROM search_entities WHERE entity_type = 'creator' AND followers IS NOT NULL ORDER BY followers DESC, name, entity_id LIMIT 5)
      )
      ORDER BY CASE entity_type WHEN 'shop' THEN 0 ELSE 1 END, followers DESC, name, entity_id
    `),
    getMetadata(db),
  ]);
  const shops = previewRows.filter((row) => row.entity_type === "shop");
  const creators = previewRows.filter((row) => row.entity_type === "creator");
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

export async function searchCommerce(input: {
  query: string;
  type: CommerceSearchResultType | "all";
  page: number;
  pageSize: number;
  commandMode?: boolean;
}): Promise<CommerceSearchResponse> {
  const query = input.query.trim();
  const normalizedQuery = normalize(query);
  const pageSize = Math.min(50, Math.max(1, Math.floor(input.pageSize) || 20));
  const requestedPage = Math.max(1, Math.floor(input.page) || 1);
  const db = getSearchDatabase();
  const pendingMetadata = getMetadata(db);
  if (normalizedQuery.length < 2) {
    const metadata = await pendingMetadata;
    return emptySearchResponse(query, pageSize, metadata);
  }

  const [rows, metadata] = await Promise.all([candidateRows(db, normalizedQuery, input.type), pendingMetadata]);
  const empty = emptySearchResponse(query, pageSize, metadata);
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

function emptySearchResponse(query: string, pageSize: number, metadata: Record<string, string>) {
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
  return empty;
}

async function candidateRows(db: D1Database, query: string, type: CommerceSearchResultType | "all") {
  const tokens = query.split(" ").filter(Boolean);
  const ftsQuery = tokens.map((token) => `"${token.replaceAll('"', '""')}"*`).join(" AND ");
  const typeClause = type === "all" ? "" : "AND entity_type = ?";
  const parameters = type === "all" ? [ftsQuery, `%${query}%`] : [ftsQuery, `%${query}%`, type];
  const statement = db.prepare(`
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
  `).bind(...parameters);
  return (await statement.all<SearchEntityRow>()).results;
}

const entityColumns = `
  entity_type, entity_id, name, secondary, normalized_name, normalized_secondary,
  normalized_id, aliases, normalized_aliases, descendants, normalized_descendants,
  category, category_kind, followers, image_url, destination_url
`;

async function previewEntities(db: D1Database, sql: string) {
  return (await db.prepare(sql).all<SearchEntityRow>()).results;
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

async function getMetadata(db: D1Database) {
  if (!metadataPromise) {
    metadataPromise = db.prepare("SELECT key, value FROM search_metadata").all<{ key: string; value: string }>()
      .then(({ results }) => Object.fromEntries(results.map((row) => [row.key, row.value])))
      .catch((error) => {
        metadataPromise = null;
        throw error;
      });
  }
  return metadataPromise;
}

function normalize(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}
