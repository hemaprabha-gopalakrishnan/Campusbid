"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getVerifiedClaims } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type QuestionActionResponse =
  | { success: true; message?: string }
  | { success: false; message: string };

const askSchema = z.object({
  listingId: z.string().uuid(),
  body: z
    .string()
    .trim()
    .min(5, "Question must be at least 5 characters.")
    .max(1000, "Question cannot exceed 1000 characters."),
});

const answerSchema = z.object({
  questionId: z.string().uuid(),
  listingId: z.string().uuid(),
  answer: z
    .string()
    .trim()
    .min(2, "Answer must be at least 2 characters.")
    .max(1000, "Answer cannot exceed 1000 characters."),
});

async function requireUserId() {
  const claims = await getVerifiedClaims();
  return typeof claims?.sub === "string" ? claims.sub : null;
}

export async function askQuestion(listingId: string, body: string): Promise<QuestionActionResponse> {
  const parsed = askSchema.safeParse({ listingId, body });
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message || "Invalid question." };
  }

  const userId = await requireUserId();
  if (!userId) return { success: false, message: "Sign in to ask a question." };

  const supabase = await createClient();

  // Check listing is active and user is not seller
  const { data: listing } = await supabase
    .from("listings")
    .select("seller_id, status")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing || listing.status !== "active") {
    return { success: false, message: "Questions can only be asked on active auctions." };
  }

  if (listing.seller_id === userId) {
    return { success: false, message: "Sellers cannot ask questions on their own listing." };
  }

  // Anti-spam duplicate check: prevent identical question within last 1 hour
  const { data: duplicates } = await supabase
    .from("questions")
    .select("id")
    .eq("listing_id", listingId)
    .eq("asker_id", userId)
    .ilike("body", parsed.data.body)
    .limit(1);

  if (duplicates && duplicates.length > 0) {
    return { success: false, message: "You already asked this question on this auction." };
  }

  const { error } = await supabase.from("questions").insert({
    listing_id: listingId,
    asker_id: userId,
    body: parsed.data.body,
  });

  if (error) {
    return { success: false, message: "Could not submit question. Please try again." };
  }

  // Notify seller
  await supabase.from("notifications").insert({
    user_id: listing.seller_id,
    event_type: "question_asked",
    listing_id: listingId,
    message: "A buyer asked a question about your item condition.",
  });

  revalidatePath(`/listings/${listingId}`);
  return { success: true, message: "Question posted publicly!" };
}

export async function answerQuestion(
  questionId: string,
  listingId: string,
  answer: string,
): Promise<QuestionActionResponse> {
  const parsed = answerSchema.safeParse({ questionId, listingId, answer });
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message || "Invalid answer." };
  }

  const userId = await requireUserId();
  if (!userId) return { success: false, message: "Sign in to answer questions." };

  const supabase = await createClient();

  // Verify caller is the seller of the listing
  const { data: listing } = await supabase
    .from("listings")
    .select("seller_id")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing || listing.seller_id !== userId) {
    return { success: false, message: "Only the seller can answer questions for this listing." };
  }

  // Update question
  const { data: q, error } = await supabase
    .from("questions")
    .update({
      answer: parsed.data.answer,
      answered_at: new Date().toISOString(),
    })
    .eq("id", questionId)
    .select("asker_id")
    .maybeSingle();

  if (error || !q) {
    return { success: false, message: "Failed to post answer." };
  }

  // Notify asker
  await supabase.from("notifications").insert({
    user_id: q.asker_id,
    event_type: "question_answered",
    listing_id: listingId,
    message: "The seller answered your question on the auction.",
  });

  revalidatePath(`/listings/${listingId}`);
  return { success: true, message: "Answer published!" };
}
