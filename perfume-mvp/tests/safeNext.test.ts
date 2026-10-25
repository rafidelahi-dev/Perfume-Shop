import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/safeNext";

describe("safeNext", () => {
  it("keeps same-site paths", () => {
    expect(safeNext("/dashboard/blog?x=1")).toBe("/dashboard/blog?x=1");
  });
  it.each([null, "", "https://evil.com", "//evil.com", "/\\evil.com", "evil.com"])(
    "falls back for %s",
    (raw) => expect(safeNext(raw)).toBe("/dashboard")
  );
});
