"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getResolvedUserRole } from '../actions';
import PublicContactForm from '../components/public-contact-form';
import LoggedInHeader from '../components/logged-in-header';

export default function KontaktUndFaqPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [canCloseSidebar, setCanCloseSidebar] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [userName, setUserName] = useState('Profil');
  useEffect(() => {
    const currentRole = sessionStorage.getItem('userRole');
    const userIdRaw = sessionStorage.getItem('userId');
    const parsedId = userIdRaw ? parseInt(userIdRaw, 10) : NaN;
    setRole(currentRole);
    setUserName(sessionStorage.getItem('userName') || (currentRole === 'experte' ? 'Experte' : 'Nutzer'));
    if (!Number.isNaN(parsedId) && parsedId > 0) {
      setUserId(parsedId);
      getResolvedUserRole(parsedId).then((roleRes) => {
        if (roleRes.success && roleRes.role) {
          setRole(roleRes.role);
          sessionStorage.setItem('userRole', roleRes.role);
        }
      }).catch(() => {
        // Keep the session role when resolving fails.
      });
    }
  }, []);

  const openProfile = () => {
    const userIdRaw = sessionStorage.getItem('userId');
    const parsedUserId = userIdRaw ? parseInt(userIdRaw, 10) : NaN;
    if (!Number.isNaN(parsedUserId) && parsedUserId > 0) {
      window.location.href = `/profil/${parsedUserId}`;
      return;
    }
    window.location.href = '/login';
  };

  const handleLogout = () => {
    sessionStorage.clear();
    window.location.href = '/';
  };

  const openSidebar = () => {
    setSidebarOpen(true);
    setCanCloseSidebar(false);
    window.setTimeout(() => {
      setCanCloseSidebar(true);
    }, 180);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
    setCanCloseSidebar(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => {
          if (!canCloseSidebar) return;
          closeSidebar();
        }}
      />
      <aside className={`fixed left-0 top-0 h-full w-72 bg-white z-[70] shadow-2xl transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} p-6 flex flex-col`}>
        <div className="flex justify-between items-center mb-8 text-emerald-600 font-black italic tracking-tighter">MENÜ <button onClick={closeSidebar} className="text-slate-300">×</button></div>
        <nav className="space-y-5 flex-grow">
          <button type="button" onClick={() => { closeSidebar(); window.location.href = '/'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Startseite</button>
          {role && <button type="button" onClick={() => { closeSidebar(); openProfile(); }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Mein Profil</button>}
          {role && <button type="button" onClick={() => { closeSidebar(); window.location.href = '/suche'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Suche</button>}
          {role && <button type="button" onClick={() => { closeSidebar(); window.location.href = '/netzwerk'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Netzwerk</button>}
          {role && <button type="button" onClick={() => { closeSidebar(); window.location.href = '/merkliste'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Merkliste</button>}
          {role && <button type="button" onClick={() => { closeSidebar(); window.location.href = '/nachrichten'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Nachrichten</button>}

          {role && <button type="button" onClick={() => { closeSidebar(); window.location.href = '/einstellungen'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Einstellungen</button>}
          <button type="button" onClick={() => { closeSidebar(); window.location.href = '/kontakt'; }} className="block text-left text-lg font-black italic uppercase text-emerald-600">Kontakt & FAQ</button>
        </nav>
        {role && (
          <button onClick={handleLogout} className="mt-auto p-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">Abmelden</button>
        )}
      </aside>

      <LoggedInHeader
        userId={userId}
        role={role}
        userName={userName}
        onOpenSidebar={openSidebar}
        onOpenProfile={openProfile}
      />
          
      <main className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-[1fr_0.95fr] gap-8 items-start">
        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Kontakt & FAQ</p>
            <h1 className="mt-2 text-3xl font-black italic uppercase tracking-tight text-slate-900">Schreib uns eine Nachricht</h1>
            <p className="mt-3 text-sm font-medium text-slate-600">
              Hier findest du Antworten und Hinweise rund um Registrierung, Login und Support.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
              <p className="text-[10px] font-black uppercase text-slate-700">Wie erstelle ich ein Profil?</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Über die Registrierungsseiten für Nutzer oder Experten.</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
              <p className="text-[10px] font-black uppercase text-slate-700">Wie läuft die Verifizierung ab?</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Die Prüfung erfolgt nach dem Anlegen des Profils durch unser Team.</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
              <p className="text-[10px] font-black uppercase text-slate-700">Wie kontaktiere ich Support?</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Nutze dafür das Formular in der rechten Sidebar.</p>
            </div>
          </div>
        </section>

        <aside className="lg:sticky lg:top-6">
          <PublicContactForm />
        </aside>
      </main>
    </div>
  );
}
