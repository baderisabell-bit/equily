"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Shield, Vote } from "lucide-react";
import { adminApplyUserSanction, adminFindUserByIdentity, getChatTranscriptForModeration, getModerationDashboard, reviewAnimalWelfareCase, reviewChatReport } from "../../actions";

type ChatReport = {
  id: number;
  chat_id: number;
  reporter_user_id: number;
  reported_user_id: number;
  reason: string;
  severity: "normal" | "strong" | "animal_abuse";
  status: string;
  false_accusation: boolean;
  review_note: string | null;
  created_at: string;
  reporter_vorname: string;
  reporter_nachname: string;
  reported_vorname: string;
  reported_nachname: string;
};

type ProfileReport = {
  id: number;
  profile_user_id: number;
  reporter_user_id: number;
  reason: string;
  status: string;
  created_at: string;
  reporter_vorname: string;
  reporter_nachname: string;
  reported_vorname: string;
  reported_nachname: string;
  reported_birth_date: string | null;
};

type TranscriptMessage = {
  id: number;
  sender_id: number;
  nachricht: string;
  created_at: string;
  vorname: string;
  nachname: string;
};

type WelfareCase = {
  id: number;
  accused_user_id: number;
  title: string;
  description: string;
  status: "voting" | "suspended" | "cleared";
  vote_end_at: string;
  public_note: string | null;
  created_at: string;
  vorname: string;
  nachname: string;
  yes_count: number;
  no_count: number;
};

type Sanction = {
  id: number;
  user_id: number;
  source: string;
  severity: string;
  scope: string;
  reason: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  vorname: string;
  nachname: string;
};

type IdentityUser = {
  id: number;
  vorname: string;
  nachname: string;
  email: string;
  role: string;
  birth_date?: string | null;
};

