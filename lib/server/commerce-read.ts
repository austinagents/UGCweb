import { shopBrandFamily, shopBrandFamilySqlMap } from "@/lib/shop-brand-family";
import { pickleballEvidenceId } from "@/lib/graph-topic";
import pickleballEvidence from "@/data/graph-topics/pickleball.json";
import "server-only";
import { suppressedCreator } from "@/lib/server/creator-visibility";

import { unstable_cache } from "next/cache";
import creatorIdentityData from "@/data/commerce-shop-creator-identity.json";
import {
  commerceNavigationCategories,
  commerceNavigationCategoryForId,
  tiktokShopCategories,
  type CommerceNavigationCategoryName,
} from "@/lib/commerce-categories";
import type { CreatorListRow, CreatorScreenerResponse, CreatorScreenerRow, CreatorTrendingRow } from "@/lib/creator-screener";
import type { ShopRankingMetric, ShopRankingWindow, TikTokShop, TikTokShopsResponse } from "@/lib/types";
import { getCommerceDatabase, getCreatorDatabase } from "@/lib/server/cloudflare-d1";
import { getPartnerlinksVisibleIdsForSubtree } from "@/lib/partnerlinks-taxonomy";
import { getCreatorMasterPage } from "@/lib/server/creator-master-read";

type ScreenerCategory = "All" | CommerceNavigationCategoryName;
type CreatorRecord = {
  creator_id: string;
  handle: string;
  nickname: string;
  avatar: string | null;
  followers: number | null;
  category_memberships_json: string;
  med_gmv_revenue: number | null;
  med_gmv_revenue_range: string | null;
  units_sold: number | null;
  units_sold_range: string | null;
  audience_gender_json: string | null;
  socials_json: string;
};
const shopCacheSeconds = 60;
const allShopPageSize = 25;
const visibleShopRailSlots = 10;
const visibleCreatorRailSlots = 8;

const shopPageInflight = new Map<string, Promise<TikTokShopsResponse>>();

const shopIdentityModel = {
  creatorAudienceByShopId: new Map(Object.entries(creatorIdentityData.creatorAudienceByShopId)) as Map<string, CreatorScreenerRow["audience_gender"]>,
};
const shopAudienceCategoryBaselines = new Map(Object.entries(creatorIdentityData.shopAudienceCategoryBaselines)) as Map<CommerceNavigationCategoryName, number>;

const cachedShopPage = unstable_cache(
  loadShopPage,
  ["partnerlinks-official-tiktok-shop-rankings-v12-brands"],
  { revalidate: shopCacheSeconds },
);

export async function getShopPage(categoryIds: string[] | null, window: ShopRankingWindow, metric: ShopRankingMetric, page: number, heatmapCategory: string | null = null, resultLabel: string | null = null) {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const key = `${categoryIds?.join(",") ?? "all"}:${heatmapCategory ?? "all"}:${window}:${metric}:${safePage}`;
  const pending = shopPageInflight.get(key);
  if (pending) return pending;

  const request = cachedShopPage(categoryIds, window, metric, safePage, heatmapCategory, resultLabel).finally(() => {
    shopPageInflight.delete(key);
  });
  shopPageInflight.set(key, request);
  return request;
}

export async function getTrendingShops(categoryIds: string[] | null, window: ShopRankingWindow, metric: ShopRankingMetric) {
  const page = await getShopPage(categoryIds, window, metric, 1);
  return { shops: page.shops.slice(0, visibleShopRailSlots) };
}

