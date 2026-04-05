/**
 * TideMeter — Core tracking logic (testable module)
 */

export interface TrackPayload {
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

export interface TrackerConfig {
  websiteId: string;
  hostUrl: string;
  autoTrack: boolean;
  respectDnt: boolean;
  allowedDomains?: string[];
}

export function parseConfig(script: HTMLScriptElement): TrackerConfig | null {
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
    return null;
  }

  return { websiteId, hostUrl, autoTrack, respectDnt, allowedDomains };
}

export function shouldBlock(
  config: TrackerConfig,
  nav: Navigator,
  hostname: string,
): boolean {
  // Respect Do-Not-Track
  if (config.respectDnt && nav.doNotTrack === "1") return true;

  // Domain check
  if (config.allowedDomains && config.allowedDomains.length > 0) {
    if (!config.allowedDomains.includes(hostname)) return true;
  }

  // Bot detection
  if ((nav as any).webdriver) return true;

  return false;
}

export function buildPayload(
  websiteId: string,
  currentUrl: string,
  currentReferrer: string,
  name: string,
  data?: Record<string, string | number | boolean>,
  userId?: string,
): TrackPayload {
  return {
    websiteId,
    url: currentUrl,
    referrer: currentReferrer,
    title: document.title,
    screen: `${screen.width}x${screen.height}`,
    language: navigator.language,
    name,
    ...(data && Object.keys(data).length > 0 ? { data } : {}),
    ...(userId ? { userId } : {}),
  };
}

export function sendPayload(endpoint: string, payload: TrackPayload): void {
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
