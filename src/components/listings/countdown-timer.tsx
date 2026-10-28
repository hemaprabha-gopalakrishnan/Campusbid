"use client";

import { useEffect, useState } from "react";
import { Clock, ShieldAlert } from "lucide-react";

type CountdownTimerProps = {
  endsAt: string;
  onExpire?: () => void;
  status: string;
};

export function CountdownTimer({ endsAt, onExpire, status }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalMs: number;
    isExpired: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalMs: 1,
    isExpired: false,
  });

  const [hasNotifiedExpire, setHasNotifiedExpire] = useState(false);

  useEffect(() => {
    function calculateTime() {
      const target = new Date(endsAt).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isExpired: true });
        if (!hasNotifiedExpire && status === "active") {
          setHasNotifiedExpire(true);
          onExpire?.();
        }
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, totalMs: diff, isExpired: false });
    }

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [endsAt, onExpire, status, hasNotifiedExpire]);

  if (status !== "active" || timeLeft.isExpired) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-[#dedae3]/30 px-3 py-2 text-sm font-semibold text-[#625e69]">
        <Clock size={16} aria-hidden="true" />
        <span>Bidding Closed</span>
      </div>
    );
  }

  const isLastMinute = timeLeft.totalMs <= 30_000;
  const isUrgent = timeLeft.totalMs <= 5 * 60_000;

  return (
    <div className="space-y-1">
      <div
        className={`flex items-center gap-2.5 rounded-md px-3.5 py-2 font-mono text-sm font-semibold transition ${
          isLastMinute
            ? "animate-pulse bg-[#fbe7e4] text-[#a02c1f]"
            : isUrgent
              ? "bg-[#fff1db] text-[#935b0b]"
              : "bg-[#edf4e2] text-[#425d1e]"
        }`}
      >
        <Clock size={16} className="shrink-0" aria-hidden="true" />
        <span>
          {timeLeft.days > 0 && `${timeLeft.days}d `}
          {String(timeLeft.hours).padStart(2, "0")}h:
          {String(timeLeft.minutes).padStart(2, "0")}m:
          {String(timeLeft.seconds).padStart(2, "0")}s
        </span>
      </div>

      {isLastMinute && (
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-[#a02c1f]">
          <ShieldAlert size={13} aria-hidden="true" />
          Soft close: bids within 30s extend auction by 60s
        </p>
      )}
    </div>
  );
}
