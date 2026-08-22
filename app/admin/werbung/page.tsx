"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { adminGetAdvertisingSubmissions, adminReviewAdvertisingSubmission, adminSetAdvertisingPlacement } from "../../actions";

type PlacementSlot = "none" | "startseite_top" | "startseite_sidebar";

type AdSubmission = {
  id: number;
  user_id: number;
  role: string;
  plan_key: string;
  title: string;
  description: string | null;
  media_url: string;
  target_url: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  placement_slot: PlacementSlot;
  placement_order: number;
  placement_enabled: boolean;
  visible_from: string | null;
  visible_until: string | null;
  vorname: string;
  nachname: string;
  email: string;
};

export default function AdminWerbungPage() {
  const [adminCode, setAdminCode] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [items, setItems] = useState<AdSubmission[]>([]);
  const [reviewNoteById, setReviewNoteById] = useState<Record<number, string>>({});
  const [placementSlotById, setPlacementSlotById] = useState<Record<number, PlacementSlot>>({});
  const [placementOrderById, setPlacementOrderById] = useState<Record<number, number>>({});
  const [placementEnabledById, setPlacementEnabledById] = useState<Record<number, boolean>>({});
  const [visibleFromById, setVisibleFromById] = useState<Record<number, string>>({});
  const [visibleUntilById, setVisibleUntilById] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const loadItems = async (code: string, filter: "pending" | "approved" | "rejected" | "all") => {
    setLoading(true);
    const res = await adminGetAdvertisingSubmissions(code, filter);
    if (!res.success) {
      setAuthorized(false);
      setAuthError(res.error || "Code ungültig.");
      setItems([]);
      setLoading(false);
      return;
    }
    setAuthorized(true);
    const loadedItems = (res.items || []) as AdSubmission[];
    setItems(loadedItems);
    setPlacementSlotById(Object.fromEntries(loadedItems.map((item) => [item.id, item.placement_slot || "none"])) as Record<number, PlacementSlot>);
    setPlacementOrderById(Object.fromEntries(loadedItems.map((item) => [item.id, Number(item.placement_order || 100)])) as Record<number, number>);
    setPlacementEnabledById(Object.fromEntries(loadedItems.map((item) => [item.id, Boolean(item.placement_enabled)])) as Record<number, boolean>);
    setVisibleFromById(
      Object.fromEntries(
        loadedItems.map((item) => [item.id, item.visible_from ? new Date(item.visible_from).toISOString().slice(0, 10) : ""])
      ) as Record<number, string>
    );
    setVisibleUntilById(
      Object.fromEntries(
        loadedItems.map((item) => [item.id, item.visible_until ? new Date(item.visible_until).toISOString().slice(0, 10) : ""])
      ) as Record<number, string>
    );
    setLoading(false);
  };

  useEffect(() => {
    const storedCode = sessionStorage.getItem("adminPanelCode") || "";
    if (!storedCode) {
      setLoading(false);
      return;
    }
    setAdminCode(storedCode);
    loadItems(storedCode, statusFilter);
  }, []);

  const authorize = async () => {
    setAuthError("");
    await loadItems(adminCode, statusFilter);
    sessionStorage.setItem("adminPanelCode", adminCode);
  };

  const changeFilter = async (filter: "pending" | "approved" | "rejected" | "all") => {
    setStatusFilter(filter);
    if (!authorized) return;
    await loadItems(adminCode, filter);
  };

  const decide = async (id: number, decision: "approved" | "rejected") => {
    setSavingId(id);
    const res = await adminReviewAdvertisingSubmission({
      adminCode,
      submissionId: id,
      decision,
      note: reviewNoteById[id] || "",
      placementSlot: placementSlotById[id] || "none",
      placementOrder: Number(placementOrderById[id] || 100),
      placementEnabled: Boolean(placementEnabledById[id]),
      visibleFrom: visibleFromById[id] || null,
      visibleUntil: visibleUntilById[id] || null,
    });
    setSavingId(null);

    if (!res.success) {
      alert(res.error || "Entscheidung fehlgeschlagen.");
      return;
    }

    await loadItems(adminCode, statusFilter);
  };

  const savePlacement = async (id: number) => {
    setSavingId(id);
    const res = await adminSetAdvertisingPlacement({
      adminCode,
      submissionId: id,
      placementSlot: placementSlotById[id] || "none",
      placementOrder: Number(placementOrderById[id] || 100),
      placementEnabled: Boolean(placementEnabledById[id]),
      visibleFrom: visibleFromById[id] || null,
      visibleUntil: visibleUntilById[id] || null,
      note: reviewNoteById[id] || "",
    });
    setSavingId(null);

    if (!res.success) {
      alert(res.error || "Platzierung konnte nicht gespeichert werden.");
      return;
    }

    await loadItems(adminCode, statusFilter);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-10">
        <p className="text-sm font-black uppercase tracking-widest text-slate-400">Lade Werbeprüfung...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 md:p-12">
        <div className="max-w-xl mx-auto bg-white border border-slate-100 rounded-[2rem] shadow-sm p-8 space-y-6">
          <h1 className="text-2xl font-black uppercase italic text-slate-900">Admin Werbung</h1>
          <p className="text-sm font-bold text-slate-500">Bitte Admin-Code eingeben.</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-200 bg-emerald-50 text-emerald-700">Admin-Zentrale</Link>
            <Link href="/admin/verifizierung" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600">Verifizierung</Link>
            <Link href="/admin/kontakt" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600">Kontakt</Link>
            <Link href="/admin/moderation" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600">Moderation</Link>
            <Link href="/admin/werbung" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white">Werbung</Link>
          </div>
          <input
            type="password"
            value={adminCode}
            onChange={(e) => setAdminCode(e.target.value)}
            placeholder="Admin-Code"
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-300"
          />
          {authError && <p className="text-sm font-bold text-red-500">{authError}</p>}
          <button type="button" onClick={authorize} className="w-full px-6 py-3 rounded-xl bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest">
            Zugriff prüfen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 md:p-12 space-y-6">
      <header className="max-w-7xl mx-auto space-y-3">
        <h1 className="text-3xl font-black uppercase italic text-slate-900">Admin Werbung</h1>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Eingereichte Werbungen prüfen und freigeben</p>
        <p className="text-xs text-slate-600">Freigabe und Platzierung werden hier zentral gesteuert.</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-200 bg-emerald-50 text-emerald-700">Admin-Zentrale</Link>
          {(["pending", "approved", "rejected", "all"] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => changeFilter(filter)}
              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${statusFilter === filter ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}
            >
              {filter === "pending" ? "Offen" : filter === "approved" ? "Freigegeben" : filter === "rejected" ? "Abgelehnt" : "Alle"}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <article key={`ad-${item.id}`} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-black uppercase text-slate-900">{item.title}</p>
              <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${item.status === "approved" ? "bg-emerald-100 text-emerald-700" : item.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                {item.status}
              </span>
            </div>
            <p className="text-[11px] font-bold uppercase text-slate-500">{item.vorname} {item.nachname} · {item.email} · {item.plan_key}</p>
            {item.description && <p className="text-sm text-slate-700 whitespace-pre-wrap">{item.description}</p>}
            <img src={item.media_url} alt={item.title} className="w-full h-44 object-cover rounded-xl border border-slate-200" />
            {item.target_url && <p className="text-[11px] text-emerald-700 break-all">{item.target_url}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="text-[11px] font-black uppercase text-slate-500">
                Platzierung
                <select
                  value={placementSlotById[item.id] || "none"}
                  onChange={(e) => setPlacementSlotById((prev) => ({ ...prev, [item.id]: e.target.value as PlacementSlot }))}
                  className="mt-1 w-full p-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="none">Keine Platzierung</option>
                  <option value="startseite_top">Startseite - Top</option>
                  <option value="startseite_sidebar">Startseite - Sidebar</option>
                </select>
              </label>
              <label className="text-[11px] font-black uppercase text-slate-500">
                Sortierung
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={placementOrderById[item.id] || 100}
                  onChange={(e) => setPlacementOrderById((prev) => ({ ...prev, [item.id]: Number(e.target.value || 100) }))}
                  className="mt-1 w-full p-2 rounded-xl border border-slate-200 bg-white"
                />
              </label>
              <label className="text-[11px] font-black uppercase text-slate-500">
                Sichtbar von
                <input
                  type="date"
                  value={visibleFromById[item.id] || ""}
                  onChange={(e) => setVisibleFromById((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  className="mt-1 w-full p-2 rounded-xl border border-slate-200 bg-white"
                />
              </label>
              <label className="text-[11px] font-black uppercase text-slate-500">
                Sichtbar bis
                <input
                  type="date"
                  value={visibleUntilById[item.id] || ""}
                  onChange={(e) => setVisibleUntilById((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  className="mt-1 w-full p-2 rounded-xl border border-slate-200 bg-white"
                />
              </label>
            </div>
            <label className="inline-flex items-center gap-2 text-[11px] font-black uppercase text-slate-600">
              <input
                type="checkbox"
                checked={Boolean(placementEnabledById[item.id])}
                onChange={(e) => setPlacementEnabledById((prev) => ({ ...prev, [item.id]: e.target.checked }))}
              />
              Platzierung aktiv
            </label>
            {item.status === "pending" && (
              <>
                <textarea
                  value={reviewNoteById[item.id] || ""}
                  onChange={(e) => setReviewNoteById((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  rows={2}
                  placeholder="Admin-Notiz"
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50"
                />
                <div className="flex gap-2">
                  <button type="button" disabled={savingId === item.id} onClick={() => decide(item.id, "approved")} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-emerald-600 text-white">
                    Freigeben
                  </button>
                  <button type="button" disabled={savingId === item.id} onClick={() => decide(item.id, "rejected")} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-red-200 text-red-600">
                    Ablehnen
                  </button>
                </div>
              </>
            )}
            {item.status === "approved" && (
              <button type="button" disabled={savingId === item.id} onClick={() => savePlacement(item.id)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-slate-900 text-white">
                Platzierung speichern
              </button>
            )}
            {item.admin_note && <p className="text-[11px] font-bold text-slate-700">Notiz: {item.admin_note}</p>}
          </article>
        ))}
        {items.length === 0 && (
          <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-6">
            <p className="text-sm text-slate-500">Keine Einreichungen für diesen Filter.</p>
          </div>
        )}
      </main>
    </div>
  );
}
