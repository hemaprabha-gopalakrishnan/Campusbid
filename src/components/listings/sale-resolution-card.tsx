"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle, CheckCircle2, Handshake, LoaderCircle, XCircle } from "lucide-react";
import { formatPaiseAsINR } from "@/lib/listings/money";
import {
  approveSaleAction,
  confirmHandoverAction,
  rejectSaleAction,
  reportFailedPickupAction,
} from "@/lib/listings/bidding-actions";
import type { ListingSale } from "@/lib/listings/detail-query";

type SaleResolutionCardProps = {
  listingId: string;
  status: string;
  sale: ListingSale | null;
  isSeller: boolean;
  isWinner: boolean;
};

export function SaleResolutionCard({
  listingId,
  status,
  sale,
  isSeller,
  isWinner,
}: SaleResolutionCardProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  if (status === "active") {
    return null;
  }

  if (status === "unsold" || (!sale && status !== "cancelled")) {
    return (
      <div className="rounded-md border border-[#e2dfd8] bg-[#fbfaf8] p-4 text-center">
        <p className="text-sm font-semibold text-[#282342]">Auction Ended Unsold</p>
        <p className="mt-1 text-xs text-[#77747e]">
          No bids were placed before the closing time. The seller may re-list the item at any time.
        </p>
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className="rounded-md border border-[#e2dfd8] bg-[#fbfaf8] p-4 text-center">
        <p className="text-sm font-semibold text-[#625e69]">Listing Cancelled</p>
        <p className="mt-1 text-xs text-[#77747e]">This listing was cancelled by the seller.</p>
      </div>
    );
  }

  if (!sale) return null;

  async function handleApprove() {
    setLoadingAction("approve");
    setFeedback(null);
    try {
      const res = await approveSaleAction(listingId);
      if (res.success) setFeedback({ type: "success", message: res.message || "Approved!" });
      else setFeedback({ type: "error", message: res.message });
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleReject() {
    setLoadingAction("reject");
    setFeedback(null);
    try {
      const res = await rejectSaleAction(listingId);
      if (res.success) setFeedback({ type: "success", message: res.message || "Rejected." });
      else setFeedback({ type: "error", message: res.message });
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleConfirmHandover() {
    setLoadingAction("handover");
    setFeedback(null);
    try {
      const res = await confirmHandoverAction(listingId);
      if (res.success) setFeedback({ type: "success", message: res.message || "Handover confirmed!" });
      else setFeedback({ type: "error", message: res.message });
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleFailedPickup() {
    setLoadingAction("failed");
    setFeedback(null);
    try {
      const res = await reportFailedPickupAction(listingId);
      if (res.success) setFeedback({ type: "success", message: res.message || "Recorded failed pickup." });
      else setFeedback({ type: "error", message: res.message });
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="rounded-md border border-[#dedae5] bg-white p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-[#eeebe5] pb-3">
        <div className="flex items-center gap-2">
          <Handshake size={18} className="text-[#514879]" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-[#282342]">Post-Auction Sale Resolution</h3>
        </div>
        <span className="rounded bg-[#dedae5]/40 px-2 py-0.5 text-[11px] font-bold uppercase text-[#514879]">
          {sale.status.replaceAll("_", " ")}
        </span>
      </div>

      {feedback && (
        <div
          className={`flex items-start gap-2 rounded-md p-2.5 text-xs ${
            feedback.type === "success"
              ? "border border-green-200 bg-green-50 text-green-800"
              : "border border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {feedback.type === "success" ? <CheckCircle2 size={15} className="shrink-0 mt-0.5" /> : null}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Provisional Winner Info */}
      <div className="rounded-md bg-[#faf9f6] p-3 text-xs border border-[#eeebe5]">
        <div className="flex items-center justify-between">
          <span className="text-[#645f70]">Provisional Winner:</span>
          <span className="font-semibold text-[#282342]">{sale.winner_name}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[#645f70]">Winning Amount:</span>
          <span className="font-bold text-[#282342]">{formatPaiseAsINR(sale.winning_amount_paise)}</span>
        </div>
      </div>

      {/* Awaiting Seller Approval State */}
      {sale.status === "awaiting_seller_approval" && (
        <div className="space-y-3">
          {isSeller ? (
            <div className="space-y-2.5">
              <p className="text-xs text-[#635f6f]">
                The auction closed. Please review and approve or reject the final winning offer.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={loadingAction !== null}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-[#c9ef72] py-2 text-xs font-bold text-[#282342] transition hover:bg-[#d8f59a]"
                >
                  {loadingAction === "approve" ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  Approve Winning Price
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={loadingAction !== null}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-[#e0dad5] bg-white py-2 text-xs font-semibold text-[#8f3a2c] transition hover:bg-red-50"
                >
                  {loadingAction === "reject" ? <LoaderCircle size={14} className="animate-spin" /> : <XCircle size={14} />}
                  Reject Price
                </button>
              </div>
            </div>
          ) : isWinner ? (
            <p className="text-xs text-[#635f6f] bg-[#fbfaf8] p-3 rounded-md border border-[#eeebe5]">
              🎉 You are the provisional highest bidder! The seller must approve the winning price before campus handover can be scheduled.
            </p>
          ) : (
            <p className="text-xs text-[#77747e]">
              Auction concluded. Awaiting seller approval of the highest bid.
            </p>
          )}
        </div>
      )}

      {/* Reserved State - Handover Dual Confirmation */}
      {sale.status === "reserved" && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-[#282342]">
            Item reserved for campus handover. Meet up on campus and confirm below:
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className={`p-2 rounded border ${sale.seller_handover_confirmed_at ? "bg-[#eaf3d9] border-[#c0de94] text-[#3e5e1b]" : "bg-[#f8f7f5] border-[#e8e5df] text-[#77747e]"}`}>
              <p className="font-semibold">Seller Handover</p>
              <p className="text-[11px] mt-0.5">
                {sale.seller_handover_confirmed_at ? "✓ Confirmed" : "Pending confirmation"}
              </p>
            </div>

            <div className={`p-2 rounded border ${sale.buyer_handover_confirmed_at ? "bg-[#eaf3d9] border-[#c0de94] text-[#3e5e1b]" : "bg-[#f8f7f5] border-[#e8e5df] text-[#77747e]"}`}>
              <p className="font-semibold">Buyer Receipt</p>
              <p className="text-[11px] mt-0.5">
                {sale.buyer_handover_confirmed_at ? "✓ Confirmed" : "Pending confirmation"}
              </p>
            </div>
          </div>

          {(isSeller && !sale.seller_handover_confirmed_at) || (isWinner && !sale.buyer_handover_confirmed_at) ? (
            <button
              type="button"
              onClick={handleConfirmHandover}
              disabled={loadingAction !== null}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-[#514879] py-2.5 text-xs font-bold text-white transition hover:bg-[#40385f]"
            >
              {loadingAction === "handover" ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCircle size={15} />}
              Confirm Campus Handover
            </button>
          ) : null}

          {isSeller && (
            <button
              type="button"
              onClick={handleFailedPickup}
              disabled={loadingAction !== null}
              className="flex w-full items-center justify-center gap-1 text-[11px] text-[#8e4235] hover:underline"
            >
              <AlertTriangle size={12} />
              Buyer didn&apos;t show up? Report failed pickup
            </button>
          )}
        </div>
      )}

      {/* Completed State */}
      {sale.status === "completed" && (
        <div className="rounded-md bg-[#eaf3d9] p-3 text-xs text-[#3e5e1b] flex items-center gap-2 border border-[#c0de94]">
          <CheckCircle2 size={18} className="shrink-0" />
          <span>Sale completed! Confirmed campus handover by both students.</span>
        </div>
      )}

      {/* Rejected State */}
      {sale.status === "rejected" && (
        <div className="rounded-md bg-[#fdf0ed] p-3 text-xs text-[#903728] flex items-center gap-2 border border-[#f0c5be]">
          <XCircle size={18} className="shrink-0" />
          <span>The seller rejected the winning price. The item is unreserved.</span>
        </div>
      )}

      {/* Failed Pickup State */}
      {sale.status === "failed" && (
        <div className="rounded-md bg-[#fdf0ed] p-3 text-xs text-[#903728] flex items-center gap-2 border border-[#f0c5be]">
          <AlertTriangle size={18} className="shrink-0" />
          <span>Handover failed / cancelled. Outcome logged.</span>
        </div>
      )}
    </div>
  );
}
