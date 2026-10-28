"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getVerifiedClaims } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rupeesToPaise } from "./money";
import { detectImageContentType, listingInputSchema, MAX_LISTING_PHOTOS, MAX_PHOTO_SIZE_BYTES } from "./validation";

const BUCKET = "listing-images";
const UUID_FILE_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i;

export type ListingActionResult =
  | { success: true; listingId: string }
  | { success: false; message: string; fieldErrors?: Record<string, string[]> };

function parseListingInput(formData: FormData) {
  return listingInputSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    description: formData.get("description"),
    condition: formData.get("condition"),
    startingPrice: formData.get("startingPrice"),
    minIncrement: formData.get("minIncrement"),
    endsAt: formData.get("endsAt"),
  });
}

function readImagePaths(formData: FormData) {
  return formData.getAll("imagePaths").filter((path): path is string => typeof path === "string");
}

async function validateUploadedPhotos(userId: string, paths: string[]) {
  if (paths.length < 1 || paths.length > MAX_LISTING_PHOTOS) {
    return "Add between 1 and 3 photos.";
  }

  const fileNames: string[] = [];
  for (const path of paths) {
    const [ownerId, fileName, extra] = path.split("/");
    if (ownerId !== userId || !fileName || extra || !UUID_FILE_NAME.test(fileName)) {
      return "One or more uploaded photos are invalid.";
    }
    fileNames.push(fileName);
  }

  if (new Set(paths).size !== paths.length) {
    return "Each photo must be unique.";
  }

  const supabase = await createClient();
  const storage = supabase.storage.from(BUCKET);

  for (let index = 0; index < paths.length; index += 1) {
    const { data: photo, error } = await storage.download(paths[index]);
    if (error || !photo || photo.size <= 0 || photo.size > MAX_PHOTO_SIZE_BYTES) {
      return "Each photo must be smaller than 5 MB.";
    }

    const header = new Uint8Array(await photo.slice(0, 12).arrayBuffer());
    const detectedType = detectImageContentType(header);
    const pathType = paths[index].endsWith(".jpg")
      ? "image/jpeg"
      : paths[index].endsWith(".png")
        ? "image/png"
        : "image/webp";

    if (!detectedType || detectedType !== pathType || (photo.type && photo.type !== detectedType)) {
      return "Use valid JPG, PNG, or WebP image files.";
    }
  }

  return null;
}

async function requireUserId() {
  const claims = await getVerifiedClaims();
  return typeof claims?.sub === "string" ? claims.sub : null;
}

function revalidateListings() {
  revalidatePath("/");
  revalidatePath("/my-listings");
}

