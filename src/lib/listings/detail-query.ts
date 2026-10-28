import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getVerifiedClaims } from "@/lib/auth";
import type { ListingCategory, ListingCondition } from "./query-types";

export type ListingDetailImage = {
  id: string;
  storage_path: string;
  url: string;
  position: number;
};

export type ListingBid = {
  id: string;
  bidder_id: string;
  bidder_name: string;
  amount_paise: string;
  created_at: string;
};

export type ListingAutoBid = {
  id: string;
  bidder_id: string;
  bidder_name: string;
  max_amount_paise: string;
  created_at: string;
};

export type ListingQuestion = {
  id: string;
  asker_id: string;
  asker_name: string;
  body: string;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
};

export type ListingSale = {
  id: string;
  status: "awaiting_seller_approval" | "reserved" | "completed" | "rejected" | "failed";
  winner_id: string;
  winner_name: string;
  winning_amount_paise: string;
  seller_handover_confirmed_at: string | null;
  buyer_handover_confirmed_at: string | null;
};

export type ListingDetail = {
  id: string;
  seller_id: string;
  seller_name: string;
  title: string;
  category: ListingCategory;
  description: string;
  condition: ListingCondition;
  starting_price_paise: string;
  min_increment_paise: string;
  ends_at: string;
  status: string;
  created_at: string;
  images: ListingDetailImage[];
  bids: ListingBid[];
  auto_bids: ListingAutoBid[];
  questions: ListingQuestion[];
  sale: ListingSale | null;
  current_user_id: string | null;
  is_seller: boolean;
  is_winner: boolean;
  current_price_paise: string;
  minimum_next_bid_paise: string;
};

export async function getListingDetail(listingId: string): Promise<ListingDetail | null> {
  const supabase = await createClient();
  const claims = await getVerifiedClaims().catch(() => null);
  const currentUserId = typeof claims?.sub === "string" ? claims.sub : null;

  // 1. Fetch listing
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .maybeSingle();

  if (listingError || !listing) {
    return null;
  }

  // Auto-close expired active auction if deadline has passed
  if (listing.status === "active" && new Date(listing.ends_at) <= new Date()) {
    try {
      const { data: newStatus } = await supabase.rpc("close_expired_auction", { p_listing_id: listingId });
      if (newStatus) {
        listing.status = newStatus;
      }
    } catch {
      // Fallback: continue reading
    }
  }

  // 2. Fetch photos
  const { data: imageRows } = await supabase
    .from("listing_images")
    .select("id, storage_path, position")
    .eq("listing_id", listingId)
    .order("position", { ascending: true });

  const images: ListingDetailImage[] = (imageRows ?? []).map((img) => ({
    id: img.id,
    storage_path: img.storage_path,
    position: img.position,
    url: supabase.storage.from("listing-images").getPublicUrl(img.storage_path).data.publicUrl,
  }));

  // 3. Fetch bids with bidder profiles
  const { data: bidRows } = await supabase
    .from("bids")
    .select("id, bidder_id, amount_paise, created_at, profiles!bids_bidder_id_fkey(display_name)")
    .eq("listing_id", listingId)
    .order("amount_paise", { ascending: false })
    .order("created_at", { ascending: true });

  const bids: ListingBid[] = (bidRows ?? []).map((b) => {
    const profile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
    return {
      id: b.id,
      bidder_id: b.bidder_id,
      bidder_name: (profile as { display_name?: string } | null)?.display_name ?? "Campus student",
      amount_paise: String(b.amount_paise),
      created_at: b.created_at,
    };
  });

  // 4. Fetch auto-bids (public maximums)
  const { data: autoBidRows } = await supabase
    .from("auto_bids")
    .select("id, bidder_id, max_amount_paise, created_at, profiles!auto_bids_bidder_id_fkey(display_name)")
    .eq("listing_id", listingId)
    .order("max_amount_paise", { ascending: false });

  const autoBids: ListingAutoBid[] = (autoBidRows ?? []).map((ab) => {
    const profile = Array.isArray(ab.profiles) ? ab.profiles[0] : ab.profiles;
    return {
      id: ab.id,
      bidder_id: ab.bidder_id,
      bidder_name: (profile as { display_name?: string } | null)?.display_name ?? "Campus student",
      max_amount_paise: String(ab.max_amount_paise),
      created_at: ab.created_at,
    };
  });

  // 5. Fetch seller profile
  const { data: sellerProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", listing.seller_id)
    .maybeSingle();

  // 6. Fetch questions
  const { data: questionRows } = await supabase
    .from("questions")
    .select("id, asker_id, body, answer, answered_at, created_at, profiles!questions_asker_id_fkey(display_name)")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false });

  const questions: ListingQuestion[] = (questionRows ?? []).map((q) => {
    const profile = Array.isArray(q.profiles) ? q.profiles[0] : q.profiles;
    return {
      id: q.id,
      asker_id: q.asker_id,
      asker_name: (profile as { display_name?: string } | null)?.display_name ?? "Student",
      body: q.body,
      answer: q.answer,
      answered_at: q.answered_at,
      created_at: q.created_at,
    };
  });

  // 7. Fetch sale details if applicable
  let sale: ListingSale | null = null;
  const { data: saleRow } = await supabase
    .from("sales")
    .select("id, status, winner_id, winning_amount_paise, seller_handover_confirmed_at, buyer_handover_confirmed_at, profiles!sales_winner_id_fkey(display_name)")
    .eq("listing_id", listingId)
    .maybeSingle();

  if (saleRow) {
    const winnerProfile = Array.isArray(saleRow.profiles) ? saleRow.profiles[0] : saleRow.profiles;
    sale = {
      id: saleRow.id,
      status: saleRow.status,
      winner_id: saleRow.winner_id,
      winner_name: (winnerProfile as { display_name?: string } | null)?.display_name ?? "Winner",
      winning_amount_paise: String(saleRow.winning_amount_paise),
      seller_handover_confirmed_at: saleRow.seller_handover_confirmed_at,
      buyer_handover_confirmed_at: saleRow.buyer_handover_confirmed_at,
    };
  }

  const currentPricePaise = bids.length > 0
    ? bids[0].amount_paise
    : String(listing.starting_price_paise);

  const minNextPaise = bids.length > 0
    ? String(BigInt(currentPricePaise) + BigInt(listing.min_increment_paise))
    : String(listing.starting_price_paise);

  const isSeller = currentUserId !== null && currentUserId === listing.seller_id;
  const isWinner = (sale && currentUserId === sale.winner_id) || (bids.length > 0 && currentUserId === bids[0].bidder_id);

  return {
    id: listing.id,
    seller_id: listing.seller_id,
    seller_name: sellerProfile?.display_name ?? "Campus student",
    title: listing.title,
    category: listing.category as ListingCategory,
    description: listing.description,
    condition: listing.condition as ListingCondition,
    starting_price_paise: String(listing.starting_price_paise),
    min_increment_paise: String(listing.min_increment_paise),
    ends_at: listing.ends_at,
    status: listing.status,
    created_at: listing.created_at,
    images,
    bids,
    auto_bids: autoBids,
    questions,
    sale,
    current_user_id: currentUserId,
    is_seller: isSeller,
    is_winner: Boolean(isWinner),
    current_price_paise: currentPricePaise,
    minimum_next_bid_paise: minNextPaise,
  };
}
