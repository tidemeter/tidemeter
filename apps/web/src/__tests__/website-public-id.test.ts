import { describe, expect, it } from "vitest";
import {
  applyWebsiteBeforeChange,
  generatePublicId,
} from "@/payload/collections/websites";

// Inline copy of the sync logic from canAccessWebsite for unit testing
// without pulling in Payload or Next request context.
function canAccessWebsiteSync(
  user: { id: string | number; roles?: string[] } | null | undefined,
  website: { createdBy: unknown; team?: unknown },
): boolean {
  if (!user) return false;
  const roles = user.roles ?? [];
  if (roles.includes("admin")) return true;
  // Personal website: creator is the sole owner.
  if (!website.team) {
    return String(website.createdBy) === String(user.id);
  }
  // Team-owned website: `createdBy` is audit metadata only.
  return false;
}

const PUBLIC_ID_RE = /^[A-Za-z0-9_-]{16}$/;

describe("generatePublicId", () => {
  it("produces a 16-char URL-safe base64url id", () => {
    for (let i = 0; i < 100; i++) {
      expect(generatePublicId()).toMatch(PUBLIC_ID_RE);
    }
  });

  it("is non-sequential / unique across calls", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => generatePublicId()));
    expect(ids.size).toBe(1000);
  });
});

describe("applyWebsiteBeforeChange", () => {
  it("generates a publicId and sets createdBy on create", () => {
    const data = applyWebsiteBeforeChange({
      req: { user: { id: 7 } },
      operation: "create",
      data: { name: "Acme", domain: "acme.com" },
      originalDoc: null,
    });
    expect(data.publicId).toMatch(PUBLIC_ID_RE);
    expect(data.createdBy).toBe(7);
  });

  it("always generates the publicId server-side on create (ignores client value)", () => {
    const data = applyWebsiteBeforeChange({
      req: { user: { id: 1 } },
      operation: "create",
      data: { publicId: "ProvidedId012345" },
      originalDoc: null,
    });
    expect(data.publicId).not.toBe("ProvidedId012345");
    expect(data.publicId).toMatch(PUBLIC_ID_RE);
  });

  it("keeps the existing publicId unchanged on update (immutable)", () => {
    const data = applyWebsiteBeforeChange({
      req: { user: { id: 1 } },
      operation: "update",
      data: { name: "Renamed" },
      originalDoc: { publicId: "StablePub1234567" },
    });
    expect(data.publicId).toBe("StablePub1234567");
  });

  it("ignores a client-supplied publicId on update (cannot be rotated via PATCH)", () => {
    const data = applyWebsiteBeforeChange({
      req: { user: { id: 1 } },
      operation: "update",
      data: { publicId: "AttackerValue000" },
      originalDoc: { publicId: "StablePub1234567" },
    });
    expect(data.publicId).toBe("StablePub1234567");
  });

  it("backfills a legacy row that never had a publicId on update", () => {
    const data = applyWebsiteBeforeChange({
      req: { user: { id: 1 } },
      operation: "update",
      data: { name: "Legacy" },
      originalDoc: { publicId: null },
    });
    expect(data.publicId).toMatch(PUBLIC_ID_RE);
  });
});

describe("canAccessWebsiteSync", () => {
  it("denies an unauthenticated user", () => {
    expect(canAccessWebsiteSync(null, { createdBy: 1 })).toBe(false);
    expect(canAccessWebsiteSync(undefined, { createdBy: 1 })).toBe(false);
  });

  it("allows the creator of a personal website (no team)", () => {
    expect(canAccessWebsiteSync({ id: 5 }, { createdBy: 5 })).toBe(true);
    expect(canAccessWebsiteSync({ id: "5" }, { createdBy: 5 })).toBe(true);
  });

  it("denies a non-creator of a personal website", () => {
    expect(canAccessWebsiteSync({ id: 9 }, { createdBy: 5 })).toBe(false);
  });

  it("denies the creator of a team-owned website (createdBy is audit only)", () => {
    expect(canAccessWebsiteSync({ id: 5 }, { createdBy: 5, team: 10 })).toBe(
      false,
    );
  });

  it("allows an admin regardless of ownership or team", () => {
    expect(
      canAccessWebsiteSync({ id: 9, roles: ["admin"] }, { createdBy: 5 }),
    ).toBe(true);
    expect(
      canAccessWebsiteSync(
        { id: 9, roles: ["admin"] },
        {
          createdBy: 5,
          team: 10,
        },
      ),
    ).toBe(true);
  });
});
