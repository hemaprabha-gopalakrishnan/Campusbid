export const MAX_BID_PAISE = BigInt(9_999_999_900);

export function getMinimumBidPaise(
  startingPricePaise: string | bigint,
  currentPricePaise: string | bigint,
  minIncrementPaise: string | bigint,
  bidCount: number,
) {
  if (bidCount <= 0) return BigInt(startingPricePaise);
  return BigInt(currentPricePaise) + BigInt(minIncrementPaise);
}

export function isBidInExtensionWindow(endsAt: string | Date, acceptedAt: string | Date) {
  return new Date(endsAt).getTime() - new Date(acceptedAt).getTime() <= 30_000;
}

export function getExtendedDeadline(acceptedAt: string | Date) {
  return new Date(new Date(acceptedAt).getTime() + 60_000).toISOString();
}