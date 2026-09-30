import { notFound } from "next/navigation";
import { MarketplaceOfferExperience } from "@/components/marketplace-offer-experience";
import { marketplaceListing, marketplaceListings } from "@/lib/marketplace-data";

export function generateStaticParams() {
  return marketplaceListings.map((listing) => ({ id: listing.product.id }));
}

export default function MarketplaceOfferPage({ params }: { params: { id: string } }) {
  const listing = marketplaceListing(params.id);
  if (!listing?.offer.active) notFound();
  return <MarketplaceOfferExperience listing={listing} />;
}
