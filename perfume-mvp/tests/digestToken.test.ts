import { beforeEach, describe, expect, it } from "vitest";
import { unsubToken, verifyUnsubToken } from "@/lib/digestToken";

beforeEach(() => {
  process.env.CRON_SECRET = "test-secret";
});

describe("unsubscribe token", () => {
  it("accepts its own token", () => {
    expect(verifyUnsubToken("u1", unsubToken("u1"))).toBe(true);
  });
  it("rejects another user's token, junk, and a missing secret", () => {
    expect(verifyUnsubToken("u2", unsubToken("u1"))).toBe(false);
    expect(verifyUnsubToken("u1", "abc")).toBe(false);
    delete process.env.CRON_SECRET;
    expect(verifyUnsubToken("u1", unsubToken("u1"))).toBe(false);
  });
});
