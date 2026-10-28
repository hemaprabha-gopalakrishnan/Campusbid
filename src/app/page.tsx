import Link from "next/link";
import { ArrowRight, PackageOpen } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f7f6f2]">
      <SiteHeader />
      <main id="marketplace" className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-7 sm:pt-8 lg:px-10">
        <section className="grid overflow-hidden rounded-lg bg-[#282342] text-white md:grid-cols-[1.08fr_0.92fr]">
          <div className="flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#c9ef72]">The campus marketplace</p>
            <h1 className="mt-4 max-w-xl font-serif text-[2.45rem] leading-[1.02] sm:text-[3.25rem] lg:text-[3.75rem]">
              Good finds are closer than you think.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-white/75 sm:text-base">
              Useful second-hand things, passed from one student to the next.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link
                className="inline-flex h-11 items-center gap-2 rounded-md bg-[#c9ef72] px-4 text-sm font-semibold text-[#282342] transition hover:bg-[#d8f59a]"
                href="/sign-up"
              >
                Join CampusBid <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link className="text-sm font-medium text-white/80 underline decoration-white/35 underline-offset-4 hover:text-white" href="/sign-in">
                Already a member? Sign in
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/15 pt-4 text-xs text-white/65">
              <span>Student-to-student</span>
              <span>Campus handover</span>
              <span>Clear auction deadlines</span>
            </div>
          </div>
          <div
            aria-label="A backpack ready for a new campus semester"
            className="min-h-[190px] bg-[#d6d2ca] bg-cover bg-center md:min-h-[390px]"
            role="img"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1400&q=85')",
              backgroundPosition: "center 57%",
            }}
          />
        </section>

        <section className="mt-8 sm:mt-10">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#e2dfd8] pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#77747e]">Marketplace</p>
              <h2 className="mt-1 text-2xl font-semibold text-[#282342]">Fresh on campus</h2>
            </div>
            <span className="text-sm text-[#77747e]">Listings are coming soon</span>
          </div>

          <div className="flex min-h-[190px] flex-col items-center justify-center px-5 py-8 text-center sm:min-h-[210px]">
            <span className="grid size-11 place-items-center rounded-md bg-white text-[#77747e] shadow-sm ring-1 ring-[#e6e3dd]">
              <PackageOpen size={22} aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-[#282342]">The first listings are on their way</h3>
            <p className="mt-1 max-w-sm text-sm leading-6 text-[#77747e]">
              Set up your student account and be ready when campus finds go live.
            </p>
            <Link className="mt-3 text-sm font-semibold text-[#514879] underline decoration-[#c9ef72] decoration-2 underline-offset-4 hover:text-[#282342]" href="/sign-up">
              Create an account
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
