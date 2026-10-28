"use client";

import { LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelListing } from "@/lib/listings/actions";

type CancelListingButtonProps = {
  listingId: string;
};

export function CancelListingButton({ listingId }: CancelListingButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onCancel() {
    if (!window.confirm("Cancel this auction? Its listing and history will remain recorded.")) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelListing(listingId);
      if (!result.success) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#e4d7d2] px-3 text-xs font-medium text-[#8f4b39] transition hover:bg-[#fcf4f1] disabled:opacity-60"
        disabled={pending}
        onClick={onCancel}
        type="button"
      >
        {pending ? <LoaderCircle size={14} className="animate-spin" /> : <X size={14} aria-hidden="true" />}
        Cancel auction
      </button>
      {error && <p aria-live="polite" className="mt-1 max-w-48 text-xs text-red-700">{error}</p>}
    </div>
  );
}