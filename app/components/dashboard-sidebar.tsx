"use client";

import React from "react";
import Link from "next/link";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile?: () => void;
  role?: string | null;
};

export default function DashboardSidebar({ isOpen, onClose, onOpenProfile, role }: Props) {
  if (!isOpen) return null;

  const openProfile = () => {
    if (onOpenProfile) return onOpenProfile();
    window.location.href = '/login';
  };

  return (
    <>
      <button type="button" aria-label="Menü schließen" onClick={onClose} className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm" />
      <aside className="fixed left-0 top-0 z-[70] h-full w-72 bg-white shadow-2xl transition-transform duration-300 p-6 flex flex-col">
        <div className="flex justify-between items-center mb-8 text-emerald-600 font-black italic tracking-tighter">
          MENÜ
          <button onClick={onClose} className="text-slate-300 text-xl leading-none">×</button>
        </div>
        <nav className="space-y-5 flex-grow">
          <Link href="/" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Startseite</Link>
          {role === 'experte' ? (
            <>
              <button type="button" onClick={openProfile} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Mein Profil</button>
            </>
          ) : (
            <>
              <button type="button" onClick={openProfile} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Mein Profil</button>
            </>
          )}
          <Link href="/suche" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Suche</Link>
          <Link href="/netzwerk" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Netzwerk</Link>
          <Link href="/nachrichten" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Nachrichten</Link>
          <Link href="/merkliste" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Merkliste</Link>
          <Link href="/einstellungen" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Einstellungen</Link>
          <Link href="/kontakt" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Kontakt &amp; FAQ</Link>
        </nav>
        <button onClick={() => { sessionStorage.clear(); window.location.href = '/'; }} className="mt-auto p-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">Abmelden</button>
      </aside>
    </>
  );
}
