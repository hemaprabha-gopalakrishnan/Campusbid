"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Bot, CheckCircle2, Gavel, LoaderCircle, Sparkles } from "lucide-react";
import { formatPaiseAsINR, paiseToRupees } from "@/lib/listings/money";
import { submitAutoBid, submitBid } from "@/lib/listings/bidding-actions";

type BidFormProps = {
  listingId: string;
  minNextBidPaise: string;
  isSeller: boolean;
  currentUserId: string | null;
  status: string;
};

export function BidForm({
  listingId,
  minNextBidPaise,
  isSeller,
  currentUserId,
  status,
}: BidFormProps) {
  const [mode, setMode] = useState<"standard" | "auto">("standard");
  const minRupees = Math.ceil(paiseToRupees(minNextBidPaise));
  const [customAmount, setCustomAmount] = useState<number>(minRupees);
  const [maxAmount, setMaxAmount] = useState<number>(minRupees + 100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  if (status !== "active") {
    return (
      <div className="rounded-md border border-[#e2dfd8] bg-[#fbfaf8] p-4 text-center">
        <p className="text-sm font-semibold text-[#282342]">Bidding Closed</p>
        <p className="mt-1 text-xs text-[#77747e]">This auction is no longer accepting new offers.</p>
      </div>
    );
  }

  if (isSeller) {
    return (
      <div className="rounded-md border border-[#e5e1eb] bg-[#f8f6fb] p-4 text-center">
        <p className="text-sm font-semibold text-[#514879]">You are the seller</p>
        <p className="mt-1 text-xs text-[#77747e]">
          To keep campus trades fair and honest, sellers cannot place bids on their own listings.
        </p>
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <div className="rounded-md border border-[#e6e3dd] bg-white p-5 text-center shadow-xs">
        <Gavel className="mx-auto size-7 text-[#514879]" aria-hidden="true" />
        <h3 className="mt-2 text-sm font-semibold text-[#282342]">Sign in to place a bid</h3>
        <p className="mt-1 text-xs text-[#77747e]">CampusBid requires student verification to bid.</p>
        <Link
          href={`/sign-in?redirect=/listings/${listingId}`}
          className="mt-3.5 inline-flex h-9 items-center gap-1.5 rounded-md bg-[#514879] px-4 text-xs font-semibold text-white transition hover:bg-[#40385f]"
        >
          Sign in to bid <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </div>
    );
  }

  async function handleStandardBid(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);
    try {
      const res = await submitBid(listingId, customAmount);
      if (res.success) {
        setFeedback({ type: "success", message: res.message ?? "Bid placed successfully!" });
      } else {
        setFeedback({ type: "error", message: res.message });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAutoBid(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);
    try {
      const res = await submitAutoBid(listingId, maxAmount);
      if (res.success) {
        setFeedback({ type: "success", message: res.message ?? "Auto-bid configured!" });
      } else {
        setFeedback({ type: "error", message: res.message });
      }
    } catch {
      setFeedback({ type: "error", message: "Network error. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-md border border-[#e2dfd8] bg-white p-4 shadow-xs">
      {/* Mode Selector */}
      <div className="flex border-b border-[#eeebe5] pb-3 gap-2">
        <button
          type="button"
          onClick={() => {
            setMode("standard");
            setFeedback(null);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition ${
            mode === "standard"
              ? "bg-[#514879] text-white"
              : "bg-[#f5f3f0] text-[#635f6f] hover:text-[#282342]"
          }`}
        >
          <Gavel size={14} aria-hidden="true" />
          Standard Bid
        </button>

        <button
          type="button"
          onClick={() => {
            setMode("auto");
            setFeedback(null);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition ${
            mode === "auto"
              ? "bg-[#514879] text-white"
              : "bg-[#f5f3f0] text-[#635f6f] hover:text-[#282342]"
          }`}
        >
          <Bot size={14} aria-hidden="true" />
          Automatic Bid
        </button>
      </div>

      {feedback && (
        <div
          className={`mt-3.5 flex items-start gap-2 rounded-md p-2.5 text-xs ${
            feedback.type === "success"
              ? "border border-green-200 bg-green-50 text-green-800"
              : "border border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-green-600" aria-hidden="true" />
          ) : null}
          <span>{feedback.message}</span>
        </div>
      )}

      {mode === "standard" ? (
        <form onSubmit={handleStandardBid} className="mt-3.5 space-y-3">
          <div>
            <label htmlFor="bid-amount" className="block text-xs font-medium text-[#4b4657]">
              Your Bid (Minimum: {formatPaiseAsINR(minNextBidPaise)})
            </label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-[#666270]">
                ₹
              </span>
              <input
                id="bid-amount"
                type="number"
                min={minRupees}
                step="1"
                value={customAmount}
                onChange={(e) => setCustomAmount(Math.max(minRupees, Number(e.target.value)))}
                className="h-10 w-full rounded-md border border-[#dcd7df] pl-8 pr-3 text-sm font-semibold text-[#282342] focus:border-[#514879] focus:outline-none focus:ring-1 focus:ring-[#514879]"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCustomAmount(minRupees)}
              className="rounded border border-[#e2dfd8] bg-[#faf9f6] px-2 py-1 text-[11px] font-medium text-[#514879] hover:bg-[#f2efe9]"
            >
              Exact Min: ₹{minRupees}
            </button>
            <button
              type="button"
              onClick={() => setCustomAmount(minRupees + 50)}
              className="rounded border border-[#e2dfd8] bg-[#faf9f6] px-2 py-1 text-[11px] font-medium text-[#514879] hover:bg-[#f2efe9]"
            >
              +₹50
            </button>
            <button
              type="button"
              onClick={() => setCustomAmount(minRupees + 100)}
              className="rounded border border-[#e2dfd8] bg-[#faf9f6] px-2 py-1 text-[11px] font-medium text-[#514879] hover:bg-[#f2efe9]"
            >
              +₹100
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || customAmount < minRupees}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#c9ef72] px-4 text-xs font-bold text-[#282342] transition hover:bg-[#d8f59a] disabled:opacity-50"
          >
            {isSubmitting ? <LoaderCircle size={15} className="animate-spin" /> : <Gavel size={15} />}
            {isSubmitting ? "Placing bid..." : `Place bid for ₹${customAmount}`}
          </button>
        </form>
      ) : (
        <form onSubmit={handleAutoBid} className="mt-3.5 space-y-3">
          <div className="rounded-md bg-[#faf9f6] p-2.5 text-[11px] leading-4 text-[#635f6f] border border-[#eeebe5]">
            <span className="font-semibold text-[#282342]">How proxy bidding works:</span> Set your maximum budget. CampusBid bids only as much as needed to keep you ahead, increment by increment.
          </div>

          <div>
            <label htmlFor="auto-max-amount" className="block text-xs font-medium text-[#4b4657]">
              Maximum Budget (Ceiling)
            </label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-[#666270]">
                ₹
              </span>
              <input
                id="auto-max-amount"
                type="number"
                min={minRupees}
                step="1"
                value={maxAmount}
                onChange={(e) => setMaxAmount(Math.max(minRupees, Number(e.target.value)))}
                className="h-10 w-full rounded-md border border-[#dcd7df] pl-8 pr-3 text-sm font-semibold text-[#282342] focus:border-[#514879] focus:outline-none focus:ring-1 focus:ring-[#514879]"
              />
            </div>
            <p className="mt-1 text-[11px] text-[#77747e]">
              Must be at least the next minimum bid of ₹{minRupees}.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || maxAmount < minRupees}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#514879] px-4 text-xs font-bold text-white transition hover:bg-[#40385f] disabled:opacity-50"
          >
            {isSubmitting ? <LoaderCircle size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {isSubmitting ? "Setting auto-bid..." : `Activate Auto-Bid up to ₹${maxAmount}`}
          </button>
        </form>
      )}
    </div>
  );
}