export async function createListing(formData: FormData): Promise<ListingActionResult> {
  const userId = await requireUserId();
  if (!userId) return { success: false, message: "Sign in to create a listing." };

  const parsed = parseListingInput(formData);
  if (!parsed.success) {
    return {
      success: false,
      message: "Review the listing details and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const imagePaths = readImagePaths(formData);
  const photoError = await validateUploadedPhotos(userId, imagePaths);
  if (photoError) return { success: false, message: photoError };

  const supabase = await createClient();
  const { data: listing, error } = await supabase
    .from("listings")
    .insert({
      title: parsed.data.title,
      category: parsed.data.category,
      description: parsed.data.description,
      condition: parsed.data.condition,
      starting_price_paise: rupeesToPaise(parsed.data.startingPrice),
      min_increment_paise: rupeesToPaise(parsed.data.minIncrement),
      ends_at: parsed.data.endsAt,
    })
    .select("id")
    .single();

  if (error || !listing) {
    return { success: false, message: "We couldn't create the listing. Check your details and try again." };
  }

  const { error: imageError } = await supabase.from("listing_images").insert(
    imagePaths.map((storage_path, position) => ({
      listing_id: listing.id,
      storage_path,
      position,
    })),
  );

  if (imageError) {
    await supabase.storage.from(BUCKET).remove(imagePaths);
    await supabase
      .from("listings")
      .update({ status: "cancelled" })
      .eq("id", listing.id)
      .eq("seller_id", userId);
    return { success: false, message: "The listing was saved without its photos. Please retry with the photos selected again." };
  }

  revalidateListings();
  return { success: true, listingId: listing.id };
}

export async function updateListing(listingId: string, formData: FormData): Promise<ListingActionResult> {
  if (!z.string().uuid().safeParse(listingId).success) {
    return { success: false, message: "This listing could not be found." };
  }

  const userId = await requireUserId();
  if (!userId) return { success: false, message: "Sign in to edit this listing." };

  const parsed = parseListingInput(formData);
  if (!parsed.success) {
    return {
      success: false,
      message: "Review the listing details and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: existing, error: listingError } = await supabase
    .from("listings")
    .select("id, status, ends_at")
    .eq("id", listingId)
    .eq("seller_id", userId)
    .maybeSingle();

  if (listingError || !existing || existing.status !== "active" || new Date(existing.ends_at) <= new Date()) {
    return { success: false, message: "Only your active, unexpired listings can be edited." };
  }

  const { data: bids, error: bidError } = await supabase
    .from("bids")
    .select("id")
    .eq("listing_id", listingId)
    .limit(1);

  if (bidError || bids?.length) {
    return { success: false, message: "Listings can only be edited before the first bid." };
  }

  const imagePaths = readImagePaths(formData);
  const { data: oldImages, error: oldImagesError } = await supabase
    .from("listing_images")
    .select("id, storage_path")
    .eq("listing_id", listingId);

  if (oldImagesError || (!imagePaths.length && !oldImages?.length)) {
    return { success: false, message: "This listing needs at least one valid photo." };
  }

  if (imagePaths.length) {
    const photoError = await validateUploadedPhotos(userId, imagePaths);
    if (photoError) return { success: false, message: photoError };
  }

  const { data: updatedListing, error: updateError } = await supabase
    .from("listings")
    .update({
      title: parsed.data.title,
      category: parsed.data.category,
      description: parsed.data.description,
      condition: parsed.data.condition,
      starting_price_paise: rupeesToPaise(parsed.data.startingPrice),
      min_increment_paise: rupeesToPaise(parsed.data.minIncrement),
      ends_at: parsed.data.endsAt,
    })
    .eq("id", listingId)
    .eq("seller_id", userId)
    .select("id")
    .maybeSingle();

  if (updateError || !updatedListing) {
    return { success: false, message: "We couldn't update this listing. It may have received a bid." };
  }

  if (imagePaths.length) {
    const { error: addImagesError } = await supabase.from("listing_images").insert(
      imagePaths.map((storage_path, position) => ({ listing_id: listingId, storage_path, position })),
    );
    if (addImagesError) {
      await supabase.storage.from(BUCKET).remove(imagePaths);
      return { success: false, message: "The listing was updated, but its replacement photos could not be attached." };
    }

    const oldImageIds = (oldImages ?? []).map((image) => image.id);
    if (oldImageIds.length) {
      const { error: removeRowsError } = await supabase
        .from("listing_images")
        .delete()
        .eq("listing_id", listingId)
        .in("id", oldImageIds);

      if (!removeRowsError) {
        await supabase.storage.from(BUCKET).remove((oldImages ?? []).map((image) => image.storage_path));
      }
    }
  }

  revalidateListings();
  revalidatePath(`/listings/${listingId}/edit`);
  return { success: true, listingId };
}

export async function cancelListing(listingId: string): Promise<ListingActionResult> {
  if (!z.string().uuid().safeParse(listingId).success) {
    return { success: false, message: "This listing could not be found." };
  }

  const userId = await requireUserId();
  if (!userId) return { success: false, message: "Sign in to cancel this listing." };

  const supabase = await createClient();
  const { data: cancelledListing, error } = await supabase
    .from("listings")
    .update({ status: "cancelled" })
    .eq("id", listingId)
    .eq("seller_id", userId)
    .eq("status", "active")
    .select("id")
    .maybeSingle();

  if (error || !cancelledListing) {
    return { success: false, message: "This listing can no longer be cancelled. It may have received a bid or expired." };
  }

  revalidateListings();
  return { success: true, listingId };
}