"use client";

import { BadgeDollarSign, Battery, Megaphone, PackagePlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { BoostTier } from "@/lib/types";

const adViewPackages = [
  { value: "10000", label: "10,000 views ($99)" },
  { value: "25000", label: "25,000 views ($199)" },
  { value: "50000", label: "50,000 views ($349)" },
  { value: "100000", label: "100,000 views ($599)" }
];

const boostTierDisplay: Record<string, { duration: string; price: string }> = {
  "10x": { duration: "12h", price: "$49" },
  "30x": { duration: "12h", price: "$99" },
  "50x": { duration: "12h", price: "$149" },
  "100x": { duration: "24h", price: "$299" },
  "500x": { duration: "24h", price: "$999" }
};

export function BoostPanel({ tiers }: { tiers: BoostTier[] }) {
  const [selectedAdPackage, setSelectedAdPackage] = useState("");
  const [adPackageOpen, setAdPackageOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string>("");
  const [boostModalOpen, setBoostModalOpen] = useState(false);
  const adPackageRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const selectedAdPackageLabel = adViewPackages.find((adPackage) => adPackage.value === selectedAdPackage)?.label ?? "Select package";

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!adPackageRef.current?.contains(event.target as Node)) {
        setAdPackageOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    if (!boostModalOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setBoostModalOpen(false);
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [boostModalOpen]);

  return (
    <section className="previewPanel boostPanel">
      <div className="boostZone boostAdsZone">
        <span className="boostKicker"><Megaphone size={14} /> Ads</span>
        <div className="boostZoneHeader">
          <h2>Discovery Spotlight</h2>
        </div>
        <div className="adPackageSelector">
          <div className="adPackageDropdown" ref={adPackageRef}>
            <button
              aria-expanded={adPackageOpen}
              aria-haspopup="listbox"
              className="adPackageTrigger"
              type="button"
              onClick={() => setAdPackageOpen((isOpen) => !isOpen)}
            >
              {selectedAdPackageLabel}
            </button>
            {adPackageOpen ? (
              <div className="adPackageMenu" role="listbox" aria-label="Select ad view package">
                {adViewPackages.map((adPackage) => (
                  <button
                    aria-selected={selectedAdPackage === adPackage.value}
                    key={adPackage.value}
                    role="option"
                    type="button"
                    onClick={() => {
                      setSelectedAdPackage(adPackage.value);
                      setAdPackageOpen(false);
                    }}
                  >
                    {adPackage.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button className="adPackageContinue" disabled={!selectedAdPackage} type="button">
            Continue
          </button>
        </div>
      </div>

      <div className="boostZone boostTiersZone">
        <span className="boostKicker"><Battery size={14} /> Boosts</span>
        <div className="boostZoneHeader">
          <h2>Boost Visibility</h2>
        </div>
        <div className="boostCollapsedAction">
          <button type="button" onClick={() => setBoostModalOpen(true)}>🔋 Boost</button>
        </div>
      </div>

      {boostModalOpen ? (
        <div className="boostPackOverlay" role="presentation" onMouseDown={() => setBoostModalOpen(false)}>
          <div className="boostPackModal" role="dialog" aria-modal="true" aria-labelledby="boost-pack-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="boostPackHeader">
              <h2 id="boost-pack-title">Choose a boost pack:</h2>
              <button className="boostPackClose" type="button" aria-label="Close boost pack chooser" onClick={() => setBoostModalOpen(false)}>×</button>
            </div>
            <div className="boostTierGrid boostPackGrid" role="radiogroup" aria-label="Boost tiers">
              {tiers.map((tier) => {
                const display = boostTierDisplay[tier.label] ?? { duration: tier.duration, price: tier.price };
                return (
                  <button
                    className={selectedTier === tier.id ? "active" : ""}
                    key={tier.id}
                    onClick={() => setSelectedTier((currentTier) => (currentTier === tier.id ? "" : tier.id))}
                    role="radio"
                    aria-checked={selectedTier === tier.id}
                  >
                    <span className="boostTierBattery" aria-hidden="true">🔋</span>
                    <strong>{tier.label}</strong>
                    <span className="boostTierDuration">{display.duration}</span>
                    <span className="boostTierPrice">{display.price}</span>
                  </button>
                );
              })}
            </div>
            {selectedTier ? (
              <div className="boostContinueRow boostPackContinue">
                <button type="button">Continue</button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="boostZone boostMarketplaceZone">
        <div className="boostMarketplaceCard">
          <span className="boostKicker"><PackagePlus size={14} /> Tools</span>
          <h2>List your product</h2>
          <ul>
            <li>Product profile</li>
            <li>Categorization & tagging</li>
            <li>Launch & update</li>
            <li>Performance insights</li>
          </ul>
          <button type="button" onClick={() => router.push("/onboarding/product")}>List your product</button>
        </div>
        <div className="boostMarketplaceCard">
          <span className="boostKicker"><Users size={14} /> Creators</span>
          <h2>Match with tools & brands</h2>
          <ul>
            <li>Brand & tool matches</li>
            <li>Sponsored opportunities</li>
            <li>Revenue & payouts</li>
            <li>Creator insights</li>
          </ul>
          <button type="button" onClick={() => router.push("/onboarding/creator")}>Match with brands</button>
        </div>
      </div>
    </section>
  );
}
