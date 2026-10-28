import Link from "next/link";
import { ArrowUpRight, BookOpen, Bike, Gavel } from "lucide-react";

type AuthFrameProps = {
  children: React.ReactNode;
  mode: "sign-in" | "sign-up";
};

export function AuthFrame({ children, mode }: AuthFrameProps) {
  return (
    <main className="min-h-screen bg-[#f7f6f2] p-3 sm:p-5 lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
      <section className="relative flex min-h-[245px] flex-col overflow-hidden rounded-lg bg-[#282342] px-5 py-5 text-white sm:min-h-[270px] sm:px-9 sm:py-7 lg:min-h-[calc(100vh-40px)] lg:px-12 lg:py-10">
        <Link href="/" className="inline-flex w-fit items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-md bg-[#c9ef72] text-[#282342]">
            <Gavel size={19} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <span className="text-[15px] font-semibold tracking-[0.01em]">CampusBid</span>
        </Link>

        <div className="my-auto max-w-xl py-6 lg:py-14">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#c9ef72]">
            The campus marketplace
          </p>
          <h1 className="max-w-lg font-serif text-4xl leading-[1.02] sm:text-5xl">
            Good things find their next place.
          </h1>
          <div className="mt-6 grid max-w-md grid-cols-2 gap-3" aria-label="Popular campus finds">
            <div className="flex min-h-[88px] flex-col justify-between rounded-md border border-white/15 bg-white/[0.06] p-3 sm:min-h-[100px] sm:p-4">
              <span className="grid size-8 place-items-center rounded-md bg-[#f0c98b] text-[#282342]">
                <Bike size={19} aria-hidden="true" />
              </span>
              <span className="flex items-center justify-between text-[13px] text-white/85 sm:text-sm">
                Bicycles <ArrowUpRight size={15} aria-hidden="true" />
              </span>
            </div>
            <div className="flex min-h-[88px] flex-col justify-between rounded-md border border-white/15 bg-white/[0.06] p-3 sm:min-h-[100px] sm:p-4">
              <span className="grid size-8 place-items-center rounded-md bg-[#a8d7ce] text-[#282342]">
                <BookOpen size={19} aria-hidden="true" />
              </span>
              <span className="flex items-center justify-between text-[13px] text-white/85 sm:text-sm">
                Books <ArrowUpRight size={15} aria-hidden="true" />
              </span>
            </div>
          </div>
        </div>

        <div className="hidden items-center justify-between border-t border-white/15 pt-5 text-xs text-white/55 sm:flex">
          <span>Made for campus life</span>
          <span>Student-to-student, on your campus</span>
        </div>
      </section>

      <section className="flex min-h-[520px] flex-col px-2 py-6 sm:px-8 sm:py-8 lg:min-h-[calc(100vh-40px)] lg:px-12 lg:py-10 xl:px-20">
        <div className="flex justify-end gap-1 text-sm text-[#77747e]">
          <span>{mode === "sign-in" ? "New to CampusBid?" : "Already a member?"}</span>
          <Link
            href={mode === "sign-in" ? "/sign-up" : "/sign-in"}
            className="font-semibold text-[#282342] underline decoration-[#c9ef72] decoration-2 underline-offset-4 hover:text-[#514979]"
          >
            {mode === "sign-in" ? "Create account" : "Sign in"}
          </Link>
        </div>
        <div className="my-auto w-full max-w-[410px] self-center py-8">{children}</div>
        <p className="self-center text-center text-xs text-[#8b8890]">
          By continuing, you agree to keep campus exchanges respectful and fair.
        </p>
      </section>
    </main>
  );
}