import Link from "next/link";
import { connection } from "next/server";
import { AlertCircle, ArrowLeft, ArrowRight, Plus, SearchX } from "lucide-react";
import { ListingCard } from "@/components/listings/listing-card";
import { MarketplaceFiltersForm } from "@/components/listings/marketplace-filters";
import { getMarketplaceListings } from "@/lib/listings/query";
import { MARKETPLACE_PAGE_SIZE, parseMarketplaceFilters } from "@/lib/listings/filters";
import type { MarketplaceFilters } from "@/lib/listings/query-types";

const categoryShelves = [
  { value: "cycle", label: "Cycles & commuters", color: "bg-[#e6ede1]" },
  { value: "calculator", label: "Calculators", color: "bg-[#eee9df]" },
  { value: "books", label: "Books & study", color: "bg-[#f3e8d8]" },
  { value: "electronics", label: "Electronics", color: "bg-[#e1ebef]" },
  { value: "other", label: "More campus finds", color: "bg-[#eee8f1]" },
] as const;

type MarketplaceResultsProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pageHref(filters: MarketplaceFilters, page: number) {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.condition !== "all") params.set("condition", filters.condition);
  if (filters.minPrice) params.set("minPrice", filters.minPrice);
  if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
  if (filters.closingSoon) params.set("closingSoon", "24h");
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  params.set("page", String(page));
  return `/?${params.toString()}#marketplace`;
}

export async function MarketplaceResults({ searchParams }: MarketplaceResultsProps) {
  await connection();
  const filters = parseMarketplaceFilters(await searchParams);
  const result = await getMarketplaceListings(filters);
  const firstItem = result.total === 0 ? 0 : (filters.page - 1) * MARKETPLACE_PAGE_SIZE + 1;
  const lastItem = Math.min(filters.page * MARKETPLACE_PAGE_SIZE, result.total);
  const groupedListings = categoryShelves
    .map((shelf) => ({
      ...shelf,
      listings: result.listings.filter((listing) => listing.category === shelf.value),
    }))
    .filter((shelf) => shelf.listings.length > 0);

  return (
    <section className="mt-8 sm:mt-10" aria-labelledby="marketplace-heading">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#e2dfd8] pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#77747e]">Marketplace</p>
          <h2 className="mt-1 text-2xl font-semibold text-[#282342]" id="marketplace-heading">Fresh on campus</h2>
        </div>
        <p aria-live="polite" className="text-sm text-[#77747e]">
          {result.isSample ? "Development samples" : `${result.total} ${result.total === 1 ? "listing" : "listings"}`}
        </p>
      </div>

      <MarketplaceFiltersForm filters={filters} />

      {result.isSample && (
        <p className="mt-4 flex items-start gap-2 rounded-md border border-[#eadcb8] bg-[#fff8e8] px-3 py-2.5 text-xs leading-5 text-[#705c2a]">
          <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          These are development samples, not live listings. They appear only when the development database has no results or is unavailable.
        </p>
      )}

      {result.unavailable && !result.isSample ? (
        <div className="mt-8 flex min-h-52 flex-col items-center justify-center text-center">
          <AlertCircle size={24} className="text-[#8f4b39]" aria-hidden="true" />
          <h3 className="mt-3 text-base font-semibold text-[#282342]">Marketplace unavailable</h3>
          <p className="mt-1 max-w-md text-sm leading-6 text-[#77747e]">We couldn’t load listings. Check the Supabase configuration and try again.</p>
        </div>
      ) : result.listings.length === 0 ? (
        <div className="mt-8 flex min-h-52 flex-col items-center justify-center text-center">
          <SearchX size={25} className="text-[#77747e]" aria-hidden="true" />
          <h3 className="mt-3 text-base font-semibold text-[#282342]">No listings match these filters</h3>
          <p className="mt-1 text-sm text-[#77747e]">Try another search or clear a filter.</p>
          <Link className="mt-3 text-sm font-semibold text-[#514879] underline decoration-[#c9ef72] decoration-2 underline-offset-4" href="/">Clear filters</Link>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {groupedListings.map((shelf) => (
              <section className={`rounded-md p-3 sm:p-4 ${shelf.color}`} key={shelf.value}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-[15px] font-semibold leading-5 text-[#282342]">{shelf.label}</h3>
                    <p className="mt-0.5 text-[11px] text-[#77747e]">{shelf.listings.length} {shelf.listings.length === 1 ? "auction" : "auctions"}</p>
                  </div>
                  <Link className="shrink-0 text-[11px] font-semibold text-[#514879] underline decoration-[#514879]/30 underline-offset-4" href={`/?category=${shelf.value}#marketplace`}>
                    Browse
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {shelf.listings.slice(0, 4).map((listing) => <ListingCard key={listing.id} listing={listing} />)}
                </div>
              </section>
            ))}
          </div>
          {result.total > MARKETPLACE_PAGE_SIZE && (
            <nav className="mt-7 flex items-center justify-between border-t border-[#e2dfd8] pt-4" aria-label="Marketplace pages">
              <span className="text-xs text-[#77747e]">Showing {firstItem}–{lastItem} of {result.total}</span>
              <div className="flex gap-2">
                {filters.page > 1 && <Link className="inline-flex h-9 items-center gap-1 rounded-md border border-[#dedbe3] bg-white px-3 text-xs font-medium text-[#514879]" href={pageHref(filters, filters.page - 1)}><ArrowLeft size={14} />Previous</Link>}
                {lastItem < result.total && <Link className="inline-flex h-9 items-center gap-1 rounded-md border border-[#dedbe3] bg-white px-3 text-xs font-medium text-[#514879]" href={pageHref(filters, filters.page + 1)}>Next<ArrowRight size={14} /></Link>}
              </div>
            </nav>
          )}
        </>
      )}

      <div className="mt-7 border-t border-[#e2dfd8] pt-5">
        <Link className="inline-flex h-10 items-center gap-2 rounded-md bg-[#c9ef72] px-4 text-sm font-semibold text-[#282342] hover:bg-[#d8f59a]" href="/listings/new">
          <Plus size={16} aria-hidden="true" /> List an item
        </Link>
      </div>
    </section>
  );
}