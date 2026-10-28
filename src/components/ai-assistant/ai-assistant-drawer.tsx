"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Bot, Check, Gavel, LoaderCircle, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import { submitBid } from "@/lib/listings/bidding-actions";

type ListingMatch = {
  id: string;
  title: string;
  category: string;
  condition: string;
  currentPriceRupees: number;
  endsAt: string;
  sellerName: string;
};

type ProposedBid = {
  listingId: string;
  listingTitle: string;
  amountRupees: number;
  minRequiredRupees: number;
};

type ChatMessage = {
  id: string;
  sender: "user" | "assistant";
  text: string;
  listings?: ListingMatch[];
  proposedBid?: ProposedBid | null;
};

type AIAssistantDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

const promptSuggestions = [
  "🚲 Find me a cycle under ₹2,000",
  "🔢 Scientific calculator under ₹500",
  "📚 Computer science & algorithms books",
  "⚡ What's ending soon?",
];

export function AIAssistantDrawer({ isOpen, onClose }: AIAssistantDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Hello! I'm your campus marketplace assistant. Tell me what you're looking for (e.g., 'find me a cycle under ₹2,000' or 'scientific calculator'). I can also help place a confirmed bid for you.",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [biddingListingId, setBiddingListingId] = useState<string | null>(null);
  const [bidSuccessMessage, setBidSuccessMessage] = useState<string | null>(null);

  async function handleSend(promptText?: string) {
    const textToSend = promptText || inputText;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: "user",
      text: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);
    setBidSuccessMessage(null);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend }),
      });

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: "assistant",
        text: data.reply || "Here is what I found on campus:",
        listings: data.matchingListings || [],
        proposedBid: data.proposedBid || null,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: "assistant",
          text: "I couldn't reach the campus catalog. Please check your connection and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmBid(bid: ProposedBid) {
    setBiddingListingId(bid.listingId);
    setBidSuccessMessage(null);
    try {
      const res = await submitBid(bid.listingId, bid.amountRupees);
      if (res.success) {
        setBidSuccessMessage(`Bid of ₹${bid.amountRupees} placed successfully on "${bid.listingTitle}"!`);
      } else {
        setBidSuccessMessage(`Could not bid: ${res.message}`);
      }
    } catch {
      setBidSuccessMessage("Failed to place bid. Please try again.");
    } finally {
      setBiddingListingId(null);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs">
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e2dfd8] px-5 py-4 bg-[#fbfaf8]">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-md bg-[#514879] text-white">
              <Sparkles size={18} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#282342]">CampusBid AI Assistant</h2>
              <div className="flex items-center gap-1 text-[11px] text-[#425d1e]">
                <ShieldCheck size={12} />
                <span>Plays by campus rules · Confirmed actions only</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close assistant"
            className="grid size-8 place-items-center rounded-md text-[#77747e] hover:bg-[#f0eee8]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f7f6f2]/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-3 text-xs leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-[#514879] text-white"
                    : "border border-[#e2dfd8] bg-white text-[#282342] shadow-xs"
                }`}
              >
                {msg.text}
              </div>

              {/* Matching listing cards */}
              {msg.listings && msg.listings.length > 0 && (
                <div className="mt-2.5 w-full space-y-2">
                  {msg.listings.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-md border border-[#e2dfd8] bg-white p-2.5 text-xs shadow-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-[#282342] truncate">{item.title}</p>
                        <p className="text-[11px] text-[#77747e]">
                          Leading: <strong className="text-[#282342]">₹{item.currentPriceRupees}</strong> · By {item.sellerName}
                        </p>
                      </div>
                      <Link
                        href={`/listings/${item.id}`}
                        onClick={onClose}
                        className="inline-flex shrink-0 items-center gap-1 rounded bg-[#f5f3f8] px-2.5 py-1 text-[11px] font-semibold text-[#514879] hover:bg-[#eae5f3]"
                      >
                        View <ArrowRight size={11} />
                      </Link>
                    </div>
                  ))}
                </div>
              )}

              {/* Proposed Bid Confirmation Card */}
              {msg.proposedBid && (
                <div className="mt-2.5 w-full rounded-md border border-[#c9ef72] bg-[#f9fde8] p-3 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-[#282342]">
                    <Gavel size={14} className="text-[#514879]" />
                    <span>Proposed Action: Bid ₹{msg.proposedBid.amountRupees}</span>
                  </div>
                  <p className="text-[11px] text-[#635f6f]">
                    Item: <strong>{msg.proposedBid.listingTitle}</strong>
                  </p>
                  <p className="text-[10px] text-[#77747e]">
                    Requires your go-ahead. Will not place the bid without clicking confirm.
                  </p>

                  {bidSuccessMessage ? (
                    <p className="text-xs font-semibold text-[#3d601b] flex items-center gap-1">
                      <Check size={14} /> {bidSuccessMessage}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleConfirmBid(msg.proposedBid!)}
                      disabled={biddingListingId !== null}
                      className="flex h-8 w-full items-center justify-center gap-1.5 rounded bg-[#514879] px-3 font-bold text-white hover:bg-[#40385f] disabled:opacity-50"
                    >
                      {biddingListingId ? (
                        <LoaderCircle size={13} className="animate-spin" />
                      ) : (
                        <Check size={13} />
                      )}
                      Confirm & Place Bid of ₹{msg.proposedBid.amountRupees}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 rounded-lg border border-[#e2dfd8] bg-white p-3 text-xs text-[#77747e] w-fit">
              <LoaderCircle size={14} className="animate-spin text-[#514879]" />
              <span>Checking campus listings...</span>
            </div>
          )}
        </div>

        {/* Quick prompt suggestions */}
        <div className="border-t border-[#eeebe5] bg-white p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#77747e] mb-1.5 px-1">
            Quick Ask
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {promptSuggestions.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleSend(prompt)}
                className="shrink-0 rounded-full border border-[#e2dfd8] bg-[#faf9f6] px-2.5 py-1 text-[11px] font-medium text-[#514879] hover:bg-[#f2efe9]"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="border-t border-[#e2dfd8] bg-white p-3 flex gap-2"
        >
          <input
            type="text"
            placeholder="Ask anything, e.g. 'find cycle under 2000'..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 rounded-md border border-[#dcd7df] bg-white px-3 py-2 text-xs text-[#282342] focus:border-[#514879] focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            aria-label="Send message"
            className="grid size-9 place-items-center rounded-md bg-[#514879] text-white hover:bg-[#40385f] disabled:opacity-50"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
