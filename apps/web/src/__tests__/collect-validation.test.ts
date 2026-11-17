import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("payload", () => ({ getPayload: vi.fn() }));
vi.mock("@payload-config", () => ({ default: {} }));
vi.mock("@/lib/ingestion/processor", () => ({ processEvent: vi.fn() }));
vi.mock("@/lib/website-cache", () => ({
  getCachedWebsite: vi.fn(() => ({ id: "1", domain: "example.com" })),
  setCachedWebsite: vi.fn(),
}));

import { POST } from "@/app/api/collect/route";
import { processEvent } from "@/lib/ingestion/processor";

function request(data?: unknown) {
  return new NextRequest("http://localhost/api/collect", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.com" },
    body: JSON.stringify({ websiteId: "public-id", url: "/", data }),
  });
}

describe("collect validation after the Zod upgrade", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([undefined, {}, { plan: "pro", seats: 3, active: true }])(
    "accepts optional custom data containing scalar values: %j",
    async (data) => {
      expect((await POST(request(data))).status).toBe(202);
      expect(processEvent).toHaveBeenCalledWith(
        expect.objectContaining({ websiteId: "1", name: "pageview", referrer: "" }),
      );
      expect(vi.mocked(processEvent).mock.calls[0][0].data).toEqual(data);
    },
  );

  it.each([
    null,
    [],
    { nested: { value: true } },
    { values: [1, 2] },
    { value: "x".repeat(1025) },
    Object.fromEntries(Array.from({ length: 33 }, (_, i) => [`key${i}`, i])),
  ])("rejects invalid or oversized custom data: %j", async (data) => {
    const response = await POST(request(data));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid payload" });
    expect(processEvent).not.toHaveBeenCalled();
  });
});
