import type { CommerceCategory, TikTokShopCategoryName } from "@/lib/commerce-categories";

export type CreatorSocial = {
  platform: string;
  url: string;
};

export type CreatorScreenerRow = {
  creator_oecuid: string;
  handle: string;
  nickname: string;
  avatar: string | null;
  followers: number | null;
  categoryMemberships: CommerceCategory[];
  sourceQueries: string[];
  med_gmv_revenue: number | null;
  med_gmv_revenue_range: string | null;
  units_sold: number | null;
  units_sold_range: string | null;
  audience_gender: {
    gender: "Female" | "Male";
    percentage: number;
  } | null;
  socials: CreatorSocial[];
  snapshotTimestamp: string;
};

export type CreatorListRow = Omit<Pick<CreatorScreenerRow,
  | "creator_oecuid"
  | "handle"
  | "nickname"
  | "avatar"
  | "followers"
  | "categoryMemberships"
  | "med_gmv_revenue"
  | "med_gmv_revenue_range"
  | "units_sold"
  | "units_sold_range"
  | "audience_gender"
  | "socials"
>, "categoryMemberships"> & { categoryMemberships: TikTokShopCategoryName[] };

export type CreatorTrendingRow = Pick<CreatorListRow,
  | "creator_oecuid"
  | "handle"
  | "nickname"
  | "avatar"
  | "med_gmv_revenue"
  | "med_gmv_revenue_range"
>;

export type CreatorScreenerResponse = {
  creators: CreatorListRow[];
  categoryCounts: Partial<Record<TikTokShopCategoryName, number>>;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  snapshotTimestamp: string;
};

export type CreatorTrendingResponse = {
  creators: CreatorTrendingRow[];
  snapshotTimestamp: string;
};
