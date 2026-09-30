"use client";

import { Check, ExternalLink, PackageCheck, PlaySquare, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cleanMarketplaceDescription, type MarketplaceListing } from "@/lib/marketplace-data";
import { MarketplaceImage, MarketplaceVideo } from "./marketplace-media";

export function MarketplaceOfferExperience({ listing }: { listing: MarketplaceListing }) {
  const { product, offer } = listing;
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);
  const [requestOpen, setRequestOpen] = useState(false);
  const maxSelections = Math.min(offer.variantSelectionLimit, offer.variants.length);

  function toggleVariant(id: string) {
    setSelectedVariantIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (maxSelections === 1) return [id];
      if (current.length >= maxSelections) return current;
      return [...current, id];
    });
  }

  return (
    <div className="marketplaceOfferPage">
      <Link className="marketplaceBackLink" href="/marketplace">← Back to Marketplace</Link>

      <section className="marketplaceOfferHero">
        <div className="marketplaceOfferMedia">
          <MarketplaceImage className="marketplaceOfferImage" src={product.imageUrl} alt={product.name} />
        </div>

        <article className="marketplaceOfferInfo">
          <span className="marketplaceOfferCategory">{product.category}</span>
          <div className="marketplaceOfferTitle">
            <span>{product.brand}</span>
            <h1>{product.name}</h1>
          </div>
          <p className="marketplaceOfferDescription">{cleanMarketplaceDescription(product.description)}</p>

          <div className="marketplaceOfferEconomics">
            <div><span>Commission</span><strong>{offer.commission}</strong></div>
            {offer.shopAds ? <div><span>Shop Ads</span><strong>{offer.shopAds}</strong></div> : null}
            <div><span>Sample</span><strong>{offer.freeSample}</strong></div>
          </div>

          <div className="marketplaceRequirement">
            <Sparkles size={15} />
            <span><small>Creator requirement</small><strong>{offer.requirements}</strong></span>
          </div>

          <div className="marketplaceOfferActions">
            <button className="marketplaceRequestButton" type="button" onClick={() => setRequestOpen(true)}>
              <PackageCheck size={16} /> Request Product
            </button>
            {product.brandWebsite ? (
              <a className="marketplaceBrandLink" href={product.brandWebsite} target="_blank" rel="noreferrer">
                Brand Website <ExternalLink size={14} />
              </a>
            ) : null}
          </div>
        </article>
      </section>

      {offer.variants.length > 0 ? (
        <section className="marketplaceOfferSection">
          <div className="marketplaceOfferSectionHeader">
            <div><span>Options</span><h2>Choose your product</h2></div>
            <strong>{selectedVariantIds.length} / {maxSelections} selected</strong>
          </div>
          <p>Select up to {maxSelections} {maxSelections === 1 ? "option" : "options"}. Selection is for prototype evaluation only.</p>
          <div className="marketplaceVariantGrid">
            {offer.variants.map((variant) => {
              const selected = selectedVariantIds.includes(variant.sourceVariantId);
              const unavailable = !selected && selectedVariantIds.length >= maxSelections;
              return (
                <button
                  className={`marketplaceVariant ${selected ? "selected" : ""}`}
                  type="button"
                  disabled={unavailable}
                  aria-pressed={selected}
                  onClick={() => toggleVariant(variant.sourceVariantId)}
                  key={variant.sourceVariantId}
                >
                  <MarketplaceImage src={variant.imageUrl} alt={variant.name} />
                  <span>{variant.name}</span>
                  {selected ? <i><Check size={12} /></i> : null}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {offer.creatorExamples.length > 0 ? (
        <section className="marketplaceOfferSection">
          <div className="marketplaceOfferSectionHeader">
            <div><span>Creator proof</span><h2>Creator Examples</h2></div>
            <PlaySquare size={18} />
          </div>
          <div className="marketplaceVideoGrid">
            {offer.creatorExamples.map((video) => (
              <MarketplaceVideo src={video.url} title={`${product.name} creator example ${video.slot}`} key={video.slot} />
            ))}
          </div>
        </section>
      ) : null}

      {requestOpen ? (
        <div className="marketplaceModalBackdrop" role="presentation" onMouseDown={() => setRequestOpen(false)}>
          <section className="marketplacePrototypeModal" role="dialog" aria-modal="true" aria-labelledby="marketplace-request-title" onMouseDown={(event) => event.stopPropagation()}>
            <span>Prototype only</span>
            <h2 id="marketplace-request-title">Marketplace request prototype</h2>
            <p>This visual preview does not submit a product request or change the existing marketplace.</p>
            <button type="button" onClick={() => setRequestOpen(false)}>Close</button>
          </section>
        </div>
      ) : null}
    </div>
  );
}
