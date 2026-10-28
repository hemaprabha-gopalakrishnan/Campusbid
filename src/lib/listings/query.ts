import "server-only";

import { createClient } from "@/lib/supabase/server";
import { MARKETPLACE_PAGE_SIZE, filterSampleListings, shouldUseSampleFallback } from "./filters";
import { rupeesToPaise } from "./money";
import type {
  MarketplaceFilters,
  MarketplaceListing,
  MarketplaceResult,
} from "./query-types";

function sampleResult(filters: MarketplaceFilters, unavailable: boolean): MarketplaceResult {
  const matches = filterSampleListings(filters);
  const start = (filters.page - 1) * MARKETPLACE_PAGE_SIZE;

  return {
    listings: matches.slice(start, start + MARKETPLACE_PAGE_SIZE),
    total: matches.length,
    page: filters.page,
    isSample: true,
    unavailable,
  };
}

function getPublicImageUrl(supabase: Awaited<ReturnType<typeof createClient>>, storagePath: string) {
  return supabase.storage.from("listing-images").getPublicUrl(storagePath).data.publicUrl;
}

export async function getMarketplaceListings(filters: MarketplaceFilters): Promise<MarketplaceResult> {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch {
    return process.env.NODE_ENV === "development"
      ? sampleResult(filters, true)
      : { listings: [], total: 0, page: filters.page, isSample: false, unavailable: true };
  }

  const now = new Date();
  let query = supabase
    .from("marketplace_listings")
    .select("*", { count: "exact" })
    .eq("status", "active")
    .gt("ends_at", now.toISOString());

  if (filters.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`,
    );
  }
  if (filters.category !== "all") query = query.eq("category", filters.category);
  if (filters.condition !== "all") query = query.eq("condition", filters.condition);
  if (filters.minPrice) query = query.gte("current_price_paise", rupeesToPaise(filters.minPrice));
  if (filters.maxPrice) query = query.lte("current_price_paise", rupeesToPaise(filters.maxPrice));
  if (filters.closingSoon) {
    query = query.lte("ends_at", new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString());
  }

  const orderColumn = filters.sort === "ending"
    ? "ends_at"
    : filters.sort === "price"
      ? "current_price_paise"
      : "created_at";
  query = query.order(orderColumn, { ascending: filters.sort === "ending" || filters.sort === "price" });

  const start = (filters.page - 1) * MARKETPLACE_PAGE_SIZE;
  const [listingResponse, availabilityResponse] = await Promise.all([
    query.range(start, start + MARKETPLACE_PAGE_SIZE - 1),
    supabase
      .from("marketplace_listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .gt("ends_at", now.toISOString()),
  ]);
  const { data, error, count } = listingResponse;

  if (error || !data || availabilityResponse.error) {
    console.error("Marketplace query failed", error?.code ?? availabilityResponse.error?.code ?? "unknown");
    return process.env.NODE_ENV === "development"
      ? sampleResult(filters, true)
      : { listings: [], total: 0, page: filters.page, isSample: false, unavailable: true };
  }

  if (data.length === 0 && shouldUseSampleFallback(process.env.NODE_ENV === "development", availabilityResponse.count)) {
    return sampleResult(filters, false);
  }

  const listingIds = data.map((listing) => listing.id);
  const { data: imageRows, error: imageError } = listingIds.length
    ? await supabase
        .from("listing_images")
        .select("listing_id, storage_path, position")
        .in("listing_id", listingIds)
        .order("position", { ascending: true })
    : { data: [], error: null };

  if (imageError) {
    console.error("Marketplace image query failed", imageError.code);
  }

  const imagesByListing = new Map<string, MarketplaceListing["images"]>();
  for (const image of imageRows ?? []) {
    const listingImages = imagesByListing.get(image.listing_id) ?? [];
    listingImages.push({
      storage_path: image.storage_path,
      url: getPublicImageUrl(supabase, image.storage_path),
    });
    imagesByListing.set(image.listing_id, listingImages);
  }

  return {
    listings: data.map((listing) => ({
      ...listing,
      current_price_paise: String(listing.current_price_paise),
      starting_price_paise: String(listing.starting_price_paise),
      min_increment_paise: String(listing.min_increment_paise),
      seller_name: listing.seller_name ?? "Campus student",
      images: imagesByListing.get(listing.id) ?? [],
    })),
    total: count ?? data.length,
    page: filters.page,
    isSample: false,
    unavailable: false,
  };
}