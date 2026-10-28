import { isValidRupeeAmount, rupeesToPaise } from "./money";
import { SAMPLE_LISTINGS } from "./samples";
import type {
  ListingCategory,
  ListingCondition,
  ListingSort,
  MarketplaceFilters,
  MarketplaceListing,
} from "./query-types";

export const MARKETPLACE_PAGE_SIZE = 12;

export function shouldUseSampleFallback(isDevelopment: boolean, activeListingCount: number | null) {
  return isDevelopment && activeListingCount === 0;
}

const categories: ListingCategory[] = ["cycle", "calculator", "books", "electronics", "other"];
const conditions: ListingCondition[] = ["like_new", "good", "fair", "poor"];
const sorts: ListingSort[] = ["newest", "ending", "price"];

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function sanitizeSearchTerm(value: string | undefined) {
  return (value ?? "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function parseMarketplaceFilters(params: SearchParams): MarketplaceFilters {
  const rawCategory = firstParam(params.category);
  const rawCondition = firstParam(params.condition);
  const rawSort = firstParam(params.sort);
  const rawMinPrice = firstParam(params.minPrice) ?? "";
  const rawMaxPrice = firstParam(params.maxPrice) ?? "";
  const requestedPage = Number.parseInt(firstParam(params.page) ?? "1", 10);

  return {
    search: sanitizeSearchTerm(firstParam(params.q)),
    category: categories.includes(rawCategory as ListingCategory)
      ? (rawCategory as ListingCategory)
      : "all",
    condition: conditions.includes(rawCondition as ListingCondition)
      ? (rawCondition as ListingCondition)
      : "all",
    minPrice: isValidRupeeAmount(rawMinPrice) ? rawMinPrice : "",
    maxPrice: isValidRupeeAmount(rawMaxPrice) ? rawMaxPrice : "",
    closingSoon: firstParam(params.closingSoon) === "24h",
    sort: sorts.includes(rawSort as ListingSort) ? (rawSort as ListingSort) : "newest",
    page: Number.isInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 1000) : 1,
  };
}

export function filterSampleListings(
  filters: MarketplaceFilters,
  now = new Date(),
): MarketplaceListing[] {
  const minPricePaise = filters.minPrice ? BigInt(rupeesToPaise(filters.minPrice)) : null;
  const maxPricePaise = filters.maxPrice ? BigInt(rupeesToPaise(filters.maxPrice)) : null;
  const search = filters.search.toLocaleLowerCase("en-IN");
  const closingCutoff = now.getTime() + 24 * 60 * 60 * 1000;

  return SAMPLE_LISTINGS.filter((listing) => {
    const price = BigInt(listing.current_price_paise);
    const searchableText = `${listing.title} ${listing.description}`.toLocaleLowerCase("en-IN");

    return (
      (!search || searchableText.includes(search)) &&
      (filters.category === "all" || listing.category === filters.category) &&
      (filters.condition === "all" || listing.condition === filters.condition) &&
      (!minPricePaise || price >= minPricePaise) &&
      (!maxPricePaise || price <= maxPricePaise) &&
      (!filters.closingSoon || new Date(listing.ends_at).getTime() <= closingCutoff)
    );
  }).sort((left, right) => {
    if (filters.sort === "ending") {
      return left.ends_at.localeCompare(right.ends_at);
    }
    if (filters.sort === "price") {
      return BigInt(left.current_price_paise) < BigInt(right.current_price_paise) ? -1 : 1;
    }
    return right.created_at.localeCompare(left.created_at);
  });
}