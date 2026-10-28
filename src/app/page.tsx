import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, BookOpen, Calculator, Laptop, Bike, Shapes } from "lucide-react";
import { MarketplaceResults } from "@/components/listings/marketplace-results";
import { SiteHeader } from "@/components/site-header";

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function Home({ searchParams }: HomePageProps) {
  const categories = [
    { name: "Cycles", value: "cycle", Icon: Bike },
    { name: "Calculators", value: "calculator", Icon: Calculator },
    { name: "Books", value: "books", Icon: BookOpen },
    { name: "Electronics", value: "electronics", Icon: Laptop },
    { name: "More", value: "other", Icon: Shapes },
  ];

  return (
    <div className="min-h-screen bg-[#f7f6f2]">
      <SiteHeader />
      <main id="marketplace" className="mx-auto max-w-7xl px-4 pb-20 pt-5 sm:px-7 sm:pt-7 lg:px-10">
        <section className="flex flex-wrap items-end justify-between gap-4 border-b border-[#e2dfd8] pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#77747e]">CampusBid · student marketplace</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#282342] sm:text-4xl">Good finds, close to home.</h1>
            <p className="mt-2 text-sm text-[#77747e]">Second-hand essentials shared by students on your campus.</p>
          </div>
          <Link className="inline-flex h-10 items-center gap-2 rounded-md bg-[#514879] px-4 text-sm font-semibold text-white transition hover:bg-[#40385f]" href="/listings/new">
            List an item <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>

        <nav className="-mx-4 flex gap-2 overflow-x-auto border-b border-[#e2dfd8] px-4 py-3 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Browse categories">
          {categories.map(({ name, value, Icon }) => (
            <Link
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-[#e6e3dd] bg-white px-3 text-xs font-medium text-[#514879] transition hover:border-[#c5bfce] hover:bg-[#f8f6fa]"
              href={`/?category=${value}#marketplace`}
              key={value}
            >
              <Icon size={15} aria-hidden="true" /> {name}
            </Link>
          ))}
        </nav>

        <Suspense fallback={<div className="mt-8 min-h-64 animate-pulse border-t border-[#e2dfd8] bg-white/40" aria-label="Loading marketplace" />}>
          <MarketplaceResults searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}
