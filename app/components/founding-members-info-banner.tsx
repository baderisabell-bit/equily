"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getUserSubscriptionSettings } from "../actions";

const DISMISS_KEY = "equiconnect-founding-info-dismissed";
const PENDING_KEY = "equiconnect-founding-info-pending";

export default function FoundingMembersInfoBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let pending = false;
    let role = "";
    let userId = Number.NaN;
    let dismissed = false;

    try {
      pending = window.sessionStorage.getItem(PENDING_KEY) === "1";
      role = String(window.sessionStorage.getItem("userRole") || "").trim().toLowerCase();
      userId = parseInt(window.sessionStorage.getItem("userId") || "", 10);
      dismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
      window.sessionStorage.removeItem(PENDING_KEY);
    } catch {
      return;
    }

    if (!pending || role !== "experte" || dismissed || Number.isNaN(userId) || userId <= 0) {
      return;
    }

    let cancelled = false;

    const loadSubscription = async () => {
      const res = await getUserSubscriptionSettings(userId);
      if (cancelled) return;

      if (!res.success || !res.data) {
        return;
      }

      const status = String(res.data.status || "").trim().toLowerCase();
      const planKey = String(res.data.plan_key || "").trim().toLowerCase();
      const hasActivePaidAbo = status === "active" && planKey !== "experte_free";

      if (!hasActivePaidAbo) {
        setOpen(true);
      }
    };

    loadSubscription();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Ignore storage write failures.
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[115] px-4 pb-4">
      <div className="mx-auto max-w-5xl rounded-[2rem] border border-emerald-200 bg-emerald-50 shadow-2xl overflow-hidden">
        <div className="px-6 py-5 md:px-8 md:py-6 flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div className="max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Gründungsmitglieder</p>
            <h2 className="mt-2 text-2xl font-black italic uppercase text-slate-900">Die ersten 100 Mitglieder sichern sich dauerhaft Rabatt</h2>
            <p className="mt-3 text-sm text-slate-700 leading-relaxed">
              Die ersten 2 Monate sind kostenlos. Danach bleibt für Gründungsmitglieder ein dauerhafter Rabatt aktiv.
            </p>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Die Website ist im Aufbau. Teile Fehler und Verbesserungsvorschläge gern über unser
              <Link href="/kontakt" className="ml-1 font-black text-emerald-700 hover:underline">Kontaktformular</Link>,
              damit wir Equily genau auf eure Wünsche zuschneiden können.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <button
              type="button"
              onClick={handleDismiss}
              className="px-5 py-3 rounded-xl border border-emerald-200 bg-white text-slate-700 text-[10px] font-black uppercase tracking-widest hover:border-emerald-300"
            >
              Ausblenden
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
