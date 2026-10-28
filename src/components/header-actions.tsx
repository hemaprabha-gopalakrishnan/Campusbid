"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BellRing, LogOut, Plus, Sparkles } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { NotificationCenter } from "./notifications/notification-center";
import { AIAssistantDrawer } from "./ai-assistant/ai-assistant-drawer";
import { WantedAlertsModal } from "./alerts/wanted-alerts-modal";

type HeaderActionsProps = {
  user: {
    id: string;
    displayName: string;
  } | null;
};

export function HeaderActions({ user }: HeaderActionsProps) {
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 sm:gap-3">
        {/* AI Assistant Button */}
        <button
          type="button"
          onClick={() => setIsAIOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#c5bfce] bg-white px-2.5 sm:px-3 text-xs font-semibold text-[#514879] transition hover:bg-[#f8f6fa] shadow-2xs"
        >
          <Sparkles size={14} className="text-[#514879]" aria-hidden="true" />
          <span className="hidden sm:inline">AI Assistant</span>
          <span className="sm:hidden">AI</span>
        </button>

        {/* Item Alerts Button */}
        {user && (
          <button
            type="button"
            onClick={() => setIsAlertsOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#e6e3dd] bg-white px-2.5 sm:px-3 text-xs font-semibold text-[#393547] transition hover:bg-[#fbfaf8]"
          >
            <BellRing size={14} className="text-[#514879]" aria-hidden="true" />
            <span className="hidden sm:inline">Item Alerts</span>
          </button>
        )}

        {/* Notification Bell */}
        {user && <NotificationCenter userId={user.id} />}

        {user ? (
          <>
            <Link
              className="hidden text-xs font-medium text-[#625e69] hover:text-[#282342] sm:inline"
              href="/my-listings"
            >
              My listings
            </Link>

            <Link
              className="inline-flex h-9 items-center gap-1 rounded-md bg-[#c9ef72] px-2.5 sm:px-3 text-xs font-semibold text-[#282342] transition hover:bg-[#d8f59a]"
              href="/listings/new"
            >
              <Plus size={14} aria-hidden="true" />
              <span className="hidden sm:inline">List an item</span>
              <span className="sm:hidden">List</span>
            </Link>

            <span className="hidden max-w-28 truncate text-xs font-semibold text-[#514879] lg:inline">
              {user.displayName}
            </span>

            <form action={signOut}>
              <button
                aria-label="Sign out"
                className="grid size-9 place-items-center rounded-md border border-[#e6e3dd] text-[#514879] transition hover:bg-white"
                title="Sign out"
                type="submit"
              >
                <LogOut size={15} aria-hidden="true" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              className="px-2 py-1.5 text-xs font-medium text-[#514879] hover:text-[#282342]"
              href="/sign-in"
            >
              Sign in
            </Link>
            <Link
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#514879] px-3 text-xs font-semibold text-white transition hover:bg-[#40385f]"
              href="/sign-up"
            >
              <span>Join</span>
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>

      {/* AI Assistant Slide-over Drawer */}
      <AIAssistantDrawer isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />

      {/* Wanted Alerts Modal */}
      {user && (
        <WantedAlertsModal isOpen={isAlertsOpen} onClose={() => setIsAlertsOpen(false)} />
      )}
    </>
  );
}