export async function getCreatorPage(category: ScreenerCategory, page: number, pageSize: number, heatmapCategory: string | null = null, preferMaster = true): Promise<CreatorScreenerResponse> {
  const database = getCommerceDatabase();
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize) || 100));
  const visibleCreator = `cr.creator_id <> '${suppressedCreator.tiktokUid}' AND lower(COALESCE(cr.handle, '')) <> '${suppressedCreator.handle}'`;
  if (preferMaster && category === "All" && !heatmapCategory) {
    const master = await getCreatorMasterPage(page, "", safePageSize, "gmv");
    const accountIds = master.creators.map((creator) => String(creator.accountId));
    const classificationsByAccount = new Map<string, string[]>();
    const sourceCategoriesByCreator = new Map<string, CommerceNavigationCategoryName[]>();
    if (accountIds.length) {
      const memberRows = (await getCreatorDatabase().prepare(`
        SELECT account_id,graph_creator_id,is_canonical
        FROM creator_account_members
        WHERE account_id IN (${accountIds.map(() => "?").join(",")})
      `).bind(...accountIds).all<{account_id:string;graph_creator_id:string;is_canonical:number}>()).results;
      const accountByGraphCreator = new Map(memberRows.map((row) => [row.graph_creator_id, row.account_id]));
      const graphCreatorIds = memberRows.map((row) => row.graph_creator_id);
      const classificationRows = (await database.prepare(`
        SELECT graph_creator_id,visible_classification_id,product_count,video_count
        FROM classification_creators
        WHERE graph_creator_id IN (${graphCreatorIds.map(() => "?").join(",")})
        ORDER BY product_count DESC,video_count DESC,visible_classification_id
      `).bind(...graphCreatorIds).all<{graph_creator_id:string;visible_classification_id:string;product_count:number;video_count:number}>()).results;
      classificationRows.forEach((row) => {
        const accountId = accountByGraphCreator.get(row.graph_creator_id);
        if (!accountId) return;
        const memberships = classificationsByAccount.get(accountId) ?? [];
        if (!memberships.includes(row.visible_classification_id)) memberships.push(row.visible_classification_id);
        classificationsByAccount.set(accountId, memberships);
      });
      const canonicalGraphCreatorIds = memberRows.filter((row) => row.is_canonical).map((row) => row.graph_creator_id);
      const sourceCategoryRows = (await getCreatorDatabase().prepare(`
        SELECT m.graph_creator_id,sc.categories_json
        FROM creator_account_members m JOIN creator_source_categories sc USING(master_row)
        WHERE m.is_canonical=1 AND m.graph_creator_id IN (${canonicalGraphCreatorIds.map(() => "?").join(",")})
      `).bind(...canonicalGraphCreatorIds).all<{graph_creator_id:string;categories_json:string}>()).results;
      const sourceNameToNavigationName = new Map<string, CommerceNavigationCategoryName>(
        tiktokShopCategories.map((entry) => [entry.name, commerceNavigationCategoryForId(entry.id)]),
      );
      sourceCategoryRows.forEach((row) => sourceCategoriesByCreator.set(
        row.graph_creator_id,
        [...new Set((JSON.parse(row.categories_json) as string[]).map((name) => sourceNameToNavigationName.get(name)).filter((name): name is CommerceNavigationCategoryName => Boolean(name)))],
      ));
    }
    return {
      creators: master.creators.map((creator): CreatorListRow => {
        return {
          creator_oecuid: String(creator.accountId),
          handle: String(creator.username ?? ""),
          nickname: String(creator.displayName || creator.username || "Collected creator"),
          avatar: creator.avatarUrl ?? null,
          followers: creator.followerCount === null ? null : Number(creator.followerCount),
          categoryMemberships: sourceCategoriesByCreator.get(String(creator.graphCreatorId)) ?? [],
          classificationMembershipIds: classificationsByAccount.get(String(creator.accountId)) ?? [],
          med_gmv_revenue: creator.gmv30d === null ? null : Number(creator.gmv30d),
          med_gmv_revenue_range: null,
          units_sold: creator.unitsSold30d === null ? null : Number(creator.unitsSold30d),
          units_sold_range: null,
          audience_gender: creator.audienceGender === "Female" || creator.audienceGender === "Male" ? { gender: creator.audienceGender, percentage: Number(creator.audienceGenderPercentage ?? 0) } : null,
          socials: [],
          masterEvidence: {
            canonicalVideoCount: Number(creator.canonicalVideoCount),
            recentSnapshotVideoCount: Number(creator.recentSnapshotVideoCount),
            verifiedProductEvidence: Boolean(creator.verifiedProductEvidence),
            approvedClassificationEvidence: Boolean(creator.approvedClassificationEvidence),
          },
        };
      }),
      categoryCounts: {}, page:master.page, pageSize:master.pageSize, total:master.total,
      totalPages:master.totalPages, snapshotTimestamp:"2026-11-11T04:07:31Z", population:"master" as const,
    };
  }
  const categoryJoin = category === "All" ? "" : "JOIN creator_categories cc ON cc.creator_id = cr.creator_id AND cc.category = ?";
  const heatmapJoin = heatmapCategory ? "JOIN creator_heatmap_affiliations ch ON ch.creator_id = cr.creator_id AND ch.category = ?" : "";
  const parameters = [...(category === "All" ? [] : [category]), ...(heatmapCategory ? [heatmapCategory] : [])];
  const total = Number((await database.prepare(`SELECT count(*) AS count FROM creator_records cr ${categoryJoin} ${heatmapJoin} WHERE ${visibleCreator}`).bind(...parameters).first<{ count: number }>())?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (safePage - 1) * safePageSize;
  const [recordsResult, countResult, metadataResult] = await Promise.all([
    database.prepare(`
      SELECT cr.* FROM creator_records cr ${categoryJoin} ${heatmapJoin}
      WHERE ${visibleCreator}
      ORDER BY cr.source_index, cr.creator_id LIMIT ? OFFSET ?
    `).bind(...parameters, safePageSize, start).all<CreatorRecord>(),
    database.prepare("SELECT category, count(*) AS count FROM creator_categories GROUP BY category").all<{ category: CommerceNavigationCategoryName; count: number }>(),
    database.prepare("SELECT value FROM creator_metadata WHERE key = 'snapshot_timestamp'").first<{ value: string }>(),
  ]);
  const records = recordsResult.results;
  const creatorCategoryCounts = Object.fromEntries(countResult.results.map((row) => [row.category, Number(row.count)]));

  return {
    creators: records.map(toCreatorListRow),
    categoryCounts: creatorCategoryCounts,
    page: safePage,
    pageSize: safePageSize,
    total,
    totalPages,
    snapshotTimestamp: metadataResult?.value ?? "",
    population: "ranked" as const,
  };
}

export async function getTrendingCreators(category: ScreenerCategory) {
  const page = await getCreatorPage(category, 1, visibleCreatorRailSlots, null, false);
  return {
    creators: page.creators.map(toCreatorTrendingRow),
    snapshotTimestamp: page.snapshotTimestamp,
  };
}

