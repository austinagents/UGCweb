"use client";

import Link from "next/link";
import type { MarketplaceListing } from "@/lib/marketplace-data";
import { MarketplaceImage } from "./marketplace-media";

export function MarketplaceCard({ listing }: { listing: MarketplaceListing }) {
  const { product, offer } = listing;
  const variantCount = offer.variants.length;

  return (
    <Link className="marketplaceCard" href={`/marketplace/offers/${product.id}`}>
      <div className="marketplaceCardImageWrap">
        <MarketplaceImage className="marketplaceCardImage" src={product.imageUrl} alt={product.name} />
      </div>

      <div className="marketplaceCardBody">
        <div className="marketplaceCardIdentity">
          <span>{product.brand}</span>
          <h2>{product.name}</h2>
        </div>

        <p className="marketplaceCardEconomics">
          <strong>{offer.commission}</strong> commission
          {offer.shopAds ? <> <i>·</i> <strong>{offer.shopAds}</strong> Shop Ads</> : null}
        </p>

        <p className="marketplaceCardDetails">
          <span>Free sample</span>
          {variantCount > 0 ? <><i>·</i><span>{variantCount} options</span></> : null}
        </p>
      </div>
    </Link>
  );
}
