export type CommerceIdentityShop = {
  shop_id: string;
  shop_name: string | null;
  followers: number | null;
};

export type CommerceIdentityCreator = {
  creator_oecuid: string;
  handle: string | null;
  nickname: string | null;
  followers: number | null;
};

export function normalizeCommerceIdentity(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function followerDistance(shopFollowers: number | null, creatorFollowers: number | null) {
  if (!shopFollowers || !creatorFollowers) return Number.POSITIVE_INFINITY;
  return Math.abs(Math.log(shopFollowers / creatorFollowers));
}

export function isHighConfidenceShopCreatorMatch(
  shop: Pick<CommerceIdentityShop, "shop_name" | "followers">,
  creator: Pick<CommerceIdentityCreator, "followers">,
  handle: string,
  nickname: string,
) {
  const shopName = normalizeCommerceIdentity(shop.shop_name);
  const directHandleAndNameMatch = shopName === handle && shopName === nickname;
  if (directHandleAndNameMatch) return true;
  const shopFollowers = Number(shop.followers);
  const creatorFollowers = Number(creator.followers);
  if (!(shopFollowers > 0 && creatorFollowers > 0)) return false;
  const ratio = Math.max(shopFollowers, creatorFollowers) / Math.min(shopFollowers, creatorFollowers);
  if ((shopName === handle || shopName === nickname) && ratio <= 1.5) return true;
  return shopName.length >= 6 && ratio <= 1.35 && (handle.includes(shopName) || shopName.includes(handle));
}

export function shopLikeCreatorIds(shops: CommerceIdentityShop[], creators: CommerceIdentityCreator[]) {
  const shopsByName = new Map<string, CommerceIdentityShop[]>();
  for (const shop of shops) {
    const name = normalizeCommerceIdentity(shop.shop_name);
    if (name.length < 4) continue;
    const matches = shopsByName.get(name) ?? [];
    matches.push(shop);
    shopsByName.set(name, matches);
  }

  const excluded = new Set<string>();
  for (const creator of creators) {
    const handle = normalizeCommerceIdentity(creator.handle);
    const nickname = normalizeCommerceIdentity(creator.nickname);
    const candidates = [...(shopsByName.get(handle) ?? []), ...(shopsByName.get(nickname) ?? [])];
    const match = candidates
      .filter((shop) => isHighConfidenceShopCreatorMatch(shop, creator, handle, nickname))
      .sort((left, right) => followerDistance(left.followers, creator.followers) - followerDistance(right.followers, creator.followers))[0];
    if (match) excluded.add(creator.creator_oecuid);
  }
  return excluded;
}
