import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { paiseToRupees } from "@/lib/listings/money";

type AssistantRequestBody = {
  message: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AssistantRequestBody;
    const query = body.message?.toLowerCase().trim() || "";

    if (!query) {
      return NextResponse.json({
        reply: "Hi! I'm your campus marketplace assistant. You can ask me things like 'Find me a cycle under ₹2,000' or 'Look for engineering books'.",
        matchingListings: [],
      });
    }

    const supabase = await createClient();

    // 1. Extract price constraints
    const priceMatch = query.match(/(?:under|below|less than|up to|max|budget)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)?)/i);
    const maxPrice = priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : null;

    // 2. Extract category
    let category: string | null = null;
    if (query.includes("cycle") || query.includes("bike") || query.includes("bicycle")) {
      category = "cycle";
    } else if (query.includes("calc") || query.includes("calculator") || query.includes("casio")) {
      category = "calculator";
    } else if (query.includes("book") || query.includes("textbook") || query.includes("notes")) {
      category = "books";
    } else if (query.includes("laptop") || query.includes("electronics") || query.includes("phone") || query.includes("charger") || query.includes("keyboard")) {
      category = "electronics";
    }

    // 3. Extract keywords (remove common filler words)
    const fillerWords = new Set(["find", "me", "a", "an", "the", "under", "below", "up", "to", "for", "is", "there", "any", "looking", "want", "please", "search", "show", "get", "bid", "on"]);
    const words = query
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !fillerWords.has(w) && isNaN(Number(w)));

    // 4. Query active listings from Supabase
    let dbQuery = supabase
      .from("marketplace_listings")
      .select("id, title, category, condition, starting_price_paise, current_price_paise, min_increment_paise, ends_at, seller_name")
      .eq("status", "active")
      .gt("ends_at", new Date().toISOString());

    if (category) {
      dbQuery = dbQuery.eq("category", category);
    }

    const { data: listings } = await dbQuery.limit(20);

    // Filter in-memory for keywords and price
    const filtered = (listings ?? []).filter((item) => {
      const priceRupees = paiseToRupees(item.current_price_paise || item.starting_price_paise);
      if (maxPrice !== null && priceRupees > maxPrice) {
        return false;
      }

      if (words.length > 0) {
        const titleLower = item.title.toLowerCase();
        return words.some((kw) => titleLower.includes(kw));
      }

      return true;
    });

    // Check for bidding intention (e.g., "bid 500 on Java book")
    let proposedBid: {
      listingId: string;
      listingTitle: string;
      amountRupees: number;
      minRequiredRupees: number;
    } | null = null;

    if (query.includes("bid") && filtered.length > 0) {
      const targetListing = filtered[0];
      const currentPrice = paiseToRupees(targetListing.current_price_paise);
      const minInc = paiseToRupees(targetListing.min_increment_paise);
      const minReq = Math.ceil(currentPrice + minInc);

      const bidAmountMatch = query.match(/bid\s*(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)?)/i);
      const requestedBid = bidAmountMatch ? Number(bidAmountMatch[1].replace(/,/g, "")) : minReq;

      proposedBid = {
        listingId: targetListing.id,
        listingTitle: targetListing.title,
        amountRupees: Math.max(requestedBid, minReq),
        minRequiredRupees: minReq,
      };
    }

    // Build friendly, straightforward response
    let reply = "";
    if (filtered.length === 0) {
      reply = `I searched all current active campus listings, but couldn't find any ${
        category ? category : "items"
      }${maxPrice ? ` under ₹${maxPrice}` : ""}. You can set a Wanted Alert so you're notified the moment a senior lists one!`;
    } else {
      reply = `I found ${filtered.length} active ${filtered.length === 1 ? "listing" : "listings"}${
        maxPrice ? ` under ₹${maxPrice}` : ""
      }:`;

      if (proposedBid) {
        reply += ` To place a bid on "${proposedBid.listingTitle}", please review and confirm the proposed bid below. I will never place a bid without your explicit confirmation.`;
      }
    }

    return NextResponse.json({
      reply,
      matchingListings: filtered.slice(0, 4).map((item) => ({
        id: item.id,
        title: item.title,
        category: item.category,
        condition: item.condition,
        currentPriceRupees: paiseToRupees(item.current_price_paise),
        endsAt: item.ends_at,
        sellerName: item.seller_name,
      })),
      proposedBid,
    });
  } catch (err) {
    console.error("AI assistant error", err);
    return NextResponse.json(
      { reply: "Sorry, I ran into an error reading marketplace listings. Please try again in a moment.", matchingListings: [] },
      { status: 500 },
    );
  }
}