export default function AdminModerationPage() {
  const [adminCode, setAdminCode] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(true);

  const [reports, setReports] = useState<ChatReport[]>([]);
  const [profileReports, setProfileReports] = useState<ProfileReport[]>([]);
  const [cases, setCases] = useState<WelfareCase[]>([]);
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [activeReportId, setActiveReportId] = useState<number | null>(null);
  const [transcriptMessages, setTranscriptMessages] = useState<TranscriptMessage[]>([]);
  const [transcriptBusy, setTranscriptBusy] = useState(false);

  const [searchFirstName, setSearchFirstName] = useState('');
  const [searchLastName, setSearchLastName] = useState('');
  const [searchBirthDate, setSearchBirthDate] = useState('');
  const [searchedUser, setSearchedUser] = useState<IdentityUser | null>(null);
  const [users, setUsers] = useState<IdentityUser[]>([]);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [sanctionReason, setSanctionReason] = useState('');
  const [sanctionDays, setSanctionDays] = useState(30);
  const [sanctionAction, setSanctionAction] = useState<'warn' | 'global_block' | 'group_block' | 'abo_block' | 'temporary_block'>('warn');
  const [sanctionBusy, setSanctionBusy] = useState(false);

  const [reviewNote, setReviewNote] = useState("");
  const [saving, setSaving] = useState(false);

  const resolveAdminCode = (allowPrompt: boolean = false) => {
    const storedCode = String(sessionStorage.getItem('adminPanelCode') || '').trim();
    if (storedCode) {
      if (storedCode !== adminCode) setAdminCode(storedCode);
      return storedCode;
    }

    const currentCode = String(adminCode || '').trim();
    if (currentCode) {
      sessionStorage.setItem('adminPanelCode', currentCode);
      return currentCode;
    }

    if (!allowPrompt) return '';

    const code = window.prompt('Admin-Code eingeben') || '';
    const normalized = String(code).trim();
    if (normalized) {
      sessionStorage.setItem('adminPanelCode', normalized);
      setAdminCode(normalized);
    }
    return normalized;
  };

  const loadDashboard = async (code: string) => {
    setLoading(true);
    const res = await getModerationDashboard(code);
    if (!res.success) {
      setAuthorized(false);
      setAuthError(res.error || "Code ungültig.");
      setLoading(false);
      return;
    }

    setAuthorized(true);
    setReports((res.reports || []) as ChatReport[]);
    setProfileReports((res.profileReports || []) as ProfileReport[]);
    setCases((res.cases || []) as WelfareCase[]);
    setSanctions((res.sanctions || []) as Sanction[]);
    if ((res.reports || []).length > 0) {
      setActiveReportId(Number((res.reports || [])[0].id));
    }
    setLoading(false);
  };

  useEffect(() => {
    const storedCode = sessionStorage.getItem("adminPanelCode") || "";
    if (!storedCode) {
      setLoading(false);
      return;
    }

    setAdminCode(storedCode);
    loadDashboard(storedCode);
  }, []);

  const authorize = async () => {
    setAuthError("");
    await loadDashboard(adminCode);
    if (!authError) {
      sessionStorage.setItem("adminPanelCode", adminCode);
    }
  };

  const activeReport = useMemo(
    () => reports.find((item) => item.id === activeReportId) || null,
    [reports, activeReportId]
  );

  const saveReportReview = async (markFalseAccusation: boolean) => {
    if (!activeReport) return;
    setSaving(true);
    const res = await reviewChatReport({
      adminCode,
      reportId: activeReport.id,
      markFalseAccusation,
      reviewNote,
    });
    setSaving(false);

    if (!res.success) {
      alert(res.error || "Review fehlgeschlagen.");
      return;
    }

    setReviewNote("");
    await loadDashboard(adminCode);
  };

  const openChatTranscript = async (reportId: number) => {
    setTranscriptBusy(true);
    const res = await getChatTranscriptForModeration({ adminCode, reportId });
    setTranscriptBusy(false);
    if (!res.success) {
      alert(res.error || 'Chat-Verlauf konnte nicht geladen werden.');
      return;
    }

    setTranscriptMessages((res.messages || []) as TranscriptMessage[]);
  };

  const searchUser = async () => {
    const code = resolveAdminCode(true);
    if (!code) return;

    const res = await adminFindUserByIdentity(code, {
      firstName: searchFirstName,
      lastName: searchLastName,
      birthDate: searchBirthDate,
      showAll: showAllUsers,
    });
    if (!res.success) {
      alert(res.error || 'Nutzer konnte nicht gefunden werden.');
      return;
    }
    setUsers((res.users || []) as IdentityUser[]);
    setSearchedUser((res.user || (res.users || [])[0] || null) as IdentityUser | null);
  };

  const loadAllUsers = async () => {
    const code = resolveAdminCode(true);
    if (!code) return;

    const res = await adminFindUserByIdentity(code, { showAll: true });
    if (!res.success) return alert(res.error || 'Konnte Nutzerliste nicht laden.');
    setUsers((res.users || []) as IdentityUser[]);
    setSearchedUser((res.user || (res.users || [])[0] || null) as IdentityUser | null);
  };

  const applySanction = async () => {
    setSanctionBusy(true);
    const code = resolveAdminCode(true);
    if (!code) {
      setSanctionBusy(false);
      return;
    }

    const res = await adminApplyUserSanction({
      adminCode: code,
      firstName: searchFirstName,
      lastName: searchLastName,
      birthDate: searchBirthDate,
      action: sanctionAction,
      durationDays: sanctionDays,
      reason: sanctionReason,
    });
    setSanctionBusy(false);

    if (!res.success) {
      alert(res.error || 'Sanktion konnte nicht angewendet werden.');
      return;
    }

    setSanctionReason('');
    await loadDashboard(adminCode);
  };

  const decideWelfareCase = async (caseId: number, outcome: "suspend" | "clear") => {
    setSaving(true);
    const code = resolveAdminCode(true);
    if (!code) {
      setSaving(false);
      return;
    }
    const res = await reviewAnimalWelfareCase({
      adminCode: code,
      caseId,
      outcome,
      note: reviewNote,
    });
    setSaving(false);

    if (!res.success) {
      alert(res.error || "Entscheidung fehlgeschlagen.");
      return;
    }

    setReviewNote("");
    await loadDashboard(adminCode);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-10">
        <p className="text-sm font-black uppercase tracking-widest text-slate-400">Lade Moderation...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 md:p-12 font-sans text-slate-900">
        <div className="max-w-xl mx-auto bg-white border border-slate-100 rounded-[2rem] shadow-sm p-8 space-y-6">
          <h1 className="text-2xl font-black uppercase italic text-slate-900">Admin Moderation</h1>
          <p className="text-sm font-bold text-slate-500">Bitte Admin-Code eingeben.</p>

          <div className="flex flex-wrap gap-2">
            <Link href="/admin" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300">Admin-Zentrale</Link>
            <Link href="/admin/verifizierung" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600 hover:border-emerald-300">Verifizierung</Link>
            <Link href="/admin/kontakt" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600 hover:border-emerald-300">Kontakt-Tickets</Link>
            <Link href="/admin/moderation" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white">Moderation</Link>
            <Link href="/admin/werbung" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600 hover:border-emerald-300">Werbung</Link>
          </div>

          <input
            type="password"
            value={adminCode}
            onChange={(e) => setAdminCode(e.target.value)}
            placeholder="Admin-Code"
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-300"
          />

          {authError && <p className="text-sm font-bold text-red-500">{authError}</p>}

          <button
            type="button"
            onClick={authorize}
            className="w-full px-6 py-3 rounded-xl bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-emerald-500"
          >
            Zugriff prüfen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 md:p-12 font-sans text-slate-900 space-y-8">
      <header className="max-w-7xl mx-auto space-y-3">
        <h1 className="text-3xl font-black uppercase italic text-slate-900">Admin Moderation</h1>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No-Tolerance Meldungen, Tierwohl-Fälle und Sanktionen</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300">Admin-Zentrale</Link>
          <Link href="/admin/verifizierung" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600 hover:border-emerald-300">Verifizierung</Link>
          <Link href="/admin/kontakt" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600 hover:border-emerald-300">Kontakt-Tickets</Link>
          <Link href="/admin/moderation" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white">Moderation</Link>
          <Link href="/admin/werbung" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600 hover:border-emerald-300">Werbung</Link>
          <a href="#user-delete-section" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-red-600 text-white hover:bg-red-500">Nutzer löschen</a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
        <section className="bg-white border border-slate-100 rounded-[2rem] p-5 shadow-sm space-y-2 max-h-[76vh] overflow-auto">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chat-Meldungen</p>
          {reports.map((item) => (
            <button
              key={`r-${item.id}`}
              type="button"
              onClick={() => setActiveReportId(item.id)}
              className={`w-full text-left p-3 rounded-xl border ${activeReportId === item.id ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}
            >
              <p className="text-sm font-black uppercase text-slate-900">#{item.id} • {item.severity}</p>
              <p className="text-[10px] font-black uppercase text-slate-500 mt-1">{item.reporter_vorname} {item.reporter_nachname} → {item.reported_vorname} {item.reported_nachname}</p>
            </button>
          ))}

          <p className="pt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Profil-Meldungen</p>
          {profileReports.map((item) => (
            <div key={`pr-${item.id}`} className="w-full text-left p-3 rounded-xl border border-slate-200 bg-white">
              <p className="text-sm font-black uppercase text-slate-900">#{item.id} • {item.status}</p>
              <p className="text-[10px] font-black uppercase text-slate-500 mt-1">{item.reporter_vorname} {item.reporter_nachname} → {item.reported_vorname} {item.reported_nachname}</p>
              <p className="text-[10px] font-black uppercase text-slate-400 mt-1">{item.reported_birth_date || 'ohne Geburtsdatum'}</p>
              <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{item.reason}</p>
            </div>
          ))}
        </section>

        <section className="space-y-6">
          <article className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600" />
              <h2 className="text-lg font-black uppercase italic text-slate-900">Meldungs-Review</h2>
            </div>

            {!activeReport ? (
              <p className="text-sm text-slate-500">Keine Meldung ausgewählt.</p>
            ) : (
              <>
                <p className="text-sm font-black uppercase text-slate-900">Report #{activeReport.id} • Status: {activeReport.status}</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{activeReport.reason}</p>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={3}
                  placeholder="Admin-Notiz"
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => saveReportReview(false)}
                    className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-slate-900 text-white"
                  >
                    Als bestätigt markieren
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => saveReportReview(true)}
                    className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-emerald-300 text-emerald-700"
                  >
                    Falschanschuldigung / Entlasten
                  </button>
                  <button
                    type="button"
                    disabled={transcriptBusy}
                    onClick={() => openChatTranscript(activeReport.id)}
                    className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-300 text-slate-700"
                  >
                    Konversation laden
                  </button>
                </div>
                {transcriptMessages.length > 0 && (
                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chat-Verlauf</p>
                    {transcriptMessages.map((message) => (
                      <div key={message.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                        <p className="text-[10px] font-black uppercase text-slate-500">{message.vorname} {message.nachname} • {new Date(message.created_at).toLocaleString('de-DE')}</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap mt-1">{message.nachricht}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </article>

          <article className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Vote size={16} className="text-red-600" />
              <h2 className="text-lg font-black uppercase italic text-slate-900">Tierwohl-Fälle</h2>
            </div>
            <div className="space-y-3">
              {cases.map((item) => (
                <div key={`case-${item.id}`} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <p className="text-sm font-black uppercase text-slate-900">#{item.id} • {item.title}</p>
                  <p className="text-[10px] font-black uppercase text-slate-500">{item.vorname} {item.nachname} • Status: {item.status}</p>
                  <p className="text-xs font-black uppercase text-slate-600">Stimmen: Ja {item.yes_count} / Nein {item.no_count}</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{item.description}</p>
                  {item.status === "voting" ? (
                    <div className="flex gap-2">
                      <button type="button" disabled={saving} onClick={() => decideWelfareCase(item.id, "suspend")} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-red-600 text-white">6 Monate sperren</button>
                      <button type="button" disabled={saving} onClick={() => decideWelfareCase(item.id, "clear")} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-emerald-300 text-emerald-700">Als unbegründet schließen</button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </article>

          <article className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-slate-700" />
              <h2 className="text-lg font-black uppercase italic text-slate-900">Aktuelle Sanktionen</h2>
            </div>
            <div className="space-y-2 max-h-64 overflow-auto">
              {sanctions.map((item) => (
                <div key={`san-${item.id}`} className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <p className="text-sm font-black uppercase text-slate-900">{item.vorname} {item.nachname}</p>
                  <p className="text-[10px] font-black uppercase text-slate-500">{item.severity} • {item.scope} • {item.source}</p>
                  <p className="text-[10px] font-black uppercase text-slate-500">Bis: {new Date(item.ends_at).toLocaleDateString("de-DE")}{item.is_active ? " (aktiv)" : ""}</p>
                </div>
              ))}
            </div>
          </article>

          <article id="user-delete-section" className="bg-red-50 border border-red-100 rounded-[2rem] p-6 shadow-sm space-y-4 ring-1 ring-red-100">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-600" />
              <h2 className="text-lg font-black uppercase italic text-slate-900">Nutzer anzeigen & Profil löschen</h2>
            </div>
            <p className="text-sm text-slate-600 font-medium">Hier kannst du Nutzer suchen, alle Nutzer anzeigen und das Profil dauerhaft löschen.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={searchFirstName} onChange={(e) => setSearchFirstName(e.target.value)} placeholder="Vorname" className="p-3 rounded-xl border border-slate-200 bg-slate-50" />
                <input value={searchLastName} onChange={(e) => setSearchLastName(e.target.value)} placeholder="Nachname" className="p-3 rounded-xl border border-slate-200 bg-slate-50" />
                <input value={searchBirthDate} onChange={(e) => setSearchBirthDate(e.target.value)} type="date" className="p-3 rounded-xl border border-slate-200 bg-slate-50" />
                <div className="flex gap-2">
                  <button type="button" onClick={searchUser} className="px-4 py-3 rounded-xl text-[10px] font-black uppercase bg-slate-900 text-white">Nutzer suchen</button>
                  <button
                    type="button"
                    onClick={async () => {
                      const next = !showAllUsers;
                      setShowAllUsers(next);
                      if (next) {
                        await loadAllUsers();
                      }
                    }}
                    className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase ${showAllUsers ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}
                  >
                    {showAllUsers ? 'Alle anzeigen (Aus)' : 'Alle Nutzer anzeigen'}
                  </button>
                  <button type="button" onClick={loadAllUsers} className="px-4 py-3 rounded-xl text-[10px] font-black uppercase border border-emerald-200 bg-emerald-50 text-emerald-700">Liste laden</button>
                </div>
            </div>
            <div className="space-y-2 pt-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Gefundene Nutzer</p>
              <div className="space-y-2 max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white p-2">
                {users.length === 0 ? (
                  <p className="px-2 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Noch keine Treffer. Suche starten oder "Liste laden" klicken.</p>
                ) : (
                  users.map((user) => {
                    const selected = searchedUser?.id === user.id;
                    return (
                      <button
                        key={`u-${user.id}`}
                        type="button"
                        onClick={() => setSearchedUser(user)}
                        className={`w-full text-left p-3 rounded-xl border ${selected ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                      >
                        <p className="text-sm font-black uppercase text-slate-900">#{user.id} {user.vorname} {user.nachname}</p>
                        <p className="text-[10px] font-black uppercase text-slate-500">{user.email} • {user.role}</p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-xl border border-red-200 bg-white p-4 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-700">Ausgewählter Nutzer</p>
              {searchedUser ? (
                <>
                  <div>
                    <p className="text-sm font-black uppercase text-slate-900">#{searchedUser.id} {searchedUser.vorname} {searchedUser.nachname}</p>
                    <p className="text-[10px] font-black uppercase text-slate-500">{searchedUser.email} • {searchedUser.role}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const code = resolveAdminCode(true);
                        if (!code) return;
                        if (!confirm('Profil wirklich dauerhaft löschen?')) return;
                        const res = await (window as any).appActions?.adminDeleteUser?.(code, searchedUser.id) || await (await import('../../actions')).adminDeleteUser(code, searchedUser.id);
                        if (!res.success) return alert(res.error || 'Löschen fehlgeschlagen');
                        alert('Profil gelöscht.');
                        setUsers((prev) => prev.filter((u) => u.id !== searchedUser.id));
                        setSearchedUser(null);
                        await loadDashboard(code);
                      }}
                      className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-red-600 text-white"
                    >
                      Profil löschen
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const code = resolveAdminCode(true);
                        if (!code) return;
                        if (!confirm('Alle Beiträge dieses Profils löschen?')) return;
                        const res = await (window as any).appActions?.adminDeleteUserPosts?.(code, searchedUser.id) || await (await import('../../actions')).adminDeleteUserPosts(code, searchedUser.id);
                        if (!res.success) return alert(res.error || 'Löschen fehlgeschlagen');
                        alert('Beiträge gelöscht.');
                        await loadDashboard(code);
                      }}
                      className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-200 text-slate-700 bg-white"
                    >
                      Beiträge löschen
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Bitte zuerst einen Nutzer aus der Liste auswählen.</p>
              )}
            </div>
            <textarea value={sanctionReason} onChange={(e) => setSanctionReason(e.target.value)} rows={3} placeholder="Begründung" className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select value={sanctionAction} onChange={(e) => setSanctionAction(e.target.value as any)} className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                <option value="warn">Ermahnen</option>
                <option value="global_block">Komplett sperren</option>
                <option value="group_block">Von Gruppen sperren</option>
                <option value="abo_block">Von Abos sperren</option>
                <option value="temporary_block">Für bestimmte Zeit sperren</option>
              </select>
              <input value={sanctionDays} onChange={(e) => setSanctionDays(Number(e.target.value || 30))} type="number" min={1} max={3650} className="p-3 rounded-xl border border-slate-200 bg-slate-50" placeholder="Tage" />
              <button type="button" onClick={applySanction} disabled={sanctionBusy || !searchedUser} className="px-4 py-3 rounded-xl text-[10px] font-black uppercase bg-red-600 text-white disabled:opacity-60">
                {sanctionBusy ? 'Speichert...' : 'Sanktion anwenden'}
              </button>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
