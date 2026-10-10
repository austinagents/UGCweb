import { NextRequest, NextResponse } from "next/server";
import { commerceSearchPreview, searchCommerce } from "@/lib/server/commerce-search";
import type { CommerceSearchResultType } from "@/lib/commerce-search";
import { edgeCachedJson } from "@/lib/server/edge-cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const type = validType(request.nextUrl.searchParams.get("type"));
  const page = Number.parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10);
  const pageSize = Number.parseInt(request.nextUrl.searchParams.get("pageSize") ?? "20", 10);
  const commandMode = request.nextUrl.searchParams.get("mode") === "command";

  try {
    const preview = request.nextUrl.searchParams.get("preview") === "true";
    return edgeCachedJson(request, { edgeTtlSeconds: preview ? 900 : 60 }, () => preview
      ? commerceSearchPreview()
      : searchCommerce({ query, type, page, pageSize, commandMode }));
  } catch (error) {
    console.error("Commerce search request failed", error);
    return NextResponse.json({ error: "Search is temporarily unavailable." }, { status: 500 });
  }
}

function validType(value: string | null): CommerceSearchResultType | "all" {
  return value === "shop" || value === "creator" || value === "category" ? value : "all";
}
