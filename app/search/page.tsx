import { CommerceSearchPage } from "@/components/commerce-search-page";
import type { CommerceSearchResultType } from "@/lib/commerce-search";

export default function SearchPage({ searchParams }: { searchParams: { q?: string; type?: string; page?: string } }) {
  const type: "all" | CommerceSearchResultType = searchParams.type === "shop" || searchParams.type === "creator" || searchParams.type === "category" ? searchParams.type : "all";
  return <CommerceSearchPage query={searchParams.q ?? ""} type={type} page={Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1)} />;
}
