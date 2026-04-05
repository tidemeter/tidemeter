import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  parseConfig,
  shouldBlock,
  buildPayload,
  sendPayload,
  type TrackerConfig,
} from "../core";

function createScript(attrs: Record<string, string> = {}): HTMLScriptElement {
  const script = document.createElement("script");
  script.src = "https://analytics.example.com/t.js";
  for (const [k, v] of Object.entries(attrs)) {
    script.setAttribute(k, v);
  }
  return script;
}

describe("parseConfig", () => {
  it("returns null and warns when data-website-id is missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const script = createScript();
    expect(parseConfig(script)).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      "[TideMeter] Missing data-website-id attribute",
    );
    warn.mockRestore();
  });

  it("parses basic config from script attributes", () => {
    const script = createScript({ "data-website-id": "site-123" });
    const config = parseConfig(script);
    expect(config).toEqual({
      websiteId: "site-123",
      hostUrl: "https://analytics.example.com",
      autoTrack: true,
      respectDnt: true,
      allowedDomains: undefined,
    });
  });

  it("extracts host URL from data-host-url attribute", () => {
    const script = createScript({
      "data-website-id": "site-123",
      "data-host-url": "https://custom.host.com",
    });
    const config = parseConfig(script)!;
    expect(config.hostUrl).toBe("https://custom.host.com");
  });

  it("falls back to script src for host URL", () => {
    const script = createScript({ "data-website-id": "site-123" });
    script.src = "https://cdn.example.com/t.js";
    const config = parseConfig(script)!;
    expect(config.hostUrl).toBe("https://cdn.example.com");
  });

  it("parses data-auto-track=false", () => {
    const script = createScript({
      "data-website-id": "site-123",
      "data-auto-track": "false",
    });
    const config = parseConfig(script)!;
    expect(config.autoTrack).toBe(false);
  });

  it("parses data-respect-dnt=false", () => {
    const script = createScript({
      "data-website-id": "site-123",
      "data-respect-dnt": "false",
    });
    const config = parseConfig(script)!;
    expect(config.respectDnt).toBe(false);
  });

  it("parses comma-separated domains", () => {
    const script = createScript({
      "data-website-id": "site-123",
      "data-domains": "example.com, app.example.com , test.com",
    });
    const config = parseConfig(script)!;
    expect(config.allowedDomains).toEqual([
      "example.com",
      "app.example.com",
      "test.com",
    ]);
  });
});

describe("shouldBlock", () => {
  const baseConfig: TrackerConfig = {
    websiteId: "site-123",
    hostUrl: "https://analytics.example.com",
    autoTrack: true,
    respectDnt: true,
  };

  function mockNavigator(
    overrides: Partial<Navigator & { webdriver?: boolean }> = {},
  ): Navigator {
    return {
      doNotTrack: null,
      webdriver: false,
      ...overrides,
    } as any;
  }

  it("blocks when DNT is enabled and respected", () => {
    expect(
      shouldBlock(
        baseConfig,
        mockNavigator({ doNotTrack: "1" }),
        "example.com",
      ),
    ).toBe(true);
  });

  it("does not block when DNT is enabled but not respected", () => {
    const config = { ...baseConfig, respectDnt: false };
    expect(
      shouldBlock(config, mockNavigator({ doNotTrack: "1" }), "example.com"),
    ).toBe(false);
  });

  it("does not block when DNT is not set", () => {
    expect(shouldBlock(baseConfig, mockNavigator(), "example.com")).toBe(false);
  });

  it("blocks when hostname is not in allowed domains", () => {
    const config = {
      ...baseConfig,
      allowedDomains: ["allowed.com", "other.com"],
    };
    expect(shouldBlock(config, mockNavigator(), "evil.com")).toBe(true);
  });

  it("does not block when hostname is in allowed domains", () => {
    const config = {
      ...baseConfig,
      allowedDomains: ["allowed.com"],
    };
    expect(shouldBlock(config, mockNavigator(), "allowed.com")).toBe(false);
  });

  it("does not block when allowedDomains is empty", () => {
    const config = {
      ...baseConfig,
      allowedDomains: [],
    };
    expect(shouldBlock(config, mockNavigator(), "anything.com")).toBe(false);
  });

  it("blocks when webdriver is detected (bot)", () => {
    expect(
      shouldBlock(
        baseConfig,
        mockNavigator({ webdriver: true } as any),
        "example.com",
      ),
    ).toBe(true);
  });
});

describe("buildPayload", () => {
  beforeEach(() => {
    document.title = "Test Page";
    Object.defineProperty(screen, "width", { value: 1920, configurable: true });
    Object.defineProperty(screen, "height", {
      value: 1080,
      configurable: true,
    });
    Object.defineProperty(navigator, "language", {
      value: "en-US",
      configurable: true,
      writable: true,
    });
  });

  it("builds a basic pageview payload", () => {
    const payload = buildPayload(
      "site-123",
      "/about",
      "https://google.com",
      "pageview",
    );
    expect(payload).toEqual({
      websiteId: "site-123",
      url: "/about",
      referrer: "https://google.com",
      title: "Test Page",
      screen: "1920x1080",
      language: "en-US",
      name: "pageview",
    });
  });

  it("includes custom data when provided", () => {
    const payload = buildPayload("site-123", "/", "", "click", {
      button: "signup",
    });
    expect(payload.data).toEqual({ button: "signup" });
  });

  it("excludes data when empty object", () => {
    const payload = buildPayload("site-123", "/", "", "pageview", {});
    expect(payload).not.toHaveProperty("data");
  });

  it("includes userId when provided", () => {
    const payload = buildPayload(
      "site-123",
      "/",
      "",
      "pageview",
      undefined,
      "user-456",
    );
    expect(payload.userId).toBe("user-456");
  });

  it("excludes userId when not provided", () => {
    const payload = buildPayload("site-123", "/", "", "pageview");
    expect(payload).not.toHaveProperty("userId");
  });
});

describe("sendPayload", () => {
  const endpoint = "https://analytics.example.com/api/collect";
  const payload = {
    websiteId: "site-123",
    url: "/",
    referrer: "",
    title: "Test",
    screen: "1920x1080",
    language: "en-US",
    name: "pageview",
  };

  it("uses sendBeacon when available", () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, "sendBeacon", {
      value: sendBeacon,
      configurable: true,
      writable: true,
    });

    sendPayload(endpoint, payload);

    expect(sendBeacon).toHaveBeenCalledWith(endpoint, expect.any(Blob));
  });

  it("falls back to fetch when sendBeacon is unavailable", () => {
    Object.defineProperty(navigator, "sendBeacon", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const fetchSpy = vi.fn().mockResolvedValue(new Response());
    vi.stubGlobal("fetch", fetchSpy);

    sendPayload(endpoint, payload);

    expect(fetchSpy).toHaveBeenCalledWith(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    });

    vi.unstubAllGlobals();
  });
});
