/**
 * TideMeter — Lightweight analytics tracking script
 * No cookies, privacy-first, ~3KB minified
 */

interface TrackPayload {
  websiteId: string;
  url: string;
  referrer: string;
  title: string;
  screen: string;
  language: string;
  name: string;
  data?: Record<string, string | number | boolean>;
  userId?: string;
}

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

  const websiteId = script.getAttribute("data-website-id");
  const hostUrl =
    script.getAttribute("data-host-url") || script.src.replace(/\/t\.js$/, "");
  const autoTrack = script.getAttribute("data-auto-track") !== "false";
  const respectDnt = script.getAttribute("data-respect-dnt") !== "false";
  const allowedDomains = script
    .getAttribute("data-domains")
    ?.split(",")
    .map((d) => d.trim());

  if (!websiteId) {
    console.warn("[TideMeter] Missing data-website-id attribute");
    return;
  }

  // Respect Do-Not-Track
  if (respectDnt && navigator.doNotTrack === "1") return;

  // Domain check
  if (allowedDomains && allowedDomains.length > 0) {
    if (!allowedDomains.includes(location.hostname)) return;
  }

  // Bot detection
  if ((navigator as any).webdriver) return;

  const endpoint = `${hostUrl}/api/collect`;
  let currentUrl = location.pathname + location.search;
  let currentReferrer = document.referrer;
  let knownUserId: string | undefined;

  function send(payload: TrackPayload): void {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        endpoint,
        new Blob([body], { type: "application/json" }),
      );
    } else {
      fetch(endpoint, {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {});
    }
  }

  function buildPayload(
    name: string,
    data?: Record<string, string | number | boolean>,
  ): TrackPayload {
    return {
      websiteId: websiteId!,
      url: currentUrl,
      referrer: currentReferrer,
      title: document.title,
      screen: `${screen.width}x${screen.height}`,
      language: navigator.language,
      name,
      ...(data && Object.keys(data).length > 0 ? { data } : {}),
      ...(knownUserId ? { userId: knownUserId } : {}),
    };
  }

  function trackPageview(): void {
    send(buildPayload("pageview"));
  }

  function track(
    name?: string,
    data?: Record<string, string | number | boolean>,
  ): void {
    if (!name) {
      trackPageview();
      return;
    }
    send(buildPayload(name, data));
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
    send(buildPayload("identify"));
  }

  // SPA navigation tracking
  function handleNavigation(): void {
    const newUrl = location.pathname + location.search;
    if (newUrl === currentUrl) return;
    currentReferrer = currentUrl;
    currentUrl = newUrl;
    trackPageview();
  }

  if (autoTrack) {
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
