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

export type CreatorScreenerResponse = {
  creators: CreatorScreenerRow[];
  categoryCounts: Partial<Record<CommerceCategory, number>>;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  snapshotTimestamp: string;
};
