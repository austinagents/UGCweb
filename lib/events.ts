export type BetaEventName =
  | "search_performed"
  | "search_result_clicked"
  | "creator_claim_cta_clicked"
  | "creator_claim_submitted"
  | "product_claim_cta_clicked"
  | "product_claim_submitted";

export type BetaEventPayload = Record<string, string | number | undefined>;

declare global {
  interface Window {
    __appscreenerTrackBetaEvent?: (eventName: BetaEventName, payload?: BetaEventPayload) => void;
  }
}

export function trackBetaEvent(eventName: BetaEventName, payload: BetaEventPayload = {}) {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV === "production") return;
  console.info("[AppScreener beta event]", eventName, payload);
}

export function betaEventBootstrapScript() {
  return `
    window.__appscreenerTrackBetaEvent = window.__appscreenerTrackBetaEvent || function(eventName, payload) {
      if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
        console.info("[AppScreener beta event]", eventName, payload || {});
      }
    };
  `;
}
