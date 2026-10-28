import Link from "next/link";
import { ArrowDown, ArrowRight, Compass, PackageOpen } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f7f6f2]">
      <SiteHeader />
      <main id="marketplace" className="mx-auto max-w-7xl px-4 pb-20 pt-9 sm:px-7 sm:pt-12 lg:px-10">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#77747e]">
          <Compass size={15} aria-hidden="true" />
          <span>Campus marketplace</span>
          <span aria-hidden="true">/</span>
          <span>Student-to-student</span>
        </div>

        <section className="mt-6 grid overflow-hidden rounded-lg bg-[#282342] text-white lg:grid-cols-[1.25fr_0.75fr]">
          <div className="px-6 py-9 sm:px-10 sm:py-12 lg:px-14 lg:py-16">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#c9ef72]">CampusBid marketplace</p>
            <h1 className="mt-4 max-w-2xl font-serif text-4xl leading-[1.04] sm:text-5xl lg:text-6xl">
              Find a good thing for your next semester.
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-6 text-white/70 sm:text-base">
              Useful second-hand finds, shared by students right here on campus.
            </p>
            <Link
              className="mt-8 inline-flex h-11 items-center gap-2 rounded-md bg-[#c9ef72] px-4 text-sm font-semibold text-[#282342] transition hover:bg-[#d8f59a]"
              href="/sign-up"
            >
              Join the marketplace <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className="relative hidden min-h-[280px] items-center justify-center bg-[#e8d8bc] lg:flex">
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(#514879 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
            <div className="relative grid size-48 place-items-center rounded-full border border-[#282342]/15 bg-[#f7f1e7] text-[#514879]">
              <PackageOpen size={82} strokeWidth={1.15} aria-hidden="true" />
              <span className="absolute -right-7 top-6 grid size-14 place-items-center rounded-full bg-[#c9ef72] text-[#282342]">
                <ArrowDown size={22} aria-hidden="true" />
              </span>
            </div>
            <span className="absolute bottom-7 right-8 text-xs font-semibold uppercase tracking-[0.1em] text-[#514879]">Pass it on</span>
          </div>
        </section>

        <section className="mt-10 sm:mt-14">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#e2dfd8] pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#77747e]">Browse listings</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-[#282342]">Fresh on campus</h2>
            </div>
            <span className="text-sm text-[#77747e]">New listings will appear here</span>
          </div>

          <div className="flex min-h-[230px] flex-col items-center justify-center px-5 py-10 text-center">
            <span className="grid size-12 place-items-center rounded-md bg-white text-[#77747e] shadow-sm ring-1 ring-[#e6e3dd]">
              <PackageOpen size={22} aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-[#282342]">The shelves are clear for now</h3>
            <p className="mt-1 max-w-sm text-sm leading-6 text-[#77747e]">
              Create an account to get ready for the first campus listings.
            </p>
            <Link className="mt-4 text-sm font-semibold text-[#514879] underline decoration-[#c9ef72] decoration-2 underline-offset-4 hover:text-[#282342]" href="/sign-up">
              Create a student account
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
