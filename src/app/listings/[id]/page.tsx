import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { AuctionRoom } from "@/components/listings/auction-room";
import { getListingDetail } from "@/lib/listings/detail-query";

type ListingPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ListingPage({ params }: ListingPageProps) {
  const { id } = await params;
  const listing = await getListingDetail(id);

  if (!listing) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#f7f6f2]">
      <SiteHeader />
      <main>
        <AuctionRoom initialListing={listing} />
      </main>
    </div>
  );
}
