import { describe, expect, it } from "vitest";
import { calculateProxyBids } from "./auto-bidding";

describe("calculateProxyBids", () => {
  const baseParams = {
    startingPricePaise: BigInt(50000), // ₹500
    minIncrementPaise: BigInt(5000),   // ₹50
    currentHighBidPaise: null,
    currentLeaderId: null,
    competingAutoBid: null,
    endsAt: new Date(Date.now() + 100_000),
    now: new Date(),
  };

  it("sets the first bid to starting price when no competition exists", () => {
    const result = calculateProxyBids({
      ...baseParams,
      newAutoBid: { bidderId: "user-1", maxAmountPaise: BigInt(100000) },
    });

    expect(result.leadingBidderId).toBe("user-1");
    expect(result.effectiveBidPaise).toBe(BigInt(50000));
    expect(result.extended).toBe(false);
  });

  it("outbids a lower competing max by one minimum increment", () => {
    const result = calculateProxyBids({
      ...baseParams,
      currentHighBidPaise: BigInt(50000),
      competingAutoBid: { bidderId: "user-prev", maxAmountPaise: BigInt(70000) }, // max ₹700
      newAutoBid: { bidderId: "user-new", maxAmountPaise: BigInt(100000) },       // max ₹1,000
    });

    expect(result.leadingBidderId).toBe("user-new");
    // Should advance past 70000 by 5000 = 75000
    expect(result.effectiveBidPaise).toBe(BigInt(75000));
    expect(result.counterBidderId).toBe("user-prev");
    expect(result.counterBidPaise).toBe(BigInt(70000));
  });

  it("keeps previous bidder in lead if new auto-bid is lower than previous max", () => {
    const result = calculateProxyBids({
      ...baseParams,
      currentHighBidPaise: BigInt(50000),
      competingAutoBid: { bidderId: "user-prev", maxAmountPaise: BigInt(120000) }, // max ₹1,200
      newAutoBid: { bidderId: "user-new", maxAmountPaise: BigInt(80000) },         // max ₹800
    });

    expect(result.leadingBidderId).toBe("user-prev");
    // Should counter at new max + min increment = 85000
    expect(result.effectiveBidPaise).toBe(BigInt(85000));
    expect(result.counterBidderId).toBe("user-new");
    expect(result.counterBidPaise).toBe(BigInt(80000));
  });

  it("detects last-minute extension window within 30 seconds", () => {
    const now = new Date();
    const result = calculateProxyBids({
      ...baseParams,
      endsAt: new Date(now.getTime() + 20_000), // 20s left (< 30s)
      now,
      newAutoBid: { bidderId: "user-1", maxAmountPaise: BigInt(60000) },
    });

    expect(result.extended).toBe(true);
  });

  it("throws when max bid is less than minimum needed", () => {
    expect(() =>
      calculateProxyBids({
        ...baseParams,
        currentHighBidPaise: BigInt(50000),
        newAutoBid: { bidderId: "user-1", maxAmountPaise: BigInt(52000) }, // needs 55000
      }),
    ).toThrow("Bid below minimum allowed increment");
  });
});
