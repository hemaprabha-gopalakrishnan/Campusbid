import { z } from "zod";
import { isValidRupeeAmount } from "./money";

export const LISTING_CATEGORIES = [
  "cycle",
  "calculator",
  "books",
  "electronics",
  "other",
] as const;

export const LISTING_CONDITIONS = ["like_new", "good", "fair", "poor"] as const;
export const MAX_LISTING_PHOTOS = 3;
export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const listingFieldsSchema = z.object({
  title: z.string().trim().min(3, "Use at least 3 characters.").max(100, "Keep the title under 100 characters."),
  category: z.enum(LISTING_CATEGORIES),
  description: z.string().trim().min(10, "Add at least 10 characters.").max(5000, "Keep the description under 5,000 characters."),
  condition: z.enum(LISTING_CONDITIONS),
  startingPrice: z.string().trim().refine(isValidRupeeAmount, "Enter a positive price with up to two decimal places."),
  minIncrement: z.string().trim().refine(isValidRupeeAmount, "Enter a positive increment with up to two decimal places."),
});

export const listingInputSchema = listingFieldsSchema.extend({
  endsAt: z.string().datetime({ error: "Choose a valid closing time." }),
}).refine((value) => isFutureClosingTime(value.endsAt), {
  path: ["endsAt"],
  message: "Choose a closing time in the future.",
});

export const listingFormSchema = listingFieldsSchema.extend({
  endsAt: z.string().min(1, "Choose a closing time.").refine(isFutureClosingTime, "Choose a closing time in the future."),
});

export type ListingInput = z.infer<typeof listingInputSchema>;

export type PhotoInfo = {
  name: string;
  size: number;
  type: string;
};

export function validatePhotoInfo(photos: PhotoInfo[]) {
  if (photos.length < 1 || photos.length > MAX_LISTING_PHOTOS) {
    return `Add between 1 and ${MAX_LISTING_PHOTOS} photos.`;
  }

  if (photos.some((photo) => !ALLOWED_PHOTO_TYPES.includes(photo.type as (typeof ALLOWED_PHOTO_TYPES)[number]))) {
    return "Use JPG, PNG, or WebP photos.";
  }

  if (photos.some((photo) => !Number.isInteger(photo.size) || photo.size <= 0 || photo.size > MAX_PHOTO_SIZE_BYTES)) {
    return "Each photo must be smaller than 5 MB.";
  }

  return null;
}

export function detectImageContentType(bytes: Uint8Array) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

export function isFutureClosingTime(value: string, now = new Date()) {
  const closingTime = new Date(value);
  return Number.isFinite(closingTime.getTime()) && closingTime.getTime() > now.getTime();
}