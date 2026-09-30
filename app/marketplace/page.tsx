import { MarketplaceBrowser } from "@/components/marketplace-browser";
import { marketplaceListings } from "@/lib/marketplace-data";

export default function MarketplacePage() {
  const activeListings = marketplaceListings.filter((listing) => listing.offer.active);

  return (
    <div className="marketplacePage">
      <header className="marketplacePageHeader">
        <h1>Marketplace</h1>
        <p>Products available to creators through active brand opportunities.</p>
      </header>
      <MarketplaceBrowser listings={activeListings} />
    </div>
  );
}
