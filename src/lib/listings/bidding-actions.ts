"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getVerifiedClaims } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rupeesToPaise } from "./money";

const uuidSchema = z.string().uuid("Invalid listing ID.");

export type ActionResponse =
  | { success: true; message?: string; extended?: boolean }
  | { success: false; message: string };

async function requireUserId() {
  const claims = await getVerifiedClaims();
  return typeof claims?.sub === "string" ? claims.sub : null;
}

export async function submitBid(listingId: string, amountRupees: number): Promise<ActionResponse> {
  const idCheck = uuidSchema.safeParse(listingId);
  if (!idCheck.success) return { success: false, message: "Invalid listing." };

  const userId = await requireUserId();
  if (!userId) return { success: false, message: "Sign in to place a bid." };

  if (typeof amountRupees !== "number" || amountRupees <= 0 || isNaN(amountRupees)) {
    return { success: false, message: "Enter a valid bid amount." };
  }

  const supabase = await createClient();
  const amountPaise = rupeesToPaise(amountRupees);

  const { data, error } = await supabase.rpc("place_bid", {
    p_listing_id: listingId,
    p_amount_paise: amountPaise,
  });

  if (error) {
    if (error.message.includes("auction_closed")) return { success: false, message: "This auction has already closed." };
    if (error.message.includes("seller_cannot_bid")) return { success: false, message: "Sellers cannot bid on their own listings." };
    if (error.message.includes("bid_below_minimum")) return { success: false, message: "Bid is below the required minimum increment." };
    return { success: false, message: error.message || "Failed to place bid. Please try again." };
  }

  const extended = Array.isArray(data) ? Boolean(data[0]?.extended) : Boolean((data as { extended?: boolean })?.extended);

  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/");
  return {
    success: true,
    extended,
    message: extended ? "Bid placed! Deadline extended by 60s due to late bid." : "Bid placed successfully!",
  };
}

export async function submitAutoBid(listingId: string, maxAmountRupees: number): Promise<ActionResponse> {
  const idCheck = uuidSchema.safeParse(listingId);
  if (!idCheck.success) return { success: false, message: "Invalid listing." };

  const userId = await requireUserId();
  if (!userId) return { success: false, message: "Sign in to set an automatic bid." };

  if (typeof maxAmountRupees !== "number" || maxAmountRupees <= 0 || isNaN(maxAmountRupees)) {
    return { success: false, message: "Enter a valid maximum bid amount." };
  }

  const supabase = await createClient();
  const maxAmountPaise = rupeesToPaise(maxAmountRupees);

  const { data, error } = await supabase.rpc("place_auto_bid", {
    p_listing_id: listingId,
    p_max_amount_paise: maxAmountPaise,
  });

  if (error) {
    if (error.message.includes("auction_closed")) return { success: false, message: "This auction has already closed." };
    if (error.message.includes("seller_cannot_bid")) return { success: false, message: "Sellers cannot bid on their own listings." };
    if (error.message.includes("bid_below_minimum")) return { success: false, message: "Your maximum must be at least the next minimum bid." };
    return { success: false, message: error.message || "Failed to configure auto-bid." };
  }

  const extended = Array.isArray(data) ? Boolean(data[0]?.extended) : Boolean((data as { extended?: boolean })?.extended);

  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/");
  return {
    success: true,
    extended,
    message: extended
      ? "Auto-bid active! Deadline extended by 60s due to late bid."
      : "Automatic bid configured! CampusBid will bid for you up to your maximum.",
  };
}

export async function closeAuctionAction(listingId: string): Promise<ActionResponse> {
  const idCheck = uuidSchema.safeParse(listingId);
  if (!idCheck.success) return { success: false, message: "Invalid listing." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("close_expired_auction", { p_listing_id: listingId });

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/");
  return { success: true, message: "Auction status updated." };
}

export async function approveSaleAction(listingId: string): Promise<ActionResponse> {
  const idCheck = uuidSchema.safeParse(listingId);
  if (!idCheck.success) return { success: false, message: "Invalid listing." };

  const userId = await requireUserId();
  if (!userId) return { success: false, message: "Sign in to approve this sale." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_winning_sale", { p_listing_id: listingId });

  if (error) {
    return { success: false, message: error.message || "Could not approve sale." };
  }

  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/my-listings");
  return { success: true, message: "Winning price approved! Item is reserved for campus handover." };
}

export async function rejectSaleAction(listingId: string): Promise<ActionResponse> {
  const idCheck = uuidSchema.safeParse(listingId);
  if (!idCheck.success) return { success: false, message: "Invalid listing." };

  const userId = await requireUserId();
  if (!userId) return { success: false, message: "Sign in to reject this price." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_winning_sale", { p_listing_id: listingId });

  if (error) {
    return { success: false, message: error.message || "Could not reject sale." };
  }

  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/my-listings");
  return { success: true, message: "Winning price rejected. Auction ended with clear outcome." };
}

export async function confirmHandoverAction(listingId: string): Promise<ActionResponse> {
  const idCheck = uuidSchema.safeParse(listingId);
  if (!idCheck.success) return { success: false, message: "Invalid listing." };

  const userId = await requireUserId();
  if (!userId) return { success: false, message: "Sign in to confirm handover." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("confirm_handover", { p_listing_id: listingId });

  if (error) {
    return { success: false, message: error.message || "Failed to confirm handover." };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const isComplete = row?.status === "completed";

  revalidatePath(`/listings/${listingId}`);
  return {
    success: true,
    message: isComplete
      ? "Both parties confirmed! Sale successfully completed."
      : "Your handover confirmation recorded. Awaiting other party.",
  };
}

export async function reportFailedPickupAction(listingId: string): Promise<ActionResponse> {
  const idCheck = uuidSchema.safeParse(listingId);
  if (!idCheck.success) return { success: false, message: "Invalid listing." };

  const userId = await requireUserId();
  if (!userId) return { success: false, message: "Sign in to report failed pickup." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("report_failed_pickup", { p_listing_id: listingId });

  if (error) {
    return { success: false, message: error.message || "Failed to update sale status." };
  }

  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/my-listings");
  return { success: true, message: "Failed pickup recorded. You can now re-list the item." };
}
