"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, BellRing, Shield, Sparkles, Megaphone, Users, CalendarCheck2, Trash2 } from "lucide-react";
import { adminDeleteUser, adminDeleteUserPosts, adminFindUserByIdentity, adminLogout, adminLogin } from "../actions";

type AdminUser = {
  id: number;
  vorname: string;
  nachname: string;
  email: string;
  role: string;
  birth_date?: string | null;
};

type AdminSection = {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
};

const ADMIN_SECTIONS: AdminSection[] = [
  {
    href: "/admin/moderation",
    title: "Moderation",
    description: "Meldungen, Chats, Profile und Sanktionen verwalten.",
    icon: <Shield size={18} />,
  },
  {
    href: "/admin/verifizierung",
    title: "Verifizierung",
    description: "Profile prüfen und verifizierte Angaben freigeben.",
    icon: <BadgeCheck size={18} />,
  },
  {
    href: "/admin/kontakt",
    title: "Kontakt",
    description: "Support-Nachrichten und Tickets ansehen.",
    icon: <BellRing size={18} />,
  },
  {
    href: "/admin/werbung",
    title: "Werbung",
    description: "Anzeigen- und Marketingfreigaben prüfen.",
    icon: <Megaphone size={18} />,
  },
  {
    href: "/admin/early-access",
    title: "Early Access",
    description: "Frühzugriff-Statistiken und Aktivierungen ansehen.",
    icon: <CalendarCheck2 size={18} />,
  },
];

export default function AdminHomePage() {
  const [adminCode, setAdminCode] = useState('');
  const [searchUserId, setSearchUserId] = useState('');
  const [searchFirstName, setSearchFirstName] = useState('');
  const [searchLastName, setSearchLastName] = useState('');
  const [searchBirthDate, setSearchBirthDate] = useState('');
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [searchedUser, setSearchedUser] = useState<AdminUser | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  useEffect(() => {
    setAdminCode(sessionStorage.getItem('adminPanelCode') || '');
  }, []);

  const onLogout = async () => {
    sessionStorage.removeItem("adminPanelCode");
    await adminLogout();
    window.location.href = "/admin/login";
  };

  const searchUser = async () => {
    if (!adminCode.trim()) {
      const code = window.prompt('Admin-Code eingeben');
      if (!code) return;
      sessionStorage.setItem('adminPanelCode', String(code));
      setAdminCode(String(code));
    }

    setSearchBusy(true);
    const res = await adminFindUserByIdentity({
      adminCode,
      userId: searchUserId,
      firstName: searchFirstName,
      lastName: searchLastName,
      birthDate: searchBirthDate,
      showAll: showAllUsers,
    } as any);
    setSearchBusy(false);

    if (!res.success) {
      alert(res.error || 'Nutzer konnte nicht gefunden werden.');
      return;
    }

    setUsers((res.users || []) as AdminUser[]);
    setSearchedUser((res.user || (res.users || [])[0] || null) as AdminUser | null);
  };

  const deleteUser = async () => {
    if (!adminCode.trim()) {
      const code = window.prompt('Admin-Code eingeben');
      if (!code) return;
      sessionStorage.setItem('adminPanelCode', String(code));
      setAdminCode(String(code));
    }
    if (!searchedUser) return;
    if (!confirm('Profil wirklich dauerhaft löschen?')) return;

    setDeleteBusy(true);
    const res = await adminDeleteUser({ adminCode, userId: searchedUser.id } as any);
    setDeleteBusy(false);

    if (!res.success) {
      alert(res.error || 'Löschen fehlgeschlagen.');
      return;
    }

    alert('Profil gelöscht.');
    setSearchedUser(null);
    setUsers([]);
  };

  const deleteUserPosts = async () => {
    if (!adminCode.trim()) {
      const code = window.prompt('Admin-Code eingeben');
      if (!code) return;
      sessionStorage.setItem('adminPanelCode', String(code));
      setAdminCode(String(code));
    }
    if (!searchedUser) return;
    if (!confirm('Alle Beiträge dieses Profils löschen?')) return;

    setDeleteBusy(true);
    const res = await adminDeleteUserPosts({ adminCode, userId: searchedUser.id } as any);
    setDeleteBusy(false);

    if (!res.success) {
      alert(res.error || 'Beiträge konnten nicht gelöscht werden.');
      return;
    }

    alert('Beiträge gelöscht.');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#f8fafc,_#eef8f2_45%,_#ffffff_100%)] text-slate-900">
      <main className="max-w-6xl mx-auto px-5 py-10 md:py-14 space-y-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white/90 backdrop-blur p-8 md:p-10 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-700">Admin Hub</p>
              <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tight text-slate-900">Zentrale Administration</h1>
              <p className="text-sm md:text-base text-slate-600 leading-relaxed">
                Von hier aus springst du direkt zu Moderation, Verifizierung, Kontakt, Werbung, Newsletter und Early Access.
                Der Bereich ist per Passwort geschuetzt.
              </p>
            </div>

            <div className="w-full md:w-auto">
              {!adminCode.trim() ? (
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    placeholder="Admin-Code"
                    className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    type="button"
                    disabled={loginBusy}
                    onClick={async () => {
                      setLoginError('');
                      setLoginBusy(true);
                      const res = await adminLogin(adminPasswordInput || '');
                      setLoginBusy(false);
                      if (!res.success) {
                        setLoginError(res.error || 'Login fehlgeschlagen');
                        return;
                      }
                      sessionStorage.setItem('adminPanelCode', String(adminPasswordInput || ''));
                      setAdminCode(String(adminPasswordInput || ''));
                      setAdminPasswordInput('');
                      window.location.href = '/admin';
                    }}
                    className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
                  >
                    {loginBusy ? 'Prüfe...' : 'Anmelden'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-[10px] font-black uppercase tracking-widest"
                >
                  Abmelden
                </button>
              )}
              {loginError && <p className="text-sm font-bold text-red-600 mt-2">{loginError}</p>}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ADMIN_SECTIONS.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                    {section.icon}
                  </span>
                  <div>
                    <h2 className="text-lg font-black italic uppercase tracking-tight text-slate-900">{section.title}</h2>
                    <p className="mt-1 text-sm text-slate-600">{section.description}</p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </section>

        <section className="rounded-[1.75rem] border border-emerald-100 bg-emerald-50 p-5 md:p-6">
          <div className="flex items-start gap-3">
            <CalendarCheck2 size={18} className="mt-1 text-emerald-700" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Moderation</p>
              <p className="mt-2 text-sm text-emerald-900 leading-relaxed">
                Lösch- und Moderationsfunktionen findest du im <Link href="/admin/moderation" className="font-black underline underline-offset-2">Moderation</Link>-Bereich.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-emerald-100 bg-emerald-50 p-5 md:p-6">
          <div className="flex items-start gap-3">
            <CalendarCheck2 size={18} className="mt-1 text-emerald-700" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Hinweis</p>
              <p className="mt-2 text-sm text-emerald-900 leading-relaxed">
                Das Passwort wird nur für die Admin-Sitzung verwendet. Bei Logout oder Ablauf musst du dich erneut anmelden.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}