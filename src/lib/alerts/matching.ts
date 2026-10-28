export type WantedAlert = {
  id: string;
  user_id: string;
  title: string;
  category: string | null;
  max_price_paise: bigint | string;
};

export type ListingToMatch = {
  id: string;
  title: string;
  description: string;
  category: string;
  starting_price_paise: bigint | string;
};

export function isListingMatchingAlert(listing: ListingToMatch, alert: WantedAlert): boolean {
  // Category check: if alert specifies a category, it must match
  if (alert.category && alert.category !== "other" && alert.category !== listing.category) {
    return false;
  }

  // Price check: starting price must not exceed alert's max price
  const alertMax = BigInt(alert.max_price_paise);
  const listingPrice = BigInt(listing.starting_price_paise);
  if (listingPrice > alertMax) {
    return false;
  }

  // Keyword check: split alert title into words and check if title or description contains them
  const keywords = alert.title
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2);

  if (keywords.length === 0) {
    return true;
  }

  const searchableText = `${listing.title} ${listing.description}`.toLowerCase();
  // Match if any significant keyword appears
  return keywords.some((kw) => searchableText.includes(kw));
}
