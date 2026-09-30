"use client";

import { ArrowUpRight, Layers3 } from "lucide-react";
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
        <span className="marketplaceSampleBadge">Free Sample</span>
      </div>

      <div className="marketplaceCardBody">
        <div className="marketplaceCardIdentity">
          <span>{product.brand}</span>
          <h2>{product.name}</h2>
        </div>

        <div className="marketplaceEconomics">
          <div><span>Commission</span><strong>{offer.commission}</strong></div>
          {offer.shopAds ? <div><span>Shop Ads</span><strong>{offer.shopAds}</strong></div> : null}
        </div>

        <div className="marketplaceCardFacts">
          <span>{offer.requirements}</span>
          {variantCount > 0 ? (
            <span><Layers3 size={12} /> {variantCount} options · choose up to {offer.variantSelectionLimit}</span>
          ) : null}
        </div>

        <div className="marketplaceCardFooter">
          <span>{product.category}</span>
          <strong>View Offer <ArrowUpRight size={13} /></strong>
        </div>
      </div>
    </Link>
  );
}