export async function getClassificationCreatorPage(classificationId: string | readonly string[], page: number, pageSize: number) {
  const database = getCommerceDatabase();
  const requestedIds = Array.isArray(classificationId) ? classificationId : [classificationId];
  const isPickleball = requestedIds.includes(pickleballEvidenceId);
  const ids = [...new Set(requestedIds.flatMap((id) => getPartnerlinksVisibleIdsForSubtree(id)))];
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize) || 25));
  if (!ids.length && !isPickleball) return { creators: [], categoryCounts: {}, page: 1, pageSize: safePageSize, total: 0, totalPages: 1, snapshotTimestamp: "" };
  const classificationIds = ids.map(sqlCategoryId).join(",");
  const source = isPickleball ? `(SELECT
    json_extract(value, '$.graph_creator_id') graph_creator_id,
    json_extract(value, '$.tiktok_uid') tiktok_uid, json_extract(value, '$.handle') handle,
    json_extract(value, '$.display_name') display_name, json_extract(value, '$.follower_count') follower_count,
    json_extract(value, '$.product_count') product_count, json_extract(value, '$.video_count') video_count,
    json_extract(value, '$.recent_count') snapshot_30d_video_count,
    json_extract(value, '$.latest_observed_timestamp') latest_observed_timestamp
    FROM json_each(?))` : "classification_creators";
  const sourceArgs = isPickleball ? [JSON.stringify(pickleballEvidence.creators)] : [];
  const scopePredicate = isPickleball ? "1=1" : `c.visible_classification_id IN (${classificationIds})`;
  const visiblePredicate = `c.graph_creator_id <> '${suppressedCreator.graphId}'
    AND COALESCE(c.tiktok_uid, '') <> '${suppressedCreator.tiktokUid}'
    AND lower(COALESCE(c.handle, '')) <> '${suppressedCreator.handle}'`;
  const total = Number((await database.prepare(`SELECT count(DISTINCT COALESCE('tiktok:'||NULLIF(tiktok_uid,''),graph_creator_id)) count FROM ${source} c WHERE ${scopePredicate} AND ${visiblePredicate}`).bind(...sourceArgs).first<{count:number}>())?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * safePageSize;
  type Row = CreatorRecord & { evidence_account_key:string; graph_creator_id:string; graph_handle:string|null; graph_display_name:string|null; graph_followers:number|null; product_count:number; video_count:number; recent_count:number; latest_timestamp:string|null; website_creator_id:string|null };
  const result = await database.prepare(`
    SELECT COALESCE('tiktok:'||NULLIF(c.tiktok_uid,''),c.graph_creator_id) evidence_account_key,
      min(c.graph_creator_id) graph_creator_id,max(c.handle) graph_handle,max(c.display_name) graph_display_name,
      max(c.follower_count) graph_followers, sum(c.product_count) product_count, sum(c.video_count) video_count,
      sum(c.snapshot_30d_video_count) recent_count, max(c.latest_observed_timestamp) latest_timestamp,
      cr.creator_id website_creator_id, cr.*
    FROM ${source} c
    LEFT JOIN creator_records cr ON cr.creator_id=c.tiktok_uid AND c.tiktok_uid IS NOT NULL AND c.tiktok_uid<>''
    WHERE ${scopePredicate} AND ${visiblePredicate}
    GROUP BY evidence_account_key
    ORDER BY recent_count DESC,latest_timestamp DESC,video_count DESC,evidence_account_key
    LIMIT ? OFFSET ?
  `).bind(...sourceArgs, safePageSize, offset).all<Row>();
  const graphCreatorIds = result.results.map((row) => String(row.graph_creator_id));
  type MasterMetricRow = { graph_creator_id:string; account_id:string; canonical_graph_creator_id:string; username:string; display_name:string|null; follower_count:number|null; avatar_object_key:string|null; gmv_30d:number|null; units_sold_30d:number|null; audience_gender:string|null; audience_gender_percentage:number|null };
  const masterMetrics = new Map<string, MasterMetricRow>();
  const classificationsByAccount = new Map<string,string[]>();
  const matchedClassificationsByAccount = new Map<string,string[]>();
  if (graphCreatorIds.length) {
    const metricRows = (await getCreatorDatabase().prepare(`
      SELECT m.graph_creator_id,a.account_id,a.canonical_graph_creator_id,a.username,a.display_name,a.follower_count,a.avatar_object_key,
        a.gmv_30d,a.units_sold_30d,a.audience_gender,a.audience_gender_percentage
      FROM creator_account_members m JOIN creator_accounts a USING(account_id)
      WHERE m.graph_creator_id IN (${graphCreatorIds.map(() => "?").join(",")})
    `).bind(...graphCreatorIds).all<MasterMetricRow>()).results;
    metricRows.forEach((row) => masterMetrics.set(row.graph_creator_id, row));
    const accountIds = [...new Set(metricRows.map((row) => row.account_id))];
    const memberRows = accountIds.length ? (await getCreatorDatabase().prepare(`SELECT account_id,graph_creator_id FROM creator_account_members WHERE account_id IN (${accountIds.map(() => "?").join(",")})`).bind(...accountIds).all<{account_id:string;graph_creator_id:string}>()).results : [];
    const accountByGraphCreator = new Map(memberRows.map((row) => [row.graph_creator_id,row.account_id]));
    const memberGraphCreatorIds = memberRows.map((row) => row.graph_creator_id);
    if (memberGraphCreatorIds.length) {
      const classificationRows = (await database.prepare(`SELECT graph_creator_id,visible_classification_id,product_count,video_count FROM classification_creators WHERE graph_creator_id IN (${memberGraphCreatorIds.map(() => "?").join(",")}) ORDER BY product_count DESC,video_count DESC,visible_classification_id`).bind(...memberGraphCreatorIds).all<{graph_creator_id:string;visible_classification_id:string;product_count:number;video_count:number}>()).results;
      const selectedIds = new Set(ids);
      classificationRows.forEach((row) => {
        const accountId = accountByGraphCreator.get(row.graph_creator_id);
        if (!accountId) return;
        const memberships = classificationsByAccount.get(accountId) ?? [];
        if (!memberships.includes(row.visible_classification_id)) memberships.push(row.visible_classification_id);
        classificationsByAccount.set(accountId,memberships);
        if (selectedIds.has(row.visible_classification_id)) {
          const matched = matchedClassificationsByAccount.get(accountId) ?? [];
          if (!matched.includes(row.visible_classification_id)) matched.push(row.visible_classification_id);
          matchedClassificationsByAccount.set(accountId, matched);
        }
      });
    }
  }
  const creators = result.results.map((row) => {
    const matched = Boolean(row.website_creator_id);
    const graphCreatorId = String(row.graph_creator_id);
    const master = masterMetrics.get(graphCreatorId);
    const base = master ? {
      creator_oecuid: master.account_id, handle: master.username || row.graph_handle || "", nickname: master.display_name || master.username || row.graph_display_name || "Verified creator",
      avatar: master.avatar_object_key ? `/api/creator-avatar/${encodeURIComponent(master.canonical_graph_creator_id)}` : null,
      followers: master.follower_count, categoryMemberships: [], classificationMembershipIds:classificationsByAccount.get(master.account_id)??[], med_gmv_revenue: master.gmv_30d, med_gmv_revenue_range: null,
      units_sold: master.units_sold_30d, units_sold_range: null,
      audience_gender: master.audience_gender === "Female" || master.audience_gender === "Male" ? { gender: master.audience_gender, percentage: Number(master.audience_gender_percentage ?? 0) } : null,
      socials: [],
    } satisfies CreatorListRow : matched ? toCreatorListRow(row) : {
      creator_oecuid: graphCreatorId, handle: row.graph_handle ?? "", nickname: row.graph_display_name ?? row.graph_handle ?? "Verified creator",
      avatar: null, followers: row.graph_followers, categoryMemberships: [], med_gmv_revenue: null, med_gmv_revenue_range: null,
      units_sold: null, units_sold_range: null, audience_gender: null, socials: [],
    };
    return { ...base, classificationEvidence: { graphCreatorId, matchedClassificationIds:isPickleball?[pickleballEvidenceId]:master?matchedClassificationsByAccount.get(master.account_id)??[]:[], productCount: Number(row.product_count), videoCount: Number(row.video_count), recentVideoCount: Number(row.recent_count), latestObservedTimestamp: row.latest_timestamp, hasWebsiteMetrics: Boolean(master) || matched } };
  });
  const snapshot = await database.prepare("SELECT value FROM classification_metadata WHERE key='snapshot_30d_end_utc'").first<{value:string}>();
  return { creators, categoryCounts: {}, page: safePage, pageSize: safePageSize, total, totalPages, snapshotTimestamp: snapshot?.value ?? "", population:"classified" as const };
}

