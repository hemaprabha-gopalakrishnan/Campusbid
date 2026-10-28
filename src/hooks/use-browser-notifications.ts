"use client";

import { useState } from "react";

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default",
  );

  async function requestPermission(): Promise<boolean> {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch {
      return false;
    }
  }

  function sendBrowserNotification(title: string, options?: NotificationOptions) {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    if (Notification.permission === "granted") {
      // Dispatches browser popup, particularly useful when app is in background tab
      try {
        const notif = new Notification(title, {
          icon: "/favicon.ico",
          ...options,
        });

        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (err) {
        console.error("Browser notification failed", err);
      }
    }
  }

  return {
    permission,
    isSupported: typeof window !== "undefined" && "Notification" in window,
    requestPermission,
    sendBrowserNotification,
  };
}
