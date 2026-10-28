"use server";

import { revalidatePath } from "next/cache";
import { getVerifiedClaims } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type NotificationItem = {
  id: string;
  user_id: string;
  event_type: string;
  listing_id: string | null;
  message: string;
  read_at: string | null;
  created_at: string;
};

async function requireUserId() {
  const claims = await getVerifiedClaims();
  return typeof claims?.sub === "string" ? claims.sub : null;
}

export async function getNotifications(): Promise<NotificationItem[]> {
  const userId = await requireUserId();
  if (!userId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  return (data ?? []).map((n) => ({
    id: n.id,
    user_id: n.user_id,
    event_type: n.event_type,
    listing_id: n.listing_id,
    message: n.message,
    read_at: n.read_at,
    created_at: n.created_at,
  }));
}

export async function markNotificationsRead(id?: string) {
  const userId = await requireUserId();
  if (!userId) return;

  const supabase = await createClient();
  let query = supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);

  if (id) {
    query = query.eq("id", id);
  }

  await query;
  revalidatePath("/");
}