export async function getClassificationProductPage(classificationId: string | readonly string[], page: number, pageSize = 25) {
  const database = getCommerceDatabase();
  const requestedIds = Array.isArray(classificationId) ? classificationId : [classificationId];
  const isPickleball = requestedIds.includes(pickleballEvidenceId);
  const ids = [...new Set(requestedIds.flatMap((id) => getPartnerlinksVisibleIdsForSubtree(id)))];
  const safePageSize = Math.min(100, Math.max(1, pageSize));
  if (!ids.length && !isPickleball) return { products: [], page: 1, pageSize: safePageSize, total: 0, totalPages: 1, snapshotTimestamp: "" };
  const scope = isPickleball ? "product_id IN (SELECT value FROM json_each(?))" : `visible_classification_id IN (${ids.map(() => "?").join(",")})`;
  const args = isPickleball ? [JSON.stringify(pickleballEvidence.products)] : ids;
  const total = Number((await database.prepare(`SELECT count(*) count FROM classification_products WHERE ${scope}`).bind(...args).first<{count:number}>())?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize)), safePage = Math.min(Math.max(1,page), totalPages);
  const products = (await database.prepare(`SELECT product_id productId, source_category_id sourceCategoryId, visible_classification_id visibleClassificationId, relationship_count relationshipCount, video_count videoCount, creator_count creatorCount, seller_count sellerCount, latest_observed_timestamp latestObservedTimestamp, snapshot_30d_video_count recentVideoCount, source_kind sourceKind FROM classification_products WHERE ${scope} ORDER BY snapshot_30d_video_count DESC, latest_observed_timestamp DESC, video_count DESC, product_id LIMIT ? OFFSET ?`).bind(...args,safePageSize,(safePage-1)*safePageSize).all()).results;
  const snapshot = await database.prepare("SELECT value FROM classification_metadata WHERE key='snapshot_30d_end_utc'").first<{value:string}>();
  return { products, page:safePage, pageSize:safePageSize, total, totalPages, snapshotTimestamp:snapshot?.value ?? "" };
}

function shopBrandExclusion(candidateSql: string) {
  return `WITH family_members AS (
    SELECT key shop_id, value family_id FROM json_each(?)
  ), hidden_brand_shops AS (
    SELECT DISTINCT shop_id FROM (${candidateSql}) WHERE brand_position > 1
  )`;
}

