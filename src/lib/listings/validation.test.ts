import { describe, expect, it } from "vitest";
import { formatPaiseAsINR, isValidRupeeAmount, rupeesToPaise } from "./money";
import { isFutureClosingTime, listingInputSchema, validatePhotoInfo } from "./validation";

describe("listing money validation", () => {
  it("converts rupees to integer paise without floating point", () => {
    expect(rupeesToPaise("1200.05")).toBe("120005");
    expect(rupeesToPaise("42")).toBe("4200");
  });

  it("rejects zero, excessive precision, and oversized prices", () => {
    expect(isValidRupeeAmount("0")).toBe(false);
    expect(isValidRupeeAmount("1.001")).toBe(false);
    expect(isValidRupeeAmount("100000000")).toBe(false);
  });

  it("formats paise in Indian rupees", () => {
    expect(formatPaiseAsINR("120005")).toContain("1,200.05");
  });
});

describe("listing form validation", () => {
  const validListing = {
    title: "Scientific calculator",
    category: "calculator",
    description: "Barely used calculator with its case.",
    condition: "good",
    startingPrice: "500.00",
    minIncrement: "25",
    endsAt: "2027-01-15T10:00:00.000Z",
  };

  it("accepts a valid listing", () => {
    expect(listingInputSchema.safeParse(validListing).success).toBe(true);
  });

  it("rejects invalid categories and non-positive prices", () => {
    expect(listingInputSchema.safeParse({ ...validListing, category: "furniture" }).success).toBe(false);
    expect(listingInputSchema.safeParse({ ...validListing, startingPrice: "0" }).success).toBe(false);
  });

  it("requires a future closing time", () => {
    const now = new Date("2026-10-28T00:00:00.000Z");
    expect(isFutureClosingTime("2026-10-29T00:00:00.000Z", now)).toBe(true);
    expect(isFutureClosingTime("2026-10-27T23:59:59.000Z", now)).toBe(false);
  });

  it("limits image count, type, and size", () => {
    expect(validatePhotoInfo([{ name: "item.webp", size: 1024, type: "image/webp" }])).toBeNull();
    expect(validatePhotoInfo([])).not.toBeNull();
    expect(validatePhotoInfo([{ name: "item.svg", size: 1024, type: "image/svg+xml" }])).not.toBeNull();
    expect(validatePhotoInfo([{ name: "large.png", size: 6 * 1024 * 1024, type: "image/png" }])).not.toBeNull();
  });
});