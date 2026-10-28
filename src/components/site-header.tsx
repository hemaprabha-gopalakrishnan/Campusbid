import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Gavel, LogOut } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";

async function AccountActions() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    return <SignedOutActions />;
  }

  const supabase = await createClient();
  const { data: claimsData, error } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (error || !userId) {
    return <SignedOutActions />;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();

  return (
    <div className="flex items-center gap-3">
      <span className="hidden max-w-36 truncate text-sm font-medium text-[#514879] sm:inline">
        {profile?.display_name ?? "Campus student"}
      </span>
      <form action={signOut}>
        <button
          aria-label="Sign out"
          className="grid size-10 place-items-center rounded-md border border-[#e6e3dd] text-[#514879] transition hover:bg-white"
          title="Sign out"
          type="submit"
        >
          <LogOut size={17} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

function SignedOutActions() {
  return (
    <div className="flex items-center gap-2">
      <Link
        className="px-1 py-2 text-[13px] font-medium text-[#514879] hover:text-[#282342] sm:px-3 sm:text-sm"
        href="/sign-in"
      >
        Sign in
      </Link>
      <Link
        className="inline-flex h-10 items-center gap-2 rounded-md bg-[#514879] px-3 text-[13px] font-semibold text-white transition hover:bg-[#40385f] sm:px-4 sm:text-sm"
        href="/sign-up"
      >
        <span className="sm:hidden">Join</span>
        <span className="hidden sm:inline">Join CampusBid</span>
        <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-[#e6e3dd] bg-[#fbfaf7]">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-4 sm:px-7 lg:px-10">
        <Link href="/" className="inline-flex items-center gap-2.5" aria-label="CampusBid home">
          <span className="grid size-9 place-items-center rounded-md bg-[#c9ef72] text-[#282342]">
            <Gavel size={19} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <span className="text-[15px] font-semibold text-[#282342]">CampusBid</span>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-6" aria-label="Main navigation">
          <Link className="hidden text-sm font-medium text-[#625e69] hover:text-[#282342] sm:inline" href="#marketplace">
            Marketplace
          </Link>
          <Suspense fallback={<SignedOutActions />}>
            <AccountActions />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}