function attachShopBrand(shop: TikTokShop): TikTokShop {
  const brand = shopBrandFamily(shop.shop_id);
  return brand ? { ...shop, brand } : shop;
}

export async function getClassificationShopPage(classificationId:string | readonly string[], window:ShopRankingWindow, metric:ShopRankingMetric, page:number, resultLabel:string) {
  const requestedIds=Array.isArray(classificationId)?classificationId:[classificationId];
  const isPickleball = requestedIds.includes(pickleballEvidenceId);
  const database=getCommerceDatabase(), ids=[...new Set(requestedIds.flatMap((id)=>getPartnerlinksVisibleIdsForSubtree(id)))], pageSize=25;
  if(!ids.length && !isPickleball)return {categoryId:requestedIds[0]??null,categoryName:resultLabel,categories:[...tiktokShopCategories],window,metric,captureDate:null,total:0,page:1,pageSize,totalPages:1,count:0,shops:[]};
  // These IDs come exclusively from the validated, static taxonomy. Embedding the
  // digit-only values avoids D1's bound-parameter ceiling for large L1 subtrees.
  const classificationIds=ids.map(sqlCategoryId).join(","), estimateColumn=`estimated_${window}_gmv`, sourceCategoryColumn=`source_${window}_category_id`, sourceRankColumn=`source_${window}_rank`;
  const scope = isPickleball ? `SELECT
      json_extract(value, '$.shop_id') shop_id,
      json_extract(value, '$.recent_count') recent_activity,
      json_extract(value, '$.product_count') matched_products,
      json_extract(value, '$.video_count') matched_videos
    FROM json_each(?)` : `SELECT shop_id, MAX(snapshot_30d_video_count) recent_activity,
      MAX(product_count) matched_products, MAX(video_count) matched_videos
    FROM classification_shops WHERE visible_classification_id IN (${classificationIds}) GROUP BY shop_id`;
  const args = isPickleball ? [JSON.stringify(pickleballEvidence.shops)] : [];
  const brands = shopBrandExclusion(`SELECT cm.shop_id, ROW_NUMBER() OVER (
      PARTITION BY fm.family_id ORDER BY cm.recent_activity DESC, cm.matched_products DESC, cm.matched_videos DESC, cm.shop_id
    ) brand_position FROM (${scope}) cm JOIN family_members fm ON fm.shop_id=cm.shop_id
    JOIN shop_estimates se ON se.shop_id=cm.shop_id`);
  const brandArgs = [shopBrandFamilySqlMap, ...args];
  const total=Number((await database.prepare(`${brands} SELECT count(*) count FROM (${scope}) cm JOIN shop_estimates se ON se.shop_id=cm.shop_id WHERE cm.shop_id NOT IN (SELECT shop_id FROM hidden_brand_shops)`).bind(...brandArgs,...args).first<{count:number}>())?.count??0);
  const totalPages=Math.max(1,Math.ceil(total/pageSize)),safePage=Math.min(Math.max(1,page),totalPages);
  const rows=(await database.prepare(`${brands} SELECT se.shop_id,se.${estimateColumn} estimated_gmv,se.${sourceCategoryColumn} category_id,se.${sourceRankColumn} official_rank,s.shop_name,s.shop_logo_url,s.storefront_url,s.shop_sold_count,s.weighted_median_price,s.followers,s.estimated_30d_gmv,ro.category_name,ro.capture_date,ro.${metric}_previous_rank official_previous_rank,ro.${metric}_rank_change official_rank_change FROM shop_estimates se JOIN shops s ON s.shop_id=se.shop_id JOIN (${scope}) cm ON cm.shop_id=se.shop_id LEFT JOIN ranking_observations ro ON ro.shop_id=se.shop_id AND ro.window=? AND ro.category_id=se.${sourceCategoryColumn} WHERE se.shop_id NOT IN (SELECT shop_id FROM hidden_brand_shops) ORDER BY cm.recent_activity DESC, cm.matched_products DESC, cm.matched_videos DESC, se.shop_id LIMIT ? OFFSET ?`).bind(...brandArgs,...args,window,pageSize,(safePage-1)*pageSize).all<Record<string,string|number|null>>()).results;
  const classifiedShops=await attachVerifiedShopClassifications(rows.map((row,index)=>toShopRow(row,index+(safePage-1)*pageSize,window,metric)),ids);
  const shops=(isPickleball?classifiedShops.map((shop)=>({...shop,matched_classification_ids:[pickleballEvidenceId]})):classifiedShops).map(attachShopBrand);
  return {categoryId:requestedIds[0]??null,categoryName:resultLabel,categories:[...tiktokShopCategories],window,metric,captureDate:shops[0]?.capture_date??null,total,page:safePage,pageSize,totalPages,count:shops.length,shops};
}

export async function getCategoryAvailability(mode: "shops" | "creators") {
  if (mode === "shops") {
    return tiktokShopCategories.map((category) => ({ category: category.name, available: true }));
  }

  const countRows = (await getCommerceDatabase().prepare("SELECT category, count(*) AS count FROM creator_categories GROUP BY category").all<{ category: CommerceNavigationCategoryName; count: number }>()).results;
  const counts = new Map(countRows.map((row) => [row.category, Number(row.count)]));
  return commerceNavigationCategories.map(({ name }) => ({
    category: name,
    available: (counts.get(name) ?? 0) > 0,
    count: counts.get(name) ?? null,
  }));
}

