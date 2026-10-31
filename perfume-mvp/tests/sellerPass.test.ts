import { describe, it, expect } from "vitest";
import { tierLabel, cardName, initialOf, isCardSafeImage } from "@/lib/sellerPass";

describe("tierLabel", () => {
  it("labels tiers", () => {
    expect(tierLabel("gold", false)).toBe("Gold Seller");
    expect(tierLabel("gold", true)).toBe("Early Gold Seller");
    expect(tierLabel(null, false)).toBe("New seller");
  });
});

describe("cardName", () => {
  it("uses display name when Latin and short", () => {
    expect(cardName("Rafid Elahi", "rafid")).toBe("Rafid Elahi");
  });
  it("falls back to @username for non-Latin names", () => {
    expect(cardName("রাফিদ", "rafid")).toBe("@rafid");
  });
  it("falls back to @username for long names", () => {
    expect(cardName("A".repeat(40), "rafid")).toBe("@rafid");
  });
  it("falls back when display name is empty", () => {
    expect(cardName("", "rafid")).toBe("@rafid");
  });
});

describe("initialOf", () => {
  it("returns first Latin letter uppercased", () => {
    expect(initialOf("rafid")).toBe("R");
    expect(initialOf("@rafid")).toBe("R");
  });
  it("returns ? for non-Latin", () => {
    expect(initialOf("রাফিদ")).toBe("?");
  });
});

describe("isCardSafeImage", () => {
  it("rejects null, webp, avif", () => {
    expect(isCardSafeImage(null)).toBe(false);
    expect(isCardSafeImage("https://x/a.webp")).toBe(false);
    expect(isCardSafeImage("https://x/a.AVIF?x=1")).toBe(false);
  });
  it("accepts png/jpg", () => {
    expect(isCardSafeImage("https://x/a.png?x=1")).toBe(true);
    expect(isCardSafeImage("https://x/a.jpg")).toBe(true);
  });
});
