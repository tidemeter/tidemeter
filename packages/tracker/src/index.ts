/**
 * TideMeter — Lightweight analytics tracking script
 * No cookies, privacy-first, ~3KB minified
 */

import {
  type TrackPayload,
  parseConfig,
  shouldBlock,
  buildPayload,
  sendPayload,
} from "./core";

interface TideMeterAPI {
  track: (
    name?: string,
    data?: Record<string, string | number | boolean>,
  ) => void;
  identify: (userId: string) => void;
}

(function () {
  const script = document.currentScript as HTMLScriptElement | null;
  if (!script) return;

  const parsed = parseConfig(script);
  if (!parsed) return;
  const config = parsed;

  if (shouldBlock(config, navigator, location.hostname)) return;

  const endpoint = `${config.hostUrl}/api/collect`;
  let currentUrl = location.pathname + location.search;
  let currentReferrer = document.referrer;
  let knownUserId: string | undefined;

  function send(payload: TrackPayload): void {
    sendPayload(endpoint, payload);
  }

  function trackPageview(): void {
    send(
      buildPayload(
        config.websiteId,
        currentUrl,
        currentReferrer,
        "pageview",
        undefined,
        knownUserId,
      ),
    );
  }

  function track(
    name?: string,
    data?: Record<string, string | number | boolean>,
  ): void {
    if (!name) {
      trackPageview();
      return;
    }
    send(
      buildPayload(
        config.websiteId,
        currentUrl,
        currentReferrer,
        name,
        data,
        knownUserId,
      ),
    );
  }

  /**
   * Link this anonymous visitor to a known user identity.
   * Call this when the user logs in so their anonymous
   * and authenticated activity can be merged.
   */
  function identify(userId: string): void {
    if (!userId) return;
    knownUserId = userId;
    // Send an identify event so the server can link identities
    send(
      buildPayload(
        config.websiteId,
        currentUrl,
        currentReferrer,
        "identify",
        undefined,
        knownUserId,
      ),
    );
  }

  // SPA navigation tracking
  function handleNavigation(): void {
    const newUrl = location.pathname + location.search;
    if (newUrl === currentUrl) return;
    currentReferrer = currentUrl;
    currentUrl = newUrl;
    trackPageview();
  }

  if (config.autoTrack) {
    // Track initial pageview
    trackPageview();

    // Intercept pushState / replaceState for SPA support
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      handleNavigation();
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      handleNavigation();
    };

    window.addEventListener("popstate", handleNavigation);
  }

  // Expose public API
  const api: TideMeterAPI = { track, identify };
  (window as any).tidemeter = api;
})();
