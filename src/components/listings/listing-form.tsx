"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ImagePlus, LoaderCircle, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createListing, updateListing } from "@/lib/listings/actions";
import {
  ALLOWED_PHOTO_TYPES,
  LISTING_CATEGORIES,
  LISTING_CONDITIONS,
  listingFormSchema,
  MAX_PHOTO_SIZE_BYTES,
  validatePhotoInfo,
} from "@/lib/listings/validation";
import { createClient } from "@/lib/supabase/client";

export type ListingFormValues = z.infer<typeof listingFormSchema>;

export type ExistingListingImage = {
  storage_path: string;
  url: string;
};

type ListingFormProps = {
  mode: "create" | "edit";
  listingId?: string;
  defaultValues?: ListingFormValues;
  existingImages?: ExistingListingImage[];
};

const inputClassName =
  "mt-1.5 h-11 w-full rounded-md border border-[#dedbe3] bg-white px-3 text-sm text-[#282342] outline-none transition focus:border-[#655c89] focus:ring-2 focus:ring-[#655c89]/15";

function localDateTimeValue(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const localOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - localOffset).toISOString().slice(0, 16);
}

function fileExtension(type: string) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  return "webp";
}

export function ListingForm({ mode, listingId, defaultValues, existingImages = [] }: ListingFormProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [photoPreviews, setPhotoPreviews] = useState<Map<File, string>>(new Map());
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: defaultValues
      ? { ...defaultValues, endsAt: localDateTimeValue(defaultValues.endsAt) }
      : { category: "other", condition: "good" },
  });

  useEffect(() => () => {
    photoPreviews.forEach((url) => URL.revokeObjectURL(url));
  }, [photoPreviews]);

  function selectPhotos(files: FileList | null) {
    if (!files) return;
    const nextPhotos = Array.from(files);
    const validationError = validatePhotoInfo(
      nextPhotos.map(({ name, size, type }) => ({ name, size, type })),
    );

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError(null);
    setPhotoPreviews(new Map(nextPhotos.map((photo) => [photo, URL.createObjectURL(photo)])));
    setSelectedPhotos(nextPhotos);
  }

  async function onSubmit(values: ListingFormValues) {
    setFormError(null);
    const isEditing = mode === "edit";

    if (!isEditing && selectedPhotos.length === 0) {
      setFormError("Add at least one photo before publishing.");
      return;
    }
    if (isEditing && selectedPhotos.length === 0 && existingImages.length === 0) {
      setFormError("Add at least one photo before saving.");
      return;
    }

    const uploadedPaths: string[] = [];
    const supabase = createClient();

    try {
      if (selectedPhotos.length) {
        setUploading(true);
        const { data: userData, error: userError } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (userError || !userId) {
          setFormError("Sign in again before uploading photos.");
          setUploading(false);
          return;
        }

        for (const photo of selectedPhotos) {
          if (!ALLOWED_PHOTO_TYPES.includes(photo.type as (typeof ALLOWED_PHOTO_TYPES)[number]) || photo.size > MAX_PHOTO_SIZE_BYTES) {
            setFormError("Use JPG, PNG, or WebP photos smaller than 5 MB each.");
            await supabase.storage.from("listing-images").remove(uploadedPaths);
            setUploading(false);
            return;
          }

          const path = `${userId}/${crypto.randomUUID()}.${fileExtension(photo.type)}`;
          const { error: uploadError } = await supabase.storage
            .from("listing-images")
            .upload(path, photo, { contentType: photo.type, cacheControl: "3600", upsert: false });

          if (uploadError) {
            await supabase.storage.from("listing-images").remove(uploadedPaths);
            const uploadMessage = uploadError.message.toLowerCase();
            if (uploadError.statusCode === "404" || uploadMessage.includes("bucket not found") || uploadMessage.includes("nosuchbucket")) {
              setFormError("Photo storage is not initialized. Link this Supabase project and run `npx supabase db push`, then try again.");
            } else if (uploadError.statusCode === "403" || uploadMessage.includes("row-level security")) {
              setFormError("Supabase denied this photo upload. Confirm you are signed in and the Storage policies from the migrations are applied.");
            } else {
              setFormError("A photo could not be uploaded. Check your connection and try again.");
            }
            setUploading(false);
            return;
          }

          uploadedPaths.push(path);
        }
      }

      const formData = new FormData();
      formData.set("title", values.title);
      formData.set("category", values.category);
      formData.set("description", values.description);
      formData.set("condition", values.condition);
      formData.set("startingPrice", values.startingPrice);
      formData.set("minIncrement", values.minIncrement);
      formData.set("endsAt", new Date(values.endsAt).toISOString());
      uploadedPaths.forEach((path) => formData.append("imagePaths", path));

      const result = isEditing && listingId
        ? await updateListing(listingId, formData)
        : await createListing(formData);

      if (!result.success) {
        if (uploadedPaths.length) await supabase.storage.from("listing-images").remove(uploadedPaths);
        setFormError(result.message);
        for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
          const message = messages?.[0];
          if (message && field in values) {
            setError(field as keyof ListingFormValues, { message });
          }
        }
        return;
      }

      router.push("/my-listings?success=saved");
      router.refresh();
    } catch {
      if (uploadedPaths.length) await supabase.storage.from("listing-images").remove(uploadedPaths);
      setFormError("We couldn't save the listing. Check the Supabase setup and try again.");
    } finally {
      setUploading(false);
    }
  }

  const busy = isSubmitting || uploading;

  return (
    <form className="space-y-7" onSubmit={handleSubmit(onSubmit)} noValidate>
      <section className="grid gap-5 border-b border-[#e6e3dd] pb-7 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[#393641]" htmlFor="title">Item title</label>
          <input {...register("title")} className={inputClassName} id="title" maxLength={100} placeholder="e.g. City bicycle, recently serviced" />
          {errors.title && <p className="mt-1 text-xs text-red-700">{errors.title.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-[#393641]" htmlFor="category">Category</label>
          <select {...register("category")} className={inputClassName} id="category">
            {LISTING_CATEGORIES.map((category) => <option key={category} value={category}>{category === "cycle" ? "Cycle" : category[0].toUpperCase() + category.slice(1)}</option>)}
          </select>
          {errors.category && <p className="mt-1 text-xs text-red-700">{errors.category.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-[#393641]" htmlFor="condition">Condition</label>
          <select {...register("condition")} className={inputClassName} id="condition">
            {LISTING_CONDITIONS.map((condition) => <option key={condition} value={condition}>{condition === "like_new" ? "Like new" : condition[0].toUpperCase() + condition.slice(1)}</option>)}
          </select>
          {errors.condition && <p className="mt-1 text-xs text-red-700">{errors.condition.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[#393641]" htmlFor="description">Description</label>
          <textarea {...register("description")} className="mt-1.5 min-h-32 w-full resize-y rounded-md border border-[#dedbe3] bg-white px-3 py-2.5 text-sm leading-6 text-[#282342] outline-none transition focus:border-[#655c89] focus:ring-2 focus:ring-[#655c89]/15" id="description" maxLength={5000} placeholder="Describe the item, included accessories, and anything a buyer should know." />
          {errors.description && <p className="mt-1 text-xs text-red-700">{errors.description.message}</p>}
        </div>
      </section>

      <section className="border-b border-[#e6e3dd] pb-7">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[#282342]">Photos</h2>
            <p className="mt-1 text-xs leading-5 text-[#77747e]">1–3 JPG, PNG, or WebP images. Maximum 5 MB each.</p>
          </div>
          {mode === "edit" && existingImages.length > 0 && selectedPhotos.length === 0 && (
            <span className="text-xs text-[#77747e]">Current photos kept</span>
          )}
        </div>

        {selectedPhotos.length > 0 ? (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {selectedPhotos.map((photo) => (
              <div className="relative aspect-square overflow-hidden rounded-md border border-[#e6e3dd]" key={`${photo.name}-${photo.lastModified}`}>
                <Image alt={photo.name} className="object-cover" fill sizes="(min-width: 640px) 25vw, 33vw" src={photoPreviews.get(photo) ?? ""} unoptimized />
                <button aria-label={`Remove ${photo.name}`} className="absolute right-2 top-2 grid size-8 place-items-center rounded-md bg-white/95 text-[#514879] shadow-sm" onClick={() => {
                  setPhotoPreviews((current) => {
                    const next = new Map(current);
                    next.delete(photo);
                    return next;
                  });
                  setSelectedPhotos((current) => current.filter((entry) => entry !== photo));
                }} type="button">
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        ) : mode === "edit" && existingImages.length > 0 ? (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {existingImages.map((image) => <div className="relative aspect-square overflow-hidden rounded-md border border-[#e6e3dd]" key={image.storage_path}><Image alt="Current listing photo" className="object-cover" fill sizes="(min-width: 640px) 25vw, 33vw" src={image.url} /></div>)}
          </div>
        ) : (
          <button className="mt-4 flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[#c8c3d0] bg-white px-4 text-sm text-[#625e69] hover:border-[#655c89] hover:bg-[#fcfbfd]" onClick={() => inputRef.current?.click()} type="button">
            <ImagePlus size={23} className="text-[#514879]" aria-hidden="true" />
            <span className="font-medium">Choose photos</span>
            <span className="text-xs text-[#8b8890]">Photos upload securely to your account folder</span>
          </button>
        )}
        <input
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          multiple
          onChange={(event) => selectPhotos(event.currentTarget.files)}
          ref={inputRef}
          type="file"
        />
        {(selectedPhotos.length > 0 || (mode === "edit" && existingImages.length > 0)) && (
          <button className="mt-3 inline-flex h-9 items-center gap-2 rounded-md border border-[#dedbe3] bg-white px-3 text-xs font-medium text-[#514879]" onClick={() => inputRef.current?.click()} type="button">
            <Upload size={14} aria-hidden="true" />
            {selectedPhotos.length ? "Replace selected photos" : "Replace current photos"}
          </button>
        )}
      </section>

      <section className="grid gap-5 border-b border-[#e6e3dd] pb-7 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-[#393641]" htmlFor="startingPrice">Starting price (₹)</label>
          <input {...register("startingPrice")} className={inputClassName} id="startingPrice" inputMode="decimal" min="0.01" placeholder="500.00" step="0.01" type="number" />
          {errors.startingPrice && <p className="mt-1 text-xs text-red-700">{errors.startingPrice.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-[#393641]" htmlFor="minIncrement">Minimum bid increment (₹)</label>
          <input {...register("minIncrement")} className={inputClassName} id="minIncrement" inputMode="decimal" min="0.01" placeholder="25.00" step="0.01" type="number" />
          {errors.minIncrement && <p className="mt-1 text-xs text-red-700">{errors.minIncrement.message}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[#393641]" htmlFor="endsAt">Auction closing date and time</label>
          <input {...register("endsAt")} className={inputClassName} id="endsAt" min={localDateTimeValue(new Date().toISOString())} type="datetime-local" />
          {errors.endsAt && <p className="mt-1 text-xs text-red-700">{errors.endsAt.message}</p>}
          <p className="mt-1.5 text-xs text-[#77747e]">This item has its own closing time. It is checked again by the server before saving.</p>
        </div>
      </section>

      {formError && <p aria-live="polite" className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">{formError}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-[#625e69] hover:bg-white" href="/my-listings">
          <ArrowLeft size={16} aria-hidden="true" /> Cancel
        </Link>
        <button className="inline-flex h-11 items-center gap-2 rounded-md bg-[#514879] px-5 text-sm font-semibold text-white transition hover:bg-[#40385f] disabled:cursor-wait disabled:opacity-65" disabled={busy} type="submit">
          {busy ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : null}
          {uploading ? "Uploading photos" : isSubmitting ? "Saving listing" : mode === "create" ? "Publish listing" : "Save changes"}
        </button>
      </div>
    </form>
  );
}