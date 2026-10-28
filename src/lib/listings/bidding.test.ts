import { describe, expect, it } from "vitest";
import { getExtendedDeadline, getMinimumBidPaise, isBidInExtensionWindow, MAX_BID_PAISE } from "./bidding";

describe("auction bid rules", () => {
  it("uses the starting price for a first bid and current price plus increment after that", () => {
    expect(getMinimumBidPaise("50000", "50000", "2500", 0)).toBe(BigInt(50000));
    expect(getMinimumBidPaise("50000", "75000", "2500", 2)).toBe(BigInt(77500));
  });

  it("enforces the shared rupee cap in paise", () => {
    expect(MAX_BID_PAISE).toBe(BigInt(9_999_999_900));
  });

  it("extends bids at 30 seconds or less, but not just outside the window", () => {
    const acceptedAt = new Date("2026-10-28T12:00:00.000Z");
    expect(isBidInExtensionWindow("2026-10-28T12:00:30.000Z", acceptedAt)).toBe(true);
    expect(isBidInExtensionWindow("2026-10-28T12:00:30.001Z", acceptedAt)).toBe(false);
    expect(getExtendedDeadline(acceptedAt)).toBe("2026-10-28T12:01:00.000Z");
  });
});