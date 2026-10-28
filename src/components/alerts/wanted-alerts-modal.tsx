"use client";

import { useEffect, useState } from "react";
import { BellRing, Check, LoaderCircle, Plus, Trash2, X } from "lucide-react";
import { formatPaiseAsINR } from "@/lib/listings/money";
import { createWantedAlert, deleteWantedAlert, getUserWantedAlerts } from "@/lib/alerts/actions";
import type { WantedAlert } from "@/lib/alerts/matching";

type WantedAlertsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const categoryOptions = [
  { value: "", label: "Any category" },
  { value: "cycle", label: "Cycles" },
  { value: "calculator", label: "Calculators" },
  { value: "books", label: "Books" },
  { value: "electronics", label: "Electronics" },
  { value: "other", label: "Other" },
];

export function WantedAlertsModal({ isOpen, onClose }: WantedAlertsModalProps) {
  const [alerts, setAlerts] = useState<WantedAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<number>(400);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function refreshAlerts() {
    setLoading(true);
    try {
      const data = await getUserWantedAlerts();
      setAlerts(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    let isCurrent = true;
    getUserWantedAlerts().then((data) => {
      if (isCurrent) {
        setAlerts(data);
        setLoading(false);
      }
    });
    return () => {
      isCurrent = false;
    };
  }, [isOpen]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || maxPrice <= 0) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await createWantedAlert(
        title,
        category === "" ? null : category,
        maxPrice,
      );
      if (res.success) {
        setTitle("");
        setMaxPrice(400);
        setFeedback(res.message || "Alert saved!");
        await refreshAlerts();
      } else {
        setFeedback(res.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteWantedAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // ignore
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-lg border border-[#e2dfd8] bg-white p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-[#eeebe5] pb-3">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded bg-[#edf4e2] text-[#425d1e]">
              <BellRing size={16} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#282342]">Never Miss What You Need</h2>
              <p className="text-xs text-[#77747e]">Set alerts for essentials you want on campus.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-md text-[#77747e] hover:bg-[#f2efe9]"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Create Form */}
        <form onSubmit={handleCreate} className="rounded-md border border-[#eeebe5] bg-[#faf9f6] p-4 space-y-3">
          <h3 className="text-xs font-semibold text-[#282342]">Create a Wanted Alert</h3>

          <div>
            <label htmlFor="alert-title" className="block text-xs font-medium text-[#4b4657]">
              Item Name / Keyword
            </label>
            <input
              id="alert-title"
              type="text"
              placeholder="e.g. scientific calculator, Hercules cycle, semester 3 math"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 h-9 w-full rounded border border-[#dcd7df] bg-white px-3 text-xs text-[#282342] focus:border-[#514879] focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="alert-category" className="block text-xs font-medium text-[#4b4657]">
                Category
              </label>
              <select
                id="alert-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 h-9 w-full rounded border border-[#dcd7df] bg-white px-2.5 text-xs text-[#282342]"
              >
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="alert-price" className="block text-xs font-medium text-[#4b4657]">
                Max Budget (₹)
              </label>
              <input
                id="alert-price"
                type="number"
                min={1}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Math.max(1, Number(e.target.value)))}
                className="mt-1 h-9 w-full rounded border border-[#dcd7df] bg-white px-3 text-xs text-[#282342] focus:border-[#514879] focus:outline-none"
                required
              />
            </div>
          </div>

          {feedback && (
            <p className="text-xs font-medium text-[#425d1e] flex items-center gap-1">
              <Check size={13} /> {feedback}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-[#514879] px-4 text-xs font-semibold text-white transition hover:bg-[#40385f] disabled:opacity-50"
          >
            {submitting ? <LoaderCircle size={14} className="animate-spin" /> : <Plus size={14} />}
            Save Alert
          </button>
        </form>

        {/* Existing Alerts */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#77747e]">
            Your Active Wanted Alerts ({alerts.length})
          </h3>

          {loading ? (
            <div className="py-4 text-center text-xs text-[#77747e]">Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <p className="py-3 text-center text-xs text-[#77747e]">
              No active wanted alerts. Add one above to get notified automatically when seniors list it!
            </p>
          ) : (
            <ul className="max-h-48 divide-y divide-[#eeebe5] overflow-y-auto rounded border border-[#eeebe5] bg-white">
              {alerts.map((alert) => (
                <li key={alert.id} className="flex items-center justify-between p-2.5 text-xs">
                  <div>
                    <p className="font-semibold text-[#282342]">{alert.title}</p>
                    <p className="text-[11px] text-[#77747e]">
                      {alert.category ? `${alert.category} · ` : ""}Max {formatPaiseAsINR(alert.max_price_paise)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(alert.id)}
                    aria-label="Delete alert"
                    className="grid size-7 place-items-center rounded text-[#8e4235] hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
