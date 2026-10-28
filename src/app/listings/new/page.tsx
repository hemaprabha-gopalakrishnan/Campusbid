import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { ListingForm } from "@/components/listings/listing-form";
import { SiteHeader } from "@/components/site-header";
import { getVerifiedClaims } from "@/lib/auth";

async function NewListingContent() {
  const claims = await getVerifiedClaims().catch(() => null);
  if (!claims?.sub) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-[#f7f6f2]">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-7 lg:px-10">
        <Link className="inline-flex items-center gap-2 text-sm font-medium text-[#625e69] hover:text-[#282342]" href="/my-listings">
          <ArrowLeft size={16} aria-hidden="true" /> My listings
        </Link>
        <div className="mt-6 border-b border-[#e6e3dd] pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#77747e]">Seller workspace</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#282342]">List an item</h1>
          <p className="mt-2 text-sm leading-6 text-[#77747e]">Set the terms for this item. Its auction closes independently of your other listings.</p>
        </div>
        <div className="mt-7 rounded-md border border-[#e6e3dd] bg-white p-4 sm:p-7">
          <ListingForm mode="create" />
        </div>
      </main>
    </div>
  );
}

export default function NewListingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f7f6f2]" aria-label="Loading listing form" />}>
      <NewListingContent />
    </Suspense>
  );
}