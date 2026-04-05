import { afterEach, describe, expect, it } from "vitest";

import { Users } from "@/payload/collections/users";

const originalDemoMode = process.env.DEMO_MODE;

function getUpdateAccess() {
  const update = Users.access?.update;

  if (typeof update !== "function") {
    throw new Error("Users.update access must be a function");
  }

  return update;
}

afterEach(() => {
  if (originalDemoMode === undefined) {
    delete process.env.DEMO_MODE;
  } else {
    process.env.DEMO_MODE = originalDemoMode;
  }
});

describe("Users access.update", () => {
  it("blocks the demo user when demo mode is enabled", () => {
    process.env.DEMO_MODE = "true";

    const update = getUpdateAccess();
    const result = update({
      req: {
        user: {
          id: "demo-user",
          email: "demo@demo.com",
          roles: ["user"],
        },
      },
    } as never);

    expect(result).toBe(false);
  });

  it("still allows admins to update users in demo mode", () => {
    process.env.DEMO_MODE = "true";

    const update = getUpdateAccess();
    const result = update({
      req: {
        user: {
          id: "admin-user",
          email: "admin@example.com",
          roles: ["admin"],
        },
      },
    } as never);

    expect(result).toBe(true);
  });

  it("allows non-demo users to update their own profile", () => {
    process.env.DEMO_MODE = "true";

    const update = getUpdateAccess();
    const result = update({
      req: {
        user: {
          id: "regular-user",
          email: "user@example.com",
          roles: ["user"],
        },
      },
    } as never);

    expect(result).toEqual({ id: { equals: "regular-user" } });
  });
});
