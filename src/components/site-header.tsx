import Link from "next/link";
import { Suspense } from "react";
import { Gavel } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { HeaderActions } from "./header-actions";

async function HeaderUserActions() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    return <HeaderActions user={null} />;
  }

  const supabase = await createClient();
  const { data: claimsData, error } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (error || !userId) {
    return <HeaderActions user={null} />;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();

  return (
    <HeaderActions
      user={{
        id: userId,
        displayName: profile?.display_name ?? "Campus student",
      }}
    />
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-[#e6e3dd] bg-[#fbfaf7] sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-4 sm:px-7 lg:px-10">
        <Link href="/" className="inline-flex items-center gap-2.5" aria-label="CampusBid home">
          <span className="grid size-9 place-items-center rounded-md bg-[#c9ef72] text-[#282342]">
            <Gavel size={19} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <span className="text-[15px] font-semibold text-[#282342]">CampusBid</span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4" aria-label="Main navigation">
          <Link
            className="hidden text-xs font-semibold text-[#625e69] hover:text-[#282342] md:inline"
            href="/#marketplace"
          >
            Marketplace
          </Link>
          <Suspense fallback={<HeaderActions user={null} />}>
            <HeaderUserActions />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}