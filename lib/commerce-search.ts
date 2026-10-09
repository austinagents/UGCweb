export type CommerceSearchResultType = "shop" | "creator" | "category";

export type CommerceSearchResult = {
  type: CommerceSearchResultType;
  id: string;
  name: string;
  secondary: string;
  category: string | null;
  categoryKind: "navigation" | "heatmap" | null;
  followers: number | null;
  imageUrl: string | null;
  href: string;
};

export type CommerceSearchResponse = {
  query: string;
  results: CommerceSearchResult[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  groupCounts: Record<CommerceSearchResultType, number>;
  indexVersion: string;
  indexBuiltAt: string;
};
