"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, HelpCircle, LoaderCircle, MessageSquare, Send } from "lucide-react";
import { answerQuestion, askQuestion } from "@/lib/questions/actions";
import type { ListingQuestion } from "@/lib/listings/detail-query";

type ListingQAProps = {
  listingId: string;
  questions: ListingQuestion[];
  isSeller: boolean;
  currentUserId: string | null;
  status: string;
};

export function ListingQA({
  listingId,
  questions,
  isSeller,
  currentUserId,
  status,
}: ListingQAProps) {
  const [newQuestion, setNewQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [askFeedback, setAskFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    setAskFeedback(null);
    setIsAsking(true);
    try {
      const res = await askQuestion(listingId, newQuestion);
      if (res.success) {
        setNewQuestion("");
        setAskFeedback({ type: "success", message: res.message || "Question posted!" });
      } else {
        setAskFeedback({ type: "error", message: res.message });
      }
    } finally {
      setIsAsking(false);
    }
  }

  async function handleAnswer(questionId: string) {
    if (!answerText.trim()) return;
    setIsAnswering(true);
    try {
      const res = await answerQuestion(questionId, listingId, answerText);
      if (res.success) {
        setAnsweringId(null);
        setAnswerText("");
      }
    } finally {
      setIsAnswering(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[#e6e3dd] pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={17} className="text-[#514879]" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-[#282342]">Questions & Answers ({questions.length})</h3>
        </div>
        <span className="text-[11px] text-[#77747e]">Public clarifications before bidding</span>
      </div>

      {/* Ask Question Form */}
      {status === "active" && !isSeller && (
        <div className="rounded-md border border-[#e2dfd8] bg-[#fbfaf8] p-3.5">
          {currentUserId ? (
            <form onSubmit={handleAsk} className="space-y-2.5">
              <label htmlFor="qa-input" className="block text-xs font-semibold text-[#3b3647]">
                Ask the seller a question
              </label>
              <p className="text-[11px] text-[#77747e]">
                Does the cycle’s brake work? Is display faded? Are textbook pages marked?
              </p>
              <textarea
                id="qa-input"
                rows={2}
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Type your question for the seller..."
                className="w-full rounded-md border border-[#dcd7df] bg-white p-2.5 text-xs text-[#282342] focus:border-[#514879] focus:outline-none focus:ring-1 focus:ring-[#514879]"
              />

              {askFeedback && (
                <p
                  className={`text-xs ${
                    askFeedback.type === "success" ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {askFeedback.message}
                </p>
              )}

              <button
                type="submit"
                disabled={isAsking || newQuestion.trim().length < 5}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#514879] px-3 text-xs font-semibold text-white transition hover:bg-[#40385f] disabled:opacity-50"
              >
                {isAsking ? <LoaderCircle size={13} className="animate-spin" /> : <Send size={13} />}
                Ask publicly
              </button>
            </form>
          ) : (
            <div className="text-center py-2">
              <p className="text-xs text-[#77747e]">
                Have questions before bidding?{" "}
                <Link
                  href={`/sign-in?redirect=/listings/${listingId}`}
                  className="font-semibold text-[#514879] underline underline-offset-2"
                >
                  Sign in to ask the seller
                </Link>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Questions List */}
      {questions.length === 0 ? (
        <p className="py-6 text-center text-xs text-[#77747e]">
          No questions asked yet. Ask the seller about the item&apos;s condition before placing a bid.
        </p>
      ) : (
        <div className="space-y-3.5">
          {questions.map((q) => (
            <div
              key={q.id}
              className="rounded-md border border-[#eeebe5] bg-white p-3.5 text-xs space-y-2"
            >
              <div className="flex items-start gap-2">
                <HelpCircle size={14} className="mt-0.5 shrink-0 text-[#77747e]" aria-hidden="true" />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-[11px] text-[#77747e]">
                    <span className="font-medium text-[#282342]">{q.asker_name} asked:</span>
                    <span>{new Date(q.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
                  </div>
                  <p className="mt-1 font-medium text-[#3b3647]">{q.body}</p>
                </div>
              </div>

              {/* Answer block */}
              {q.answer ? (
                <div className="ml-5 rounded bg-[#f7f5f9] p-2.5 text-xs border border-[#eae6f0] space-y-1">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-[#514879]">
                    <Check size={12} />
                    <span>Seller Answer:</span>
                  </div>
                  <p className="text-[#3b3647]">{q.answer}</p>
                </div>
              ) : isSeller ? (
                <div className="ml-5 pt-1">
                  {answeringId === q.id ? (
                    <div className="space-y-2">
                      <textarea
                        rows={2}
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        placeholder="Write your answer..."
                        className="w-full rounded border border-[#dcd7df] p-2 text-xs text-[#282342]"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleAnswer(q.id)}
                          disabled={isAnswering || answerText.trim().length < 2}
                          className="rounded bg-[#514879] px-3 py-1 text-xs font-semibold text-white hover:bg-[#40385f] disabled:opacity-50"
                        >
                          {isAnswering ? "Publishing..." : "Publish Answer"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAnsweringId(null);
                            setAnswerText("");
                          }}
                          className="rounded border border-[#e2dfd8] px-2.5 py-1 text-xs text-[#635f6f]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAnsweringId(q.id);
                        setAnswerText("");
                      }}
                      className="text-xs font-semibold text-[#514879] hover:underline"
                    >
                      Answer this question →
                    </button>
                  )}
                </div>
              ) : (
                <p className="ml-5 text-[11px] italic text-[#8e8a96]">Pending seller response</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
