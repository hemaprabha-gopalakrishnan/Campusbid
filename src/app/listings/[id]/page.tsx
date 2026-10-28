import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { AuctionRoom } from "@/components/listings/auction-room";
import { getListingDetail } from "@/lib/listings/detail-query";

type ListingPageProps = {
  params: Promise<{ id: string }>;
};

async function ListingPageContent({ params }: ListingPageProps) {
  const { id } = await params;
  const listing = await getListingDetail(id);

  if (!listing) {
    notFound();
  }

  return <AuctionRoom initialListing={listing} />;
}

export default function ListingPage({ params }: ListingPageProps) {
  return (
    <div className="min-h-screen bg-[#f7f6f2]">
      <SiteHeader />
      <main>
        <Suspense
          fallback={
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-7 lg:px-10">
              <div className="h-96 animate-pulse rounded-lg bg-white/60 border border-[#e2dfd8]" />
            </div>
          }
        >
          <ListingPageContent params={params} />
        </Suspense>
      </main>
    </div>
  );
}
