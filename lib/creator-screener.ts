import type { CommerceCategory } from "@/lib/commerce-categories";

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
  video_gmv: number | null;
  live_gmv: number | null;
  units_sold: number | null;
  units_sold_range: string | null;
  audience_gender: {
    gender: "Female" | "Male";
    percentage: number;
  } | null;
  snapshotTimestamp: string;
};

export type CreatorListRow = Pick<CreatorScreenerRow,
  | "creator_oecuid"
  | "handle"
  | "nickname"
  | "avatar"
  | "followers"
  | "categoryMemberships"
  | "med_gmv_revenue"
  | "med_gmv_revenue_range"
  | "live_gmv"
  | "units_sold"
  | "units_sold_range"
  | "audience_gender"
>;

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
  categoryCounts: Partial<Record<CommerceCategory, number>>;
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
