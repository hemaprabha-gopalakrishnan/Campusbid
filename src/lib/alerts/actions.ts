"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getVerifiedClaims } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rupeesToPaise } from "@/lib/listings/money";
import { isListingMatchingAlert, type ListingToMatch, type WantedAlert } from "./matching";

export type WantedAlertActionResponse =
  | { success: true; message?: string }
  | { success: false; message: string };

const createAlertSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Alert keyword must be at least 2 characters.")
    .max(100, "Alert keyword cannot exceed 100 characters."),
  category: z.enum(["cycle", "calculator", "books", "electronics", "other"]).nullable().optional(),
  maxPriceRupees: z.number().positive("Enter a valid maximum price in ₹."),
});

async function requireUserId() {
  const claims = await getVerifiedClaims();
  return typeof claims?.sub === "string" ? claims.sub : null;
}

export async function createWantedAlert(
  title: string,
  category: string | null,
  maxPriceRupees: number,
): Promise<WantedAlertActionResponse> {
  const parsed = createAlertSchema.safeParse({ title, category, maxPriceRupees });
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message || "Invalid alert parameters." };
  }

  const userId = await requireUserId();
  if (!userId) return { success: false, message: "Sign in to set wanted item alerts." };

  const supabase = await createClient();
  const maxPricePaise = rupeesToPaise(parsed.data.maxPriceRupees);

  const { error } = await supabase.from("wanted_alerts").insert({
    user_id: userId,
    title: parsed.data.title,
    category: parsed.data.category || null,
    max_price_paise: maxPricePaise,
  });

  if (error) {
    return { success: false, message: "Could not save alert. Please try again." };
  }

  revalidatePath("/");
  return { success: true, message: `Alert created! We'll notify you when a matching "${parsed.data.title}" is listed.` };
}

export async function deleteWantedAlert(alertId: string): Promise<WantedAlertActionResponse> {
  const userId = await requireUserId();
  if (!userId) return { success: false, message: "Sign in to manage alerts." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("wanted_alerts")
    .delete()
    .eq("id", alertId)
    .eq("user_id", userId);

  if (error) {
    return { success: false, message: "Could not remove alert." };
  }

  revalidatePath("/");
  return { success: true, message: "Alert removed." };
}

export async function getUserWantedAlerts(): Promise<WantedAlert[]> {
  const userId = await requireUserId();
  if (!userId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("wanted_alerts")
    .select("id, user_id, title, category, max_price_paise")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    category: row.category,
    max_price_paise: String(row.max_price_paise),
  }));
}

export async function notifyMatchingAlertsForListing(listing: ListingToMatch) {
  try {
    const supabase = await createClient();

    // Query active alerts
    const { data: alerts } = await supabase
      .from("wanted_alerts")
      .select("id, user_id, title, category, max_price_paise");

    if (!alerts || alerts.length === 0) return;

    const matchedUserIds = new Set<string>();

    for (const alert of alerts) {
      if (isListingMatchingAlert(listing, alert)) {
        matchedUserIds.add(alert.user_id);
      }
    }

    if (matchedUserIds.size === 0) return;

    const notificationPayloads = Array.from(matchedUserIds).map((userId) => ({
      user_id: userId,
      event_type: "item_alert",
      listing_id: listing.id,
      message: `An item matching your alert was just listed: "${listing.title}"`,
    }));

    await supabase.from("notifications").insert(notificationPayloads);
  } catch (err) {
    console.error("Failed to process wanted alerts notification", err);
  }
}
