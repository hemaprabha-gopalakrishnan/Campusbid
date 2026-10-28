import Link from "next/link";
import { CalendarClock, Tag } from "lucide-react";
import { formatPaiseAsINR } from "@/lib/listings/money";
import type { ListingCategory, ListingCondition, MarketplaceListing } from "@/lib/listings/query-types";

const categoryLabels: Record<ListingCategory, string> = {
  cycle: "Cycle",
  calculator: "Calculator",
  books: "Books",
  electronics: "Electronics",
  other: "Other",
};

const conditionLabels: Record<ListingCondition, string> = {
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

const imageTints: Record<ListingCategory, string> = {
  cycle: "#d8e6d9",
  calculator: "#e7e1d7",
  books: "#e8dccb",
  electronics: "#d9e3e7",
  other: "#e4dfeb",
};

function formatClosingTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

type ListingCardProps = {
  listing: MarketplaceListing;
};

export function ListingCard({ listing }: ListingCardProps) {
  const imageUrl = listing.images[0]?.url ?? listing.sample_image;

  return (
    <Link href={`/listings/${listing.id}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#514879]">
      <article className="group min-w-0 overflow-hidden rounded-sm border border-black/5 bg-white transition hover:border-[#c5bfce] hover:shadow-[0_5px_16px_rgba(40,35,66,0.09)]">
      <div
        aria-label={imageUrl ? `${listing.title} photo` : `${categoryLabels[listing.category]} listing`}
        className="relative aspect-square overflow-hidden bg-cover bg-center"
        role="img"
        style={{
          backgroundColor: imageTints[listing.category],
          backgroundImage: imageUrl ? `url('${imageUrl}')` : undefined,
        }}
      >
        {!imageUrl && (
          <div className="absolute inset-0 grid place-items-center text-[#514879]/70" aria-hidden="true">
            <Tag size={42} strokeWidth={1.3} />
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {listing.is_sample && (
            <span className="rounded-sm bg-[#fff4d8] px-1.5 py-1 text-[10px] font-semibold text-[#795b1b]">Sample</span>
          )}
        </div>
      </div>

      <div className="p-2.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 min-h-9 text-xs font-semibold leading-[18px] text-[#282342] sm:text-[13px]">
            {listing.title}
          </h3>
        </div>
        <div className="mt-2 flex items-center justify-between gap-1">
          <span className="truncate text-[10px] text-[#77747e]">{conditionLabels[listing.condition]}</span>
          <span className="shrink-0 text-[10px] text-[#77747e]">{listing.bid_count} bids</span>
        </div>
        <div className="mt-2 border-t border-[#eeeae5] pt-2">
          <div>
            <p className="text-[10px] text-[#77747e]">Leading bid</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-[#282342] sm:text-base">
              {formatPaiseAsINR(listing.current_price_paise)}
            </p>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-1 text-[10px] leading-4 text-[#77747e]">
          <CalendarClock size={12} className="shrink-0" aria-hidden="true" />
          <span className="truncate">Closes {formatClosingTime(listing.ends_at)}</span>
        </div>
        <div className="sr-only">
          <span>{categoryLabels[listing.category]}</span>
          <span>{listing.seller_name}</span>
          <span>Starting bid {formatPaiseAsINR(listing.starting_price_paise)}</span>
          <span>Minimum increment {formatPaiseAsINR(listing.min_increment_paise)}</span>
          <span>{listing.description}</span>
        </div>
      </div>
    </article>
    </Link>
  );
}