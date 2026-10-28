import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { ListingForm, type ListingFormValues } from "@/components/listings/listing-form";
import { SiteHeader } from "@/components/site-header";
import { getVerifiedClaims } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type EditListingPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditListingPage({ params }: EditListingPageProps) {
  const claims = await getVerifiedClaims().catch(() => null);
  if (!claims?.sub) redirect("/sign-in");

  const { id } = await params;
  const supabase = await createClient();
  const { data: listing, error } = await supabase
    .from("listings")
    .select("id, title, category, description, condition, starting_price_paise, min_increment_paise, ends_at, status, seller_id")
    .eq("id", id)
    .eq("seller_id", claims.sub)
    .maybeSingle();

  if (error || !listing) notFound();

  const { data: bids, error: bidError } = await supabase
    .from("bids")
    .select("id")
    .eq("listing_id", id)
    .limit(1);

  if (bidError || bids?.length || listing.status !== "active" || new Date(listing.ends_at) <= new Date()) {
    return (
      <div className="min-h-screen bg-[#f7f6f2]">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-10 sm:px-7 lg:px-10">
          <div className="rounded-md border border-[#eadcb8] bg-[#fff8e8] p-5 text-sm leading-6 text-[#705c2a]">
            This listing can no longer be edited. Auction terms are locked after the first bid or closing time.
          </div>
          <Link className="mt-5 inline-flex text-sm font-semibold text-[#514879] underline underline-offset-4" href="/my-listings">Return to my listings</Link>
        </main>
      </div>
    );
  }

  const { data: imageRows } = await supabase
    .from("listing_images")
    .select("storage_path, position")
    .eq("listing_id", id)
    .order("position", { ascending: true });

  const defaultValues: ListingFormValues = {
    title: listing.title,
    category: listing.category as ListingFormValues["category"],
    description: listing.description,
    condition: listing.condition as ListingFormValues["condition"],
    startingPrice: (Number(listing.starting_price_paise) / 100).toFixed(2),
    minIncrement: (Number(listing.min_increment_paise) / 100).toFixed(2),
    endsAt: listing.ends_at,
  };

  const existingImages = (imageRows ?? []).map((image) => ({
    storage_path: image.storage_path,
    url: supabase.storage.from("listing-images").getPublicUrl(image.storage_path).data.publicUrl,
  }));

  return (
    <div className="min-h-screen bg-[#f7f6f2]">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-7 lg:px-10">
        <Link className="inline-flex items-center gap-2 text-sm font-medium text-[#625e69] hover:text-[#282342]" href="/my-listings">
          <ArrowLeft size={16} aria-hidden="true" /> My listings
        </Link>
        <div className="mt-6 border-b border-[#e6e3dd] pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#77747e]">Seller workspace</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#282342]">Edit listing</h1>
          <p className="mt-2 text-sm leading-6 text-[#77747e]">Auction details are locked once the first bid arrives.</p>
        </div>
        <div className="mt-7 rounded-md border border-[#e6e3dd] bg-white p-4 sm:p-7">
          <ListingForm mode="edit" listingId={listing.id} defaultValues={defaultValues} existingImages={existingImages} />
        </div>
      </main>
    </div>
  );
}