"use client";

import { Award, Bot, History } from "lucide-react";
import { formatPaiseAsINR } from "@/lib/listings/money";
import type { ListingAutoBid, ListingBid } from "@/lib/listings/detail-query";

type BidHistoryProps = {
  bids: ListingBid[];
  autoBids: ListingAutoBid[];
};

function formatTimestamp(isoString: string) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(isoString));
}

export function BidHistory({ bids, autoBids }: BidHistoryProps) {
  return (
    <div className="space-y-6">
      {/* Bid Log */}
      <div>
        <div className="flex items-center justify-between border-b border-[#e6e3dd] pb-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[#282342]">
            <History size={16} className="text-[#514879]" aria-hidden="true" />
            Public Bid History ({bids.length})
          </h3>
          <span className="text-[11px] text-[#77747e]">Auditable & transparent</span>
        </div>

        {bids.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#77747e]">
            No bids placed yet. Be the first student to place an offer!
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-[#eeebe5] text-xs" role="list">
            {bids.map((bid, index) => {
              const isLeading = index === 0;
              return (
                <li
                  key={bid.id}
                  className={`flex items-center justify-between py-2.5 px-2 rounded-sm transition ${
                    isLeading ? "bg-[#eaf1dd]/50 font-medium" : "hover:bg-black/[0.02]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {isLeading ? (
                      <span className="inline-flex items-center gap-1 rounded bg-[#c9ef72] px-1.5 py-0.5 text-[10px] font-bold text-[#282342]">
                        <Award size={11} aria-hidden="true" />
                        Leading
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#8e8a96] tabular-nums">#{bids.length - index}</span>
                    )}
                    <span className="font-medium text-[#282342]">{bid.bidder_name}</span>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <span className="font-semibold tabular-nums text-[#282342]">
                      {formatPaiseAsINR(bid.amount_paise)}
                    </span>
                    <span className="text-[11px] text-[#8e8a96] tabular-nums">
                      {formatTimestamp(bid.created_at)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Public Maximums (Auto Bids) */}
      {autoBids.length > 0 && (
        <div className="rounded-md border border-[#e2dfd8] bg-[#fdfcfa] p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#514879]">
            <Bot size={15} aria-hidden="true" />
            <span>Public Auto-Bid Maximums</span>
          </div>
          <p className="mt-1 text-[11px] leading-4 text-[#77747e]">
            Students configured automatic bidding up to these transparent ceilings:
          </p>

          <div className="mt-2.5 space-y-1.5">
            {autoBids.map((ab) => (
              <div
                key={ab.id}
                className="flex items-center justify-between rounded bg-white px-2.5 py-1.5 text-xs border border-[#eeebe5]"
              >
                <span className="text-[#3a3549]">{ab.bidder_name}</span>
                <span className="font-medium tabular-nums text-[#514879]">
                  Max ceiling: {formatPaiseAsINR(ab.max_amount_paise)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
