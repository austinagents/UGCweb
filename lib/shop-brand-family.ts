import source from "../data/shop-brand-families.json";

export type ShopBrandFamily = { id: string; name: string; storefronts: { id: string; name: string }[] };

const byShopId = new Map<string, ShopBrandFamily>();
const ids: Record<string, number> = {};
for (const [index, [name, stores]] of (source as [string, [string, string][]][]).entries()) {
  const family = { id: String(index + 1), name, storefronts: stores.map(([id, name]) => ({ id, name })) };
  for (const [shopId] of stores) {
    byShopId.set(shopId, family);
    ids[shopId] = index + 1;
  }
}

export function shopBrandFamily(shopId: string) {
  return byShopId.get(shopId);
}

export const shopBrandFamilySqlMap = JSON.stringify(ids);
