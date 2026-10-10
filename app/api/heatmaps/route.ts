import { attentionSubCategories } from "@/lib/data";
import { edgeCachedJson } from "@/lib/server/edge-cache";

export function GET(request: Request) {
  return edgeCachedJson(request, { edgeTtlSeconds: 3600 }, async () => ({ data: attentionSubCategories, generatedFrom: "local-attention-pressure-model" }));
}
