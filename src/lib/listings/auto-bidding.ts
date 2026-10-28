import { getMinimumBidPaise } from "./bidding";

export type AutoBidCalculationResult = {
  leadingBidderId: string;
  effectiveBidPaise: bigint;
  counterBidPaise?: bigint;
  counterBidderId?: string;
  extended: boolean;
};

export function calculateProxyBids(params: {
  startingPricePaise: bigint;
  minIncrementPaise: bigint;
  currentHighBidPaise: bigint | null;
  currentLeaderId: string | null;
  competingAutoBid: { bidderId: string; maxAmountPaise: bigint } | null;
  newAutoBid: { bidderId: string; maxAmountPaise: bigint };
  endsAt: Date;
  now: Date;
}): AutoBidCalculationResult {
  const {
    startingPricePaise,
    minIncrementPaise,
    currentHighBidPaise,
    competingAutoBid,
    newAutoBid,
    endsAt,
    now,
  } = params;

  const minNeeded = currentHighBidPaise === null
    ? startingPricePaise
    : currentHighBidPaise + minIncrementPaise;

  if (newAutoBid.maxAmountPaise < minNeeded) {
    throw new Error("Bid below minimum allowed increment");
  }

  const isExtended = endsAt.getTime() - now.getTime() <= 30_000;

  // Case 1: No competing auto-bid
  if (!competingAutoBid) {
    return {
      leadingBidderId: newAutoBid.bidderId,
      effectiveBidPaise: minNeeded,
      extended: isExtended,
    };
  }

  // Case 2: New auto-bidder beats competing max
  if (newAutoBid.maxAmountPaise > competingAutoBid.maxAmountPaise) {
    const effectiveBid = newAutoBid.maxAmountPaise < competingAutoBid.maxAmountPaise + minIncrementPaise
      ? newAutoBid.maxAmountPaise
      : competingAutoBid.maxAmountPaise + minIncrementPaise;

    return {
      leadingBidderId: newAutoBid.bidderId,
      effectiveBidPaise: effectiveBid,
      counterBidderId: competingAutoBid.bidderId,
      counterBidPaise: competingAutoBid.maxAmountPaise,
      extended: isExtended,
    };
  }

  // Case 3: Competing auto-bidder holds lead or ties (tie goes to earlier bidder)
  const competingCounter = competingAutoBid.maxAmountPaise < newAutoBid.maxAmountPaise + minIncrementPaise
    ? competingAutoBid.maxAmountPaise
    : newAutoBid.maxAmountPaise + minIncrementPaise;

  return {
    leadingBidderId: competingAutoBid.bidderId,
    effectiveBidPaise: competingCounter,
    counterBidderId: newAutoBid.bidderId,
    counterBidPaise: newAutoBid.maxAmountPaise,
    extended: isExtended,
  };
}