async function loadShopPage(categoryIds: string[] | null, window: ShopRankingWindow, metric: ShopRankingMetric, page: number, heatmapCategory: string | null = null, resultLabel: string | null = null): Promise<TikTokShopsResponse> {
  const database = getCommerceDatabase();
  const rankColumn = `${metric}_rank`;
  const previousRankColumn = `${metric}_previous_rank`;
  const rankChangeColumn = `${metric}_rank_change`;
  const estimateColumn = `estimated_${window}_gmv`;
  const sourceCategoryColumn = `source_${window}_category_id`;
  const sourceRankColumn = `source_${window}_rank`;
  const categoryFilter = categoryIds ? `AND category_id IN (${categoryIds.map(sqlCategoryId).join(", ")})` : "";
  const parameters = [window];
  const heatmapJoin = heatmapCategory ? "JOIN heatmap_shop_affiliations h ON h.shop_id = se.shop_id AND h.category = ?" : "";
  const heatmapCountJoin = heatmapCategory ? "JOIN heatmap_shop_affiliations h ON h.shop_id = shop_estimates.shop_id AND h.category = ?" : "";
  const rankCategoryOrder = tiktokShopCategories.map(({ id }, index) => `WHEN '${id}' THEN ${index}`).join(" ");
  const officialOrder = `CASE ro.category_id ${rankCategoryOrder} ELSE ${tiktokShopCategories.length} END, ro.source_page, ro.source_row_index, ro.shop_id`;
  const officialFilter = `ro.window = ? AND ro.${rankColumn} IS NOT NULL ${categoryFilter.replaceAll("category_id", "ro.category_id")}`;
  const multiCategory = (categoryIds?.length ?? 0) > 1;
  const officialRankings = multiCategory
    ? `(SELECT ro.*, ROW_NUMBER() OVER (PARTITION BY ro.shop_id ORDER BY ${officialOrder}) AS storefront_row
        FROM ranking_observations ro WHERE ${officialFilter})`
    : "ranking_observations";
  const officialResultFilter = multiCategory ? "ro.storefront_row = 1" : officialFilter;
  const brands = shopBrandExclusion(categoryIds
    ? `SELECT shop_id, ROW_NUMBER() OVER (PARTITION BY family_id ORDER BY category_order, source_page, source_row_index, shop_id) brand_position
       FROM (
         SELECT ro.*, fm.family_id, CASE ro.category_id ${rankCategoryOrder} ELSE ${tiktokShopCategories.length} END category_order,
           ROW_NUMBER() OVER (PARTITION BY ro.shop_id ORDER BY ${officialOrder}) storefront_position
         FROM family_members fm CROSS JOIN ranking_observations ro WHERE ro.shop_id=fm.shop_id AND ${officialFilter}
       ) WHERE storefront_position=1`
    : `SELECT se.shop_id, ROW_NUMBER() OVER (PARTITION BY fm.family_id ORDER BY se.${estimateColumn} DESC, se.shop_id) brand_position
       FROM shop_estimates se JOIN family_members fm ON fm.shop_id=se.shop_id ${heatmapJoin}`);
  const brandArgs = [shopBrandFamilySqlMap, ...(categoryIds ? parameters : heatmapCategory ? [heatmapCategory] : [])];
  const retainedShop = "NOT IN (SELECT shop_id FROM hidden_brand_shops)";
  const total = heatmapCategory
    ? Number((await database.prepare(`${brands} SELECT count(*) AS count FROM shop_estimates ${heatmapCountJoin} WHERE shop_estimates.shop_id ${retainedShop}`).bind(...brandArgs, heatmapCategory).first<{ count: number }>())?.count ?? 0)
    : categoryIds
    ? Number((await database.prepare(`${brands} SELECT count(DISTINCT ro.shop_id) AS count FROM ranking_observations ro WHERE ${officialFilter} AND ro.shop_id ${retainedShop}`).bind(...brandArgs,...parameters).first<{ count: number }>())?.count ?? 0)
    : Number((await database.prepare(`${brands} SELECT count(*) AS count FROM shop_estimates WHERE shop_id ${retainedShop}`).bind(...brandArgs).first<{ count: number }>())?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / allShopPageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * allShopPageSize;
  const rows = categoryIds
    ? (await database.prepare(`${brands}
        SELECT ro.*, ro.${rankColumn} AS official_rank, ro.${previousRankColumn} AS official_previous_rank,
          ro.${rankChangeColumn} AS official_rank_change, oe.estimated_gmv,
          s.shop_name, s.shop_logo_url, s.storefront_url, s.shop_sold_count,
          s.weighted_median_price, s.followers, s.estimated_30d_gmv
        FROM ${officialRankings} ro
        JOIN shops s ON s.shop_id = ro.shop_id
        LEFT JOIN observation_estimates oe ON oe.shop_id = ro.shop_id AND oe.category_id = ro.category_id AND oe.window = ro.window
        WHERE ${officialResultFilter} AND ro.shop_id ${retainedShop}
        ORDER BY ${officialOrder}
        LIMIT ? OFFSET ?
      `).bind(...brandArgs,...parameters, allShopPageSize, offset).all<Record<string, string | number | null>>()).results
    : (await database.prepare(`${brands}
        SELECT se.shop_id, se.${estimateColumn} AS estimated_gmv, se.${sourceCategoryColumn} AS category_id,
          se.${sourceRankColumn} AS official_rank, s.shop_name, s.shop_logo_url, s.storefront_url,
          s.shop_sold_count, s.weighted_median_price, s.followers, s.estimated_30d_gmv,
          ro.category_name, ro.capture_date, ro.${previousRankColumn} AS official_previous_rank,
          ro.${rankChangeColumn} AS official_rank_change
        FROM shop_estimates se
        JOIN shops s ON s.shop_id = se.shop_id
        LEFT JOIN ranking_observations ro ON ro.shop_id = se.shop_id AND ro.window = ? AND ro.category_id = se.${sourceCategoryColumn}
        ${heatmapJoin}
        WHERE se.shop_id ${retainedShop}
        ORDER BY se.${estimateColumn} DESC, se.shop_id
        LIMIT ? OFFSET ?
      `).bind(...brandArgs,window, ...(heatmapCategory ? [heatmapCategory] : []), allShopPageSize, offset).all<Record<string, string | number | null>>()).results;
  const category = categoryIds ? commerceNavigationCategories.find((item) => item.categoryIds.length === categoryIds.length && item.categoryIds.every((id) => categoryIds.includes(id))) : null;
  const unclassifiedShops: TikTokShop[] = rows.map((row, index) => {
    const officialCategoryId = row.category_id ? String(row.category_id) : "unknown";
    const officialCategoryName = row.category_name ? String(row.category_name) : tiktokShopCategories.find((item) => item.id === officialCategoryId)?.name ?? "Unranked";
    const navigationCategoryName = commerceNavigationCategoryForId(officialCategoryId);
    const estimatedGmv = row.estimated_gmv;
    const numericEstimatedGmv = estimatedGmv === null || estimatedGmv === undefined ? null : Number(estimatedGmv);
    const weightedMedianPrice = row.weighted_median_price === null || row.weighted_median_price === undefined ? null : Number(row.weighted_median_price);
    const estimatedUnitsSold = numericEstimatedGmv !== null && numericEstimatedGmv > 0 && weightedMedianPrice !== null && weightedMedianPrice > 0
      ? Math.max(1, Math.round(numericEstimatedGmv / weightedMedianPrice))
      : null;
    const audience = estimateShopAudience(String(row.shop_id), navigationCategoryName);
    return {
      shop_id: String(row.shop_id),
      shop_name: row.shop_name ? String(row.shop_name) : null,
      shop_thumb_image_url: row.shop_logo_url ? String(row.shop_logo_url) : null,
      shop_status: null,
      shop_share_link: row.storefront_url ? String(row.storefront_url) : null,
      tiktok_username: null,
      tiktok_profile_url: null,
      tiktok_profile_source: null,
      tiktok_profile_verified_at: null,
      category_id: officialCategoryId,
      category_name: navigationCategoryName,
      window,
      ranking_metric: metric,
      display_rank: categoryIds ? null : offset + index + 1,
      rank_display_scope: categoryIds ? "official_category" : "ugcweb_estimated",
      current_rank: row.official_rank === null ? null : String(row.official_rank),
      previous_rank: row.official_previous_rank === null || row.official_previous_rank === undefined ? null : String(row.official_previous_rank),
      rank_change: row.official_rank_change === null || row.official_rank_change === undefined ? null : String(row.official_rank_change),
      official_category_id: officialCategoryId,
      official_category_name: officialCategoryName,
      capture_date: row.capture_date ? String(row.capture_date) : "",
      shop_sold_count: row.shop_sold_count === null || row.shop_sold_count === undefined ? null : Number(row.shop_sold_count),
      estimated_units_sold: estimatedUnitsSold,
      units_sold_estimate_source: estimatedUnitsSold === null ? null : "weighted_median_product_price",
      followers: row.followers === null || row.followers === undefined ? null : Number(row.followers),
      audience_gender: audience.audience,
      audience_estimate_source: audience.source,
      estimated_30d_gmv: row.estimated_30d_gmv === null || row.estimated_30d_gmv === undefined ? null : Number(row.estimated_30d_gmv),
      estimated_gmv: numericEstimatedGmv,
      estimate_model_version: "provisional-empirical-velocity-v4",
      estimate_is_provisional: true,
    };
  });

  const shops = (await attachVerifiedShopClassifications(unclassifiedShops)).map(attachShopBrand);
  return {
    categoryId: categoryIds?.join(",") ?? null,
    categoryName: resultLabel ?? category?.name ?? "All Categories",
    categories: [...tiktokShopCategories],
    window,
    metric,
    captureDate: shops[0]?.capture_date ?? null,
    total,
    page: safePage,
    pageSize: allShopPageSize,
    totalPages,
    count: shops.length,
    shops,
  };
}

async function attachVerifiedShopClassifications(shops:TikTokShop[],preferredClassificationIds:readonly string[]=[]):Promise<TikTokShop[]> {
  if (!shops.length) return shops;
  const shopIds=[...new Set(shops.map((shop)=>shop.shop_id))];
  const rows=(await getCommerceDatabase().prepare(`
    SELECT shop_id,visible_classification_id,product_count,video_count,snapshot_30d_video_count
    FROM classification_shops
    WHERE shop_id IN (${shopIds.map(()=>"?").join(",")})
    ORDER BY product_count DESC,video_count DESC,snapshot_30d_video_count DESC,visible_classification_id
  `).bind(...shopIds).all<{shop_id:string;visible_classification_id:string;product_count:number;video_count:number;snapshot_30d_video_count:number}>()).results;
  const preferred=new Set(preferredClassificationIds),memberships=new Map<string,string[]>(),matchedMemberships=new Map<string,string[]>();
  rows.forEach((row)=>{
    const ids=memberships.get(row.shop_id)??[];
    if(!ids.includes(row.visible_classification_id))ids.push(row.visible_classification_id);
    memberships.set(row.shop_id,ids);
    if(preferred.has(row.visible_classification_id)) {
      const matched=matchedMemberships.get(row.shop_id)??[];
      if(!matched.includes(row.visible_classification_id))matched.push(row.visible_classification_id);
      matchedMemberships.set(row.shop_id,matched);
    }
  });
  return shops.map((shop)=>({...shop,classification_ids:memberships.get(shop.shop_id)??[],matched_classification_ids:matchedMemberships.get(shop.shop_id)??[]}));
}

function estimateShopAudience(shopId: string, category: CommerceNavigationCategoryName) {
  const matched = shopIdentityModel.creatorAudienceByShopId.get(shopId);
  if (matched) return { audience: matched, source: "matched_creator" as const };
  const baseline = shopAudienceCategoryBaselines.get(category);
  if (baseline === undefined) return { audience: null, source: null };
  const variation = ((stableHash(shopId) % 1201) / 100) - 6;
  const femaleShare = Math.min(88, Math.max(22, baseline + variation));
  return {
    audience: femaleShare >= 50
      ? { gender: "Female" as const, percentage: femaleShare }
      : { gender: "Male" as const, percentage: 100 - femaleShare },
    source: "category_model" as const,
  };
}

function toShopRow(row: Record<string, string | number | null>, index: number, window: ShopRankingWindow, metric: ShopRankingMetric): TikTokShop {
  const officialCategoryId = row.category_id ? String(row.category_id) : "unknown";
  const navigationCategoryName = commerceNavigationCategoryForId(officialCategoryId);
  const estimatedGmv = row.estimated_gmv == null ? null : Number(row.estimated_gmv);
  const weightedMedianPrice = row.weighted_median_price == null ? null : Number(row.weighted_median_price);
  const estimatedUnitsSold = estimatedGmv && weightedMedianPrice ? Math.max(1, Math.round(estimatedGmv / weightedMedianPrice)) : null;
  const audience = estimateShopAudience(String(row.shop_id), navigationCategoryName);
  return {
    shop_id:String(row.shop_id), shop_name:row.shop_name?String(row.shop_name):null, shop_thumb_image_url:row.shop_logo_url?String(row.shop_logo_url):null,
    shop_status:null, shop_share_link:row.storefront_url?String(row.storefront_url):null, tiktok_username:null, tiktok_profile_url:null,
    tiktok_profile_source:null, tiktok_profile_verified_at:null, category_id:officialCategoryId, category_name:navigationCategoryName,
    window, ranking_metric:metric, display_rank:index+1, rank_display_scope:"graph_activity",
    current_rank:row.official_rank==null?null:String(row.official_rank), previous_rank:row.official_previous_rank==null?null:String(row.official_previous_rank),
    rank_change:row.official_rank_change==null?null:String(row.official_rank_change), official_category_id:officialCategoryId,
    official_category_name:row.category_name?String(row.category_name):tiktokShopCategories.find((item)=>item.id===officialCategoryId)?.name??"Unranked",
    capture_date:row.capture_date?String(row.capture_date):"", shop_sold_count:row.shop_sold_count==null?null:Number(row.shop_sold_count),
    estimated_units_sold:estimatedUnitsSold, units_sold_estimate_source:estimatedUnitsSold===null?null:"weighted_median_product_price",
    followers:row.followers==null?null:Number(row.followers), audience_gender:audience.audience, audience_estimate_source:audience.source,
    estimated_30d_gmv:row.estimated_30d_gmv==null?null:Number(row.estimated_30d_gmv), estimated_gmv:estimatedGmv,
    estimate_model_version:"provisional-empirical-velocity-v4", estimate_is_provisional:true,
  };
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function sqlCategoryId(categoryId: string) {
  if (!/^\d+$/.test(categoryId)) throw new Error(`Invalid source category ID: ${categoryId}`);
  return `'${categoryId}'`;
}

function toCreatorListRow(creator: CreatorRecord): CreatorListRow {
  return {
    creator_oecuid: creator.creator_id,
    handle: creator.handle,
    nickname: creator.nickname,
    avatar: creator.avatar,
    followers: creator.followers,
    categoryMemberships: JSON.parse(creator.category_memberships_json) as CommerceNavigationCategoryName[],
    med_gmv_revenue: creator.med_gmv_revenue,
    med_gmv_revenue_range: creator.med_gmv_revenue_range,
    units_sold: creator.units_sold,
    units_sold_range: creator.units_sold_range,
    audience_gender: creator.audience_gender_json ? JSON.parse(creator.audience_gender_json) : null,
    socials: JSON.parse(creator.socials_json),
  };
}

function toCreatorTrendingRow(creator: CreatorListRow): CreatorTrendingRow {
  return {
    creator_oecuid: creator.creator_oecuid,
    handle: creator.handle,
    nickname: creator.nickname,
    avatar: creator.avatar,
    med_gmv_revenue: creator.med_gmv_revenue,
    med_gmv_revenue_range: creator.med_gmv_revenue_range,
  };
}
