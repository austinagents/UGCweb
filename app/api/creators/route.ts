import { NextRequest, NextResponse } from "next/server";
import creatorData from "@/data/creator-screener.json";
import { commerceCategoryGroups, type CommerceCategory } from "@/lib/commerce-categories";
import type { CreatorScreenerResponse, CreatorScreenerRow } from "@/lib/creator-screener";

const creators = creatorData.creators as CreatorScreenerRow[];
const validCategories = new Set<string>([
  "All",
  ...commerceCategoryGroups.flatMap((group) => [group.name, ...group.children]),
]);

export async function GET(request: NextRequest) {
  const requestedCategory = request.nextUrl.searchParams.get("category") ?? "All";
  const category = validCategories.has(requestedCategory) ? requestedCategory : "All";
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
  const requestedPageSize = Number(request.nextUrl.searchParams.get("pageSize")) || 100;
  const pageSize = Math.min(100, Math.max(1, requestedPageSize));
  const filtered = category === "All"
    ? creators
    : creators.filter((creator) => creator.categoryMemberships.includes(category as CommerceCategory));
  const categoryCounts: Partial<Record<CommerceCategory, number>> = {};

  for (const group of commerceCategoryGroups) {
    categoryCounts[group.name] = creators.filter((creator) => creator.categoryMemberships.includes(group.name)).length;
    for (const child of group.children) {
      categoryCounts[child] = creators.filter((creator) => creator.categoryMemberships.includes(child)).length;
    }
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const response: CreatorScreenerResponse = {
    creators: filtered.slice(start, start + pageSize),
    categoryCounts,
    page: safePage,
    pageSize,
    total: filtered.length,
    totalPages,
    snapshotTimestamp: creatorData.snapshotTimestamp,
  };

  return NextResponse.json(response, {
    headers: { "Cache-Control": "private, max-age=300" },
  });
}
