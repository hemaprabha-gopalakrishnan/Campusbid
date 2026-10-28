import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { CancelListingButton } from "@/components/listings/cancel-listing-button";
import { SiteHeader } from "@/components/site-header";
import { getVerifiedClaims } from "@/lib/auth";
import { formatPaiseAsINR } from "@/lib/listings/money";
import { createClient } from "@/lib/supabase/server";

function formatClosingTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function MyListingsContent() {
  const claims = await getVerifiedClaims().catch(() => null);
  if (!claims?.sub) redirect("/sign-in");

  const supabase = await createClient();
  const { data: listings, error } = await supabase
    .from("listings")
    .select("id, title, category, condition, starting_price_paise, min_increment_paise, ends_at, status, created_at")
    .eq("seller_id", claims.sub)
    .order("created_at", { ascending: false });

  const listingIds = (listings ?? []).map((listing) => listing.id);
  const { data: bids } = listingIds.length
    ? await supabase.from("bids").select("listing_id").in("listing_id", listingIds)
    : { data: [] };
  const listingIdsWithBids = new Set((bids ?? []).map((bid) => bid.listing_id));

  return (
    <div className="min-h-screen bg-[#f7f6f2]">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-7 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#e2dfd8] pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#77747e]">Seller workspace</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#282342]">My listings</h1>
          </div>
          <Link className="inline-flex h-10 items-center gap-2 rounded-md bg-[#514879] px-4 text-sm font-semibold text-white hover:bg-[#40385f]" href="/listings/new">
            <Plus size={16} aria-hidden="true" /> List an item
          </Link>
        </div>

        {error ? (
          <div className="mt-7 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            We couldn’t load your listings. Check the Supabase setup and try again.
          </div>
        ) : !listings?.length ? (
          <div className="mt-8 flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-[#d6d1dc] bg-white px-5 text-center">
            <h2 className="text-lg font-semibold text-[#282342]">Your seller shelf is empty</h2>
            <p className="mt-1 max-w-sm text-sm leading-6 text-[#77747e]">Create a listing with its own price, photos, and closing time.</p>
            <Link className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#514879]" href="/listings/new">Create your first listing <ArrowRight size={15} /></Link>
          </div>
        ) : (
          <div className="mt-6 divide-y divide-[#e6e3dd] rounded-md border border-[#e6e3dd] bg-white">
            {listings.map((listing) => {
              const hasBids = listingIdsWithBids.has(listing.id);
              const isActive = listing.status === "active" && new Date(listing.ends_at) > new Date();
              const canCancel = isActive && !hasBids;
              const canEdit = isActive && !hasBids;

              return (
                <article className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5" key={listing.id}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-semibold text-[#282342]">{listing.title}</h2>
                      <span className={`rounded-sm px-2 py-1 text-[11px] font-semibold ${listing.status === "active" ? "bg-[#e7f2ce] text-[#50672d]" : "bg-[#efedf2] text-[#625e69]"}`}>
                        {listing.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#77747e]">
                      <span>Starting at {formatPaiseAsINR(String(listing.starting_price_paise))}</span>
                      <span>Increment {formatPaiseAsINR(String(listing.min_increment_paise))}</span>
                      <span>Closes {formatClosingTime(listing.ends_at)}</span>
                    </div>
                    {hasBids && <p className="mt-2 text-xs text-[#77747e]">Auction terms are locked after the first bid.</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {canEdit && <Link className="inline-flex h-9 items-center rounded-md border border-[#dedbe3] px-3 text-xs font-medium text-[#514879] hover:bg-[#f8f6fa]" href={`/listings/${listing.id}/edit`}>Edit</Link>}
                    {canCancel && <CancelListingButton listingId={listing.id} />}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default function MyListingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f7f6f2]" aria-label="Loading your listings" />}>
      <MyListingsContent />
    </Suspense>
  );
}