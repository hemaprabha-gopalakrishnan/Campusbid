"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ShieldCheck, Tag, User } from "lucide-react";
import { formatPaiseAsINR } from "@/lib/listings/money";
import { createClient } from "@/lib/supabase/client";
import { closeAuctionAction } from "@/lib/listings/bidding-actions";
import { CountdownTimer } from "./countdown-timer";
import { BidForm } from "./bid-form";
import { BidHistory } from "./bid-history";
import { SaleResolutionCard } from "./sale-resolution-card";
import { ListingQA } from "./listing-qa";
import type { ListingDetail } from "@/lib/listings/detail-query";

type AuctionRoomProps = {
  initialListing: ListingDetail;
};

const categoryBadges: Record<string, string> = {
  cycle: "Cycles",
  calculator: "Calculators",
  books: "Books",
  electronics: "Electronics",
  other: "General Campus",
};

const conditionLabels: Record<string, string> = {
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

export function AuctionRoom({ initialListing }: AuctionRoomProps) {
  const router = useRouter();
  const listing = initialListing;
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Subscribe to Supabase Realtime changes for this auction
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`auction-${listing.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bids",
          filter: `listing_id=eq.${listing.id}`,
        },
        () => {
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "listings",
          filter: `id=eq.${listing.id}`,
        },
        () => {
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales",
          filter: `listing_id=eq.${listing.id}`,
        },
        () => {
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "questions",
          filter: `listing_id=eq.${listing.id}`,
        },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [listing.id, router]);

  async function handleExpire() {
    await closeAuctionAction(listing.id);
    router.refresh();
  }

  const activePhoto = listing.images[selectedImageIndex]?.url;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-7 sm:py-8 lg:px-10">
      {/* Back button */}
      <div className="mb-5 flex items-center justify-between">
        <Link
          href="/#marketplace"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#514879] hover:text-[#282342] transition"
        >
          <ArrowLeft size={14} aria-hidden="true" /> Back to marketplace
        </Link>
        <span className="text-xs text-[#77747e]">Auction #{listing.id.slice(0, 8)}</span>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Photos + Description + Q&A */}
        <div className="space-y-6 lg:col-span-7">
          {/* Main Photo Gallery */}
          <div className="overflow-hidden rounded-md border border-[#e2dfd8] bg-white">
            <div className="relative aspect-4/3 w-full bg-[#f2f0ec]">
              {activePhoto ? (
                <Image
                  src={activePhoto}
                  alt={listing.title}
                  fill
                  className="object-contain"
                  priority
                />
              ) : (
                <div className="grid h-full place-items-center text-[#77747e]">
                  <Tag size={48} strokeWidth={1.5} />
                </div>
              )}
            </div>

            {/* Thumbnail selector */}
            {listing.images.length > 1 && (
              <div className="flex gap-2 border-t border-[#eeebe5] p-2.5 bg-[#fbfaf8]">
                {listing.images.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative size-14 overflow-hidden rounded border transition ${
                      selectedImageIndex === idx
                        ? "border-[#514879] ring-2 ring-[#514879]/20"
                        : "border-[#e2dfd8] opacity-75 hover:opacity-100"
                    }`}
                  >
                    <Image src={img.url} alt={`Photo ${idx + 1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Item Details */}
          <div className="rounded-md border border-[#e2dfd8] bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-[#dedae5]/50 px-2 py-0.5 text-xs font-semibold text-[#514879]">
                {categoryBadges[listing.category] || listing.category}
              </span>
              <span className="rounded bg-[#f0eee9] px-2 py-0.5 text-xs font-medium text-[#65616f]">
                Condition: {conditionLabels[listing.condition] || listing.condition}
              </span>
              <span className="text-xs text-[#77747e] ml-auto">
                Listed {new Date(listing.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
              </span>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-[#282342] sm:text-3xl">{listing.title}</h1>
              <div className="mt-2 flex items-center gap-2 text-xs text-[#635f6f]">
                <User size={14} className="text-[#514879]" aria-hidden="true" />
                <span>Listed by: <strong className="text-[#282342]">{listing.seller_name}</strong></span>
              </div>
            </div>

            <div className="border-t border-[#eeebe5] pt-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#77747e]">Item Description</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#3a3547]">
                {listing.description}
              </p>
            </div>
          </div>

          {/* Questions Before Bidding */}
          <div className="rounded-md border border-[#e2dfd8] bg-white p-5">
            <ListingQA
              listingId={listing.id}
              questions={listing.questions}
              isSeller={listing.is_seller}
              currentUserId={listing.current_user_id}
              status={listing.status}
            />
          </div>
        </div>

        {/* Right Column: Pricing, Countdown, Bid Action & History */}
        <div className="space-y-6 lg:col-span-5">
          {/* Auction Status & Bid Card */}
          <div className="rounded-md border border-[#dedae5] bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#77747e]">Leading Bid</p>
                <p className="text-2xl font-extrabold tabular-nums text-[#282342] sm:text-3xl">
                  {formatPaiseAsINR(listing.current_price_paise)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs font-medium text-[#77747e]">Time Remaining</p>
                <div className="mt-1">
                  <CountdownTimer
                    endsAt={listing.ends_at}
                    status={listing.status}
                    onExpire={handleExpire}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-[#eeebe5] pt-3 text-xs text-[#635f6f]">
              <div>
                <span className="block text-[#8b8793]">Starting Price:</span>
                <span className="font-semibold text-[#282342]">
                  {formatPaiseAsINR(listing.starting_price_paise)}
                </span>
              </div>
              <div>
                <span className="block text-[#8b8793]">Minimum Increment:</span>
                <span className="font-semibold text-[#282342]">
                  +{formatPaiseAsINR(listing.min_increment_paise)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-[#77747e] bg-[#fbfaf8] p-2 rounded border border-[#eeebe5]">
              <ShieldCheck size={14} className="text-[#514879] shrink-0" aria-hidden="true" />
              <span>Campus protected: 30s anti-sniping extension & confirmed handovers.</span>
            </div>

            {/* Bidding or Post-Sale Controls */}
            {listing.status === "active" ? (
              <BidForm
                listingId={listing.id}
                minNextBidPaise={listing.minimum_next_bid_paise}
                isSeller={listing.is_seller}
                currentUserId={listing.current_user_id}
                status={listing.status}
              />
            ) : (
              <SaleResolutionCard
                listingId={listing.id}
                status={listing.status}
                sale={listing.sale}
                isSeller={listing.is_seller}
                isWinner={listing.is_winner}
              />
            )}
          </div>

          {/* Bid History Card */}
          <div className="rounded-md border border-[#e2dfd8] bg-white p-5 shadow-xs">
            <BidHistory bids={listing.bids} autoBids={listing.auto_bids} />
          </div>
        </div>
      </div>
    </div>
  );
}
