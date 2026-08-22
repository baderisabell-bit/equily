"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarCheck2, CheckCheck, Info, MessageCircleMore, ShieldAlert } from 'lucide-react';
import NotificationBell from '../components/notification-bell';
import { getResolvedUserRole, getUserNotifications, markAllUserNotificationsRead, markUserNotificationRead } from '../actions';

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  href: string | null;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
};

export default function BenachrichtigungenPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const idRaw = sessionStorage.getItem('userId');
    const savedRole = sessionStorage.getItem('userRole');
    setRole(savedRole);

    const id = idRaw ? parseInt(idRaw, 10) : NaN;
    if (Number.isNaN(id) || id <= 0) {
      router.push('/login');
      return;
    }

    setUserId(id);

    getResolvedUserRole(id).then((roleRes) => {
      if (roleRes.success && roleRes.role) {
        setRole(roleRes.role);
        sessionStorage.setItem('userRole', roleRes.role);
      }
    }).catch(() => {
      // Keep the session role when resolving fails.
    });

    const load = async () => {
      setLoading(true);
      const res = await getUserNotifications(id, 100);
      if (res.success) {
        setItems((res.items || []) as NotificationItem[]);
      }
      setLoading(false);
    };

    load();
  }, [router]);

  const unreadCount = useMemo(() => items.filter((item) => !item.is_read).length, [items]);

  const formatDate = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeMeta = (type: string) => {
    const normalized = String(type || '').toLowerCase();
    if (normalized === 'booking') {
      return {
        label: 'Buchung',
        chipClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        Icon: CalendarCheck2,
      };
    }
    if (normalized === 'message') {
      return {
        label: 'Nachricht',
        chipClass: 'bg-sky-50 text-sky-700 border border-sky-200',
        Icon: MessageCircleMore,
      };
    }
    if (normalized === 'admin' || normalized === 'support') {
      return {
        label: 'Hinweis',
        chipClass: 'bg-amber-50 text-amber-700 border border-amber-200',
        Icon: ShieldAlert,
      };
    }
    return {
      label: 'Info',
      chipClass: 'bg-slate-100 text-slate-600 border border-slate-200',
      Icon: Info,
    };
  };

  const openNotification = async (item: NotificationItem) => {
    if (!userId) return;

    if (!item.is_read) {
      const res = await markUserNotificationRead({ userId, notificationId: item.id });
      if (res.success) {
        setItems((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, is_read: true, read_at: new Date().toISOString() } : entry));
      }
    }

    if (item.href) {
      router.push(item.href);
    }
  };

  const markAll = async () => {
    if (!userId) return;
    const res = await markAllUserNotificationsRead(userId);
    if (!res.success) return;
    setItems((prev) => prev.map((entry) => ({ ...entry, is_read: true, read_at: entry.read_at || new Date().toISOString() })));
  };

  const openProfile = () => {
    const userIdRaw = sessionStorage.getItem('userId');
    const parsedUserId = userIdRaw ? parseInt(userIdRaw, 10) : NaN;
    if (!Number.isNaN(parsedUserId) && parsedUserId > 0) {
      router.push(`/profil/${parsedUserId}`);
      return;
    }
    router.push('/login');
  };

  const handleLogout = () => {
    sessionStorage.clear();
    router.push('/');
  };

  const normalizedRole = String(role || '').trim().toLowerCase();
  const isExpertRole = normalizedRole === 'experte';
  const profileHref = userId && userId > 0 ? `/profil/${userId}` : '/login';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      />
      <aside className={`fixed left-0 top-0 h-full w-72 bg-white z-[70] shadow-2xl transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} p-6 flex flex-col`}>
        <div className="flex justify-between items-center mb-8 text-emerald-600 font-black italic tracking-tighter">MENÜ <button onClick={() => setSidebarOpen(false)} className="text-slate-300">×</button></div>
        <nav className="space-y-5 flex-grow">
          <button type="button" onClick={() => { setSidebarOpen(false); router.push('/'); }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Startseite</button>
          <button type="button" onClick={() => { setSidebarOpen(false); openProfile(); }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Mein Profil</button>
          <button type="button" onClick={() => { setSidebarOpen(false); router.push('/netzwerk'); }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Netzwerk</button>
          <button type="button" onClick={() => { setSidebarOpen(false); router.push('/merkliste'); }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Merkliste</button>
          <button type="button" onClick={() => { setSidebarOpen(false); router.push('/nachrichten'); }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Nachrichten</button>

          <button type="button" onClick={() => { setSidebarOpen(false); router.push('/einstellungen'); }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Einstellungen</button>
          <button type="button" onClick={() => { setSidebarOpen(false); router.push('/kontakt'); }} className="block text-left text-lg font-black italic uppercase text-emerald-600">Kontakt & FAQ</button>
        </nav>
        {role && (
          <button onClick={handleLogout} className="mt-auto p-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">Abmelden</button>
        )}
      </aside>

      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-200">
              ☰
            </button>
            <Link href="/" className="font-black text-emerald-600 text-2xl italic uppercase tracking-tighter">Equily</Link>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell userId={userId} />
            <Link href={profileHref} className="px-4 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
              Mein Profil
            </Link>
            <Link href="/einstellungen" className="px-4 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
              Einstellungen
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Portal</p>
              <h1 className="mt-2 text-3xl font-black italic uppercase tracking-tight text-slate-900">Benachrichtigungen</h1>
              <p className="mt-2 text-sm font-medium text-slate-600">Alle Hinweise an einem Ort, inklusive Buchungen, Nachrichten und Systeminfos.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest">{unreadCount} ungelesen</span>
              <button
                type="button"
                onClick={markAll}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600"
              >
                <CheckCheck size={14} />
                Alles als gelesen markieren
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-sm font-bold text-slate-400">Benachrichtigungen werden geladen...</p>
          ) : items.length === 0 ? (
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50">
              <p className="text-sm font-bold text-slate-500">Noch keine Benachrichtigungen vorhanden.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const typeMeta = getTypeMeta(item.notification_type);
                const TypeIcon = typeMeta.Icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openNotification(item)}
                    className={`w-full text-left p-5 rounded-2xl border transition-colors ${item.is_read ? 'border-slate-200 bg-white hover:bg-slate-50' : 'border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50'}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${typeMeta.chipClass}`}>
                          <TypeIcon size={12} />
                          {typeMeta.label}
                        </span>
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-900">{item.title}</p>
                        <p className="text-sm text-slate-600 leading-relaxed">{item.message}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{formatDate(item.created_at)}</p>
                      </div>
                      {!item.is_read ? <span className="mt-1 w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
