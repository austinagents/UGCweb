import { getClassificationProductPage } from "@/lib/server/commerce-read";
import { getPartnerlinksVisibleCategory } from "@/lib/partnerlinks-taxonomy";
import { edgeCachedJson } from "@/lib/server/edge-cache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const ids = params.get("classification_ids")?.split(",").map((id) => id.trim()).filter(Boolean) ?? [];
  const classifications = ids.length ? [...new Set(ids)].map(getPartnerlinksVisibleCategory) : [getPartnerlinksVisibleCategory(params.get("classification_id") ?? "")];
  if (!classifications.length || classifications.length > 32 || classifications.some((classification) => !classification)) return Response.json({ error: "Unknown classification" }, { status: 400 });
  const page = Math.max(1, Number(params.get("page")) || 1);
  return edgeCachedJson(request, { edgeTtlSeconds: 300 }, () => getClassificationProductPage(classifications.map((classification) => classification!.id), page));
}
