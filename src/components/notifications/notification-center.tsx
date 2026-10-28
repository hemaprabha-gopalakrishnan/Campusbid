"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, ExternalLink, Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBrowserNotifications } from "@/hooks/use-browser-notifications";
import { getNotifications, markNotificationsRead, type NotificationItem } from "@/lib/notifications/actions";

type NotificationCenterProps = {
  userId: string;
};

export function NotificationCenter({ userId }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { permission, requestPermission, sendBrowserNotification } = useBrowserNotifications();

  // Load initial notifications
  useEffect(() => {
    getNotifications().then(setNotifications);
  }, []);

  // Listen for Realtime notifications and dispatch browser notification if tab in background
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newItem = payload.new as NotificationItem;
          setNotifications((prev) => [newItem, ...prev]);

          // Browser notification popup when tab is in background
          if (typeof document !== "undefined" && document.visibilityState === "hidden") {
            sendBrowserNotification("CampusBid Alert", {
              body: newItem.message,
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, sendBrowserNotification]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  async function handleMarkAllRead() {
    await markNotificationsRead();
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })),
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Notifications (${unreadCount} unread)`}
        className="relative grid size-9 place-items-center rounded-md border border-[#e6e3dd] text-[#514879] hover:bg-white transition"
      >
        <Bell size={16} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-[#c9ef72] text-[10px] font-bold text-[#282342]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg border border-[#e2dfd8] bg-white shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#eeebe5] px-4 py-3 bg-[#faf9f6]">
            <div>
              <h3 className="text-xs font-bold text-[#282342]">Notifications</h3>
              <p className="text-[11px] text-[#77747e]">{unreadCount} unread alerts</p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#514879] hover:underline"
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          {/* Browser Notification Banner */}
          {permission !== "granted" && (
            <div className="flex items-center justify-between border-b border-[#eeebe5] bg-[#fffbf2] px-4 py-2 text-[11px] text-[#705c2a]">
              <span className="flex items-center gap-1.5">
                <Globe size={13} className="shrink-0" />
                Allow background popups?
              </span>
              <button
                type="button"
                onClick={() => requestPermission()}
                className="font-bold text-[#514879] underline hover:text-[#282342]"
              >
                Enable
              </button>
            </div>
          )}

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#eeebe5]">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#77747e]">
                No notifications yet. You will receive updates on your bids, auctions, and wanted alerts here.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 text-xs transition ${
                    !n.read_at ? "bg-[#f9f7fc]/60 font-medium" : "hover:bg-[#faf9f6]"
                  }`}
                >
                  <p className="text-[#282342]">{n.message}</p>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-[#77747e]">
                    <span>
                      {new Date(n.created_at).toLocaleTimeString("en-IN", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    {n.listing_id && (
                      <Link
                        href={`/listings/${n.listing_id}`}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1 text-[#514879] font-semibold hover:underline"
                      >
                        View item <ExternalLink size={10} />
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
