"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NotificationBell from './components/notification-bell';
import type { HomePerson, ManagedAdItem, WeeklyAdItem, WelfareCase } from './components/home-types';
import { safeToFixed } from './lib/num';
import { getHomeHubData, submitAnimalWelfareStatement, submitAnimalWelfareVote, trackAdvertisingViews } from './actions';

const GUEST_START_CATEGORIES = [
  'Reitunterricht',
  'Beritt',
  'Hufbearbeitung',
  'Therapien & Training für Reiter',
  'Therapien für Pferde',
];

function getHomePersonName(item: Pick<HomePerson, 'display_name' | 'vorname' | 'nachname'>) {
  return item.display_name || `${item.vorname} ${item.nachname}`;
}

function getWelfareStatusLabel(status: WelfareCase['status']) {
  if (status === 'voting') return 'Abstimmung';
  if (status === 'suspended') return 'Sanktioniert';
  return 'Nicht bestätigt';
}

function getWelfareStatusClassName(status: WelfareCase['status']) {
  if (status === 'voting') return 'bg-amber-100 text-amber-700';
  if (status === 'suspended') return 'bg-red-100 text-red-700';
  return 'bg-emerald-100 text-emerald-700';
}

export default function Startseite() {
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newcomers, setNewcomers] = useState<HomePerson[]>([]);
  const [topTen, setTopTen] = useState<HomePerson[]>([]);
  const [weeklyAds, setWeeklyAds] = useState<WeeklyAdItem[]>([]);
  const [managedAds, setManagedAds] = useState<ManagedAdItem[]>([]);
  const [wallOfShame, setWallOfShame] = useState<WelfareCase[]>([]);
  const [hubLoading, setHubLoading] = useState(true);
  const [statementInputs, setStatementInputs] = useState<Record<number, string>>({});
  const [headerSearchTerm, setHeaderSearchTerm] = useState('');
  const [viewerProfileOrt, setViewerProfileOrt] = useState<string | null>(null);
  const [viewerCoords, setViewerCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [nearbyDistancesKm, setNearbyDistancesKm] = useState<Record<number, number | null>>({});
  const geocodeCacheRef = useRef<Map<string, { lat: number; lon: number }>>(new Map());
  const router = useRouter();

  const distanceKmBetween = (from: { lat: number; lon: number }, to: { lat: number; lon: number }) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const dLat = toRad(to.lat - from.lat);
    const dLon = toRad(to.lon - from.lon);
    const lat1 = toRad(from.lat);
    const lat2 = toRad(to.lat);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const geocodeOrt = async (ort: string) => {
    const key = ort.trim().toLowerCase();
    if (!key) return null;

    const fromCache = geocodeCacheRef.current.get(key);
    if (fromCache) return fromCache;

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=de&q=${encodeURIComponent(ort)}`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' }
      }
    );

    if (!response.ok) return null;
    const data = await response.json();
    const first = Array.isArray(data) ? data[0] : null;
    if (!first?.lat || !first?.lon) return null;

    const coords = { lat: Number(first.lat), lon: Number(first.lon) };
    if (Number.isNaN(coords.lat) || Number.isNaN(coords.lon)) return null;

    geocodeCacheRef.current.set(key, coords);
    return coords;
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem('start-geocode-cache-v1');
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, { lat: number; lon: number }>;
        geocodeCacheRef.current = new Map(Object.entries(parsed || {}));
      }
    } catch {
      // Ignore cache parse issues and rebuild cache gradually.
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    const resolveViewerCoordsFromProfile = async () => {
      const ort = String(viewerProfileOrt || '').trim();
      if (!ort) {
        if (isActive) setViewerCoords(null);
        return;
      }

      try {
        const coords = await geocodeOrt(ort);
        if (!isActive) return;
        setViewerCoords(coords);
      } catch {
        if (!isActive) return;
        setViewerCoords(null);
      }
    };

    resolveViewerCoordsFromProfile();
    return () => {
      isActive = false;
    };
  }, [viewerProfileOrt]);

  useEffect(() => {
    let isActive = true;

    const calculateDistances = async () => {
      if (!viewerCoords || topTen.length === 0) {
        if (isActive) setNearbyDistancesKm({});
        return;
      }

      const result: Record<number, number | null> = {};
      for (const item of topTen) {
        const ort = String(item.ort || '').trim();
        if (!ort) {
          result[item.id] = null;
          continue;
        }
        try {
          const coords = await geocodeOrt(ort);
          result[item.id] = coords ? distanceKmBetween(viewerCoords, coords) : null;
        } catch {
          result[item.id] = null;
        }
      }

      if (!isActive) return;
      setNearbyDistancesKm(result);

      try {
        const cacheObject = Object.fromEntries(geocodeCacheRef.current.entries());
        localStorage.setItem('start-geocode-cache-v1', JSON.stringify(cacheObject));
      } catch {
        // Ignore localStorage write errors.
      }
    };

    calculateDistances();
    return () => {
      isActive = false;
    };
  }, [topTen, viewerCoords]);

  const sortedTopTen = useMemo(() => {
    if (topTen.length === 0) return [] as HomePerson[];

    const withMeta = topTen.map((item, index) => ({
      item,
      index,
      distance: nearbyDistancesKm[item.id]
    }));

    withMeta.sort((a, b) => {
      const distA = typeof a.distance === 'number' ? a.distance : Number.POSITIVE_INFINITY;
      const distB = typeof b.distance === 'number' ? b.distance : Number.POSITIVE_INFINITY;

      if (distA !== distB) return distA - distB;
      return a.index - b.index;
    });

    return withMeta.map((entry) => entry.item);
  }, [topTen, nearbyDistancesKm]);

  useEffect(() => {
    let isActive = true;

    let normalizedUserId: number | null = null;
    try {
      const savedRole = window.sessionStorage.getItem('userRole');
      const savedName = window.sessionStorage.getItem('userName');
      const savedUserId = parseInt(window.sessionStorage.getItem('userId') || '', 10);
      setRole(savedRole);
      setUserName(savedName);
      normalizedUserId = Number.isNaN(savedUserId) ? null : savedUserId;
      setUserId(normalizedUserId);
    } catch {
      setRole(null);
      setUserName(null);
      setUserId(null);
    }
    const loadHub = async () => {
      setHubLoading(true);
      try {
        const timeout = new Promise<{ success: false; timeout: true }>((resolve) => {
          window.setTimeout(() => resolve({ success: false, timeout: true }), 8000);
        });
        const hubRes = await Promise.race([
          getHomeHubData(normalizedUserId),
          timeout
        ]);

        if (!isActive) return;

        if (hubRes.success) {
          setViewerProfileOrt(hubRes.viewerOrt || null);
          setNewcomers(hubRes.newcomers as HomePerson[]);
          setTopTen(hubRes.topTen as HomePerson[]);
          setWeeklyAds(hubRes.weeklyAds as WeeklyAdItem[]);
          setManagedAds(hubRes.managedAds as ManagedAdItem[]);
          setWallOfShame(hubRes.wallOfShame as WelfareCase[]);
        } else {
          setNewcomers([]);
          setTopTen([]);
          setWeeklyAds([]);
          setManagedAds([]);
          setWallOfShame([]);
        }
      } catch {
        if (!isActive) return;
        setNewcomers([]);
        setTopTen([]);
        setWeeklyAds([]);
        setManagedAds([]);
        setWallOfShame([]);
      } finally {
        if (!isActive) return;
        setHubLoading(false);
      }
    };

    loadHub();

    return () => {
      isActive = false;
    };
  }, []);

  const reloadHub = async () => {
    const hubRes = await getHomeHubData(userId);
    if (!hubRes.success) return;
    setViewerProfileOrt(hubRes.viewerOrt || null);
    setNewcomers(hubRes.newcomers as HomePerson[]);
    setTopTen(hubRes.topTen as HomePerson[]);
    setWeeklyAds(hubRes.weeklyAds as WeeklyAdItem[]);
    setManagedAds(hubRes.managedAds as ManagedAdItem[]);
    setWallOfShame(hubRes.wallOfShame as WelfareCase[]);
  };

  useEffect(() => {
    const trackViews = async () => {
      if (!userId || managedAds.length === 0) return;
      const submissionIds = managedAds.map((item) => Number(item.id)).filter((id) => Number.isInteger(id) && id > 0);
      if (submissionIds.length === 0) return;
      await trackAdvertisingViews({ viewerUserId: userId, submissionIds });
    };

    trackViews();
  }, [managedAds, userId]);

  const voteWelfareCase = async (caseId: number, vote: 'yes' | 'no') => {
    if (!userId) {
      router.push('/login');
      return;
    }
    const res = await submitAnimalWelfareVote({ userId, caseId, vote });
    if (!res.success) {
      alert(res.error || 'Abstimmung fehlgeschlagen.');
      return;
    }
    await reloadHub();
  };

  const submitStatement = async (caseId: number) => {
    if (!userId) return;
    const statement = String(statementInputs[caseId] || '').trim();
    const res = await submitAnimalWelfareStatement({ userId, caseId, statement });
    if (!res.success) {
      alert(res.error || 'Statement konnte nicht gespeichert werden.');
      return;
    }
    setStatementInputs((prev) => ({ ...prev, [caseId]: '' }));
    await reloadHub();
  };

  const handleLogout = () => {
    try {
      window.sessionStorage.clear();
    } catch {
      // Ignore session storage errors.
    }
    window.location.reload();
  };

  const normalizedRole = (role || '').trim().toLowerCase();
  const isExpertRole = normalizedRole === 'experte';

  const openProfile = () => {
    let userIdRaw: string | null = null;
    try {
      userIdRaw = window.sessionStorage.getItem('userId');
    } catch {
      userIdRaw = null;
    }
    const parsedUserId = userIdRaw ? parseInt(userIdRaw, 10) : NaN;
    if (!Number.isNaN(parsedUserId) && parsedUserId > 0) {
      router.push(`/profil/${parsedUserId}`);
      return;
    }

    router.push('/login');
  };

  const handleHeaderSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = headerSearchTerm.trim();
    if (!query) {
      router.push('/suche');
      return;
    }
    router.push(`/suche?q=${encodeURIComponent(query)}`);
  };

  const openGuestCategory = (category: string) => {
    router.push(`/suche?kategorie=${encodeURIComponent(category)}`);
  };

  function HomeHubSections({ isLoggedIn }: { isLoggedIn: boolean }) {
    if (hubLoading) {
      return (
        <section className="home-section w-full max-w-6xl p-8">
          <p className="home-label text-sm">Start-Hub wird geladen...</p>
        </section>
      );
    }

    // Primary content: recently joined profiles.
    const newcomerList = (
      <section className="home-section space-y-3">
        <p className="home-label">Startseite Hub</p>
        <h2 className="home-section-title">Newcomer</h2>
        <div className="space-y-2">
          {newcomers.length === 0 ? (
            <p className="text-sm text-slate-500">Aktuell keine Newcomer.</p>
          ) : newcomers.map((item) => (
            <article key={`new-${item.id}`} className="home-item flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase text-slate-900">{getHomePersonName(item)}</p>
                <p className="text-[10px] font-black uppercase text-slate-400 mt-1">{item.role}{item.ort ? ` • ${item.ort}` : ''}</p>
              </div>
              {item.verifiziert ? <p className="text-[10px] font-black uppercase text-emerald-700">Verifiziert</p> : null}
            </article>
          ))}
        </div>
      </section>
    );

    // Personalised content: profiles ordered by distance when available.
    const topTenList = (
      <section className="home-section space-y-3 h-fit">
        <h2 className="home-section-title text-xl">In deiner Nähe</h2>
        <div className="space-y-2">
          {sortedTopTen.length === 0 ? (
            <p className="text-sm text-slate-500">Aktuell keine passenden Profile in deiner Nähe.</p>
          ) : sortedTopTen.map((item, idx) => (
            <article key={`top-${item.id}`} className="home-item p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase text-emerald-700">#{idx + 1}</p>
                <div className="flex flex-wrap justify-end gap-2">
                  {item.homepage_promoted ? <p className="text-[10px] font-black uppercase text-violet-700">Startseite</p> : null}
                  {item.verifiziert ? <p className="text-[10px] font-black uppercase text-emerald-700">Verifiziert</p> : null}
                </div>
              </div>
              <p className="text-sm font-black uppercase text-slate-900">{getHomePersonName(item)}</p>
              <p className="text-[10px] font-black uppercase text-slate-400">{item.role}{item.ort ? ` • ${item.ort}` : ''}</p>
              <div className="flex flex-wrap gap-2">
                <p className="inline-flex px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700">
                  {item.nearby_reason || 'In deiner Nähe'}
                </p>
                {typeof nearbyDistancesKm[item.id] === 'number' ? (
                  <p className="inline-flex px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-700">
                    {safeToFixed(nearbyDistancesKm[item.id], 1)} km entfernt
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    );

    // Commercial content: user-submitted and admin-managed advertising.
    const weeklyAdsList = weeklyAds.length === 0 ? null : (
      <section className="bg-gradient-to-r from-violet-50 via-white to-emerald-50 border border-violet-200 rounded-[2rem] p-6 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600">Startseitenwerbung</p>
            <h2 className="mt-2 text-2xl font-black italic uppercase tracking-tight text-slate-900">Aktuelle Startseitenplaetze</h2>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nur Experten mit aktiver Startseitenwerbung</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {weeklyAds.map((item) => (
            <article key={`weekly-ad-${item.id}`} className="rounded-2xl border border-white bg-white/90 p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-black uppercase text-slate-900">{getHomePersonName(item)}</p>
                {item.verifiziert ? <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-100 text-emerald-700">Verifiziert</span> : null}
              </div>
              <p className="text-[10px] font-black uppercase text-violet-600">{item.label || 'Startseitenwerbung'}</p>
              <p className="text-sm text-slate-600 line-clamp-3">{item.teaser || 'Expertenprofil mit aktueller Startseitenwerbung.'}</p>
              <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase text-slate-500">
                {item.ort ? <span>{item.ort}</span> : null}
                {item.ends_at ? <span>Aktiv bis {new Date(item.ends_at).toLocaleDateString('de-DE')}</span> : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    );

    const topPlacementAds = managedAds
      .filter((item) => item.placement_slot === 'startseite_top')
      .sort((a, b) => a.placement_order - b.placement_order)
      .slice(0, 3);

    const sidebarPlacementAds = managedAds
      .filter((item) => item.placement_slot === 'startseite_sidebar')
      .sort((a, b) => a.placement_order - b.placement_order)
      .slice(0, 3);

    const managedTopAdsList = topPlacementAds.length === 0 ? null : (
      <section className="bg-white border border-amber-200 rounded-[2rem] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Freigegebene Werbung</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Admin platziert</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {topPlacementAds.map((item) => (
            <article key={`managed-top-ad-${item.id}`} className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
              <img src={item.media_url} alt={item.title} className="w-full h-40 object-cover" />
              <div className="p-4 space-y-2">
                <p className="text-sm font-black uppercase text-slate-900">{item.title}</p>
                <p className="text-[10px] font-black uppercase text-slate-500">{getHomePersonName(item)}</p>
                {item.description ? <p className="text-sm text-slate-700 line-clamp-3">{item.description}</p> : null}
                {item.target_url ? (
                  <a href={item.target_url} target="_blank" rel="noreferrer" className="inline-flex px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-amber-500 text-white">
                    Zur Aktion
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    );

    const managedSidebarAds = sidebarPlacementAds.length === 0 ? null : (
      <section className="bg-white border border-amber-200 rounded-[2rem] p-4 space-y-3 h-fit">
        <h2 className="text-sm font-black uppercase tracking-widest text-amber-700">Platzierte Sidebar Werbung</h2>
        <div className="space-y-3">
          {sidebarPlacementAds.map((item) => (
            <article key={`managed-sidebar-ad-${item.id}`} className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
              <img src={item.media_url} alt={item.title} className="w-full h-28 object-cover" />
              <div className="p-3 space-y-1">
                <p className="text-[11px] font-black uppercase text-slate-900 line-clamp-2">{item.title}</p>
                {item.target_url ? (
                  <a href={item.target_url} target="_blank" rel="noreferrer" className="text-[10px] font-black uppercase text-amber-700 underline">
                    Jetzt ansehen
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    );

    if (!isLoggedIn) {
      return <div className="w-full max-w-6xl space-y-6">{managedTopAdsList}{weeklyAdsList}{newcomerList}</div>;
    }

    return (
      <div className="w-full max-w-6xl space-y-6">
        {managedTopAdsList}
        {weeklyAdsList}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
          {newcomerList}
          <div className="space-y-6">
            {topTenList}
            {managedSidebarAds}
          </div>
        </div>

        <section className="home-section space-y-3">
          <h2 className="home-section-title">News und Tipps</h2>
          <p className="text-sm text-slate-600">Aktuelle Meldungen aus der Community mit Kontext, Rückmeldungen und Statements.</p>
          <div className="space-y-3">
            {wallOfShame.length === 0 ? (
              <p className="text-sm text-slate-500">Aktuell keine News.</p>
            ) : wallOfShame.map((item) => (
              <article key={`wos-${item.id}`} className="home-item p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-black uppercase text-slate-900">{item.title}</p>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${getWelfareStatusClassName(item.status)}`}>
                    {getWelfareStatusLabel(item.status)}
                  </span>
                </div>
                <p className="text-[10px] font-black uppercase text-slate-400">Betroffene Person: {item.accused_vorname} {item.accused_nachname}</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{item.description}</p>
                {item.video_url ? (
                  <a href={item.video_url} target="_blank" rel="noreferrer" className="text-xs font-black uppercase text-emerald-700 underline">
                    Video öffnen
                  </a>
                ) : null}
                {item.accused_statement ? (
                  <div className="p-3 rounded-xl border border-slate-200 bg-white">
                    <p className="text-[10px] font-black uppercase text-slate-400">Statement der betroffenen Person</p>
                    <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{item.accused_statement}</p>
                  </div>
                ) : null}
                {item.status === 'voting' ? (
                  <div className="space-y-2">
                    <p className="text-xs font-black uppercase text-slate-600">Rückmeldungen: Ja {item.yes_count} / Nein {item.no_count}</p>
                    {userId ? (
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => voteWelfareCase(item.id, 'yes')} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-red-600 text-white">Meldung bestätigen</button>
                        <button type="button" onClick={() => voteWelfareCase(item.id, 'no')} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-300 text-slate-700">Nicht bestätigen</button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Zum Mitmachen bitte einloggen.</p>
                    )}

                    {userId === item.accused_user_id && (
                      <div className="space-y-2">
                        <textarea
                          value={statementInputs[item.id] || ''}
                          onChange={(e) => setStatementInputs((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          placeholder="Dein Statement zum Vorwurf"
                          className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm"
                          rows={3}
                        />
                        <button type="button" onClick={() => submitStatement(item.id)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-slate-900 text-white">Statement speichern</button>
                      </div>
                    )}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // --- LAYOUT A: FÜR EINGELOGGTE ---
  if (role) {
    return (
      <div className="home-page">
        <div className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)} />
        <aside className={`fixed left-0 top-0 h-full w-80 bg-white z-[70] shadow-2xl transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} p-8 flex flex-col`}>
          <div className="flex justify-between items-center mb-10 text-emerald-600 font-black italic tracking-tighter">MENÜ <button onClick={() => setSidebarOpen(false)} className="text-slate-300">×</button></div>
          <nav className="space-y-6 flex-grow">
            <Link href="/" className="block text-xl font-black italic uppercase text-slate-800 hover:text-emerald-600">Startseite</Link>
            {isExpertRole && <Link href="/dashboard/experte" className="block text-xl font-black italic uppercase text-slate-800 hover:text-emerald-600">Dashboard</Link>}
            <button type="button" onClick={openProfile} className="w-full text-left text-xl font-black italic uppercase text-slate-800 hover:text-emerald-600">Mein Profil</button>
            <Link href="/dashboard/experte/schueler" className="block text-xl font-black italic uppercase text-slate-800 hover:text-emerald-600">Schüler und Kunden</Link>
            <Link href="/suche" className="block text-xl font-black italic uppercase text-slate-800 hover:text-emerald-600">Suche</Link>
            <Link href="/netzwerk" className="block text-xl font-black italic uppercase text-slate-800 hover:text-emerald-600">Netzwerk</Link>
            <Link href="/nachrichten" className="block text-xl font-black italic uppercase text-slate-800 hover:text-emerald-600">Nachrichten</Link>
            <Link href="/merkliste" className="block text-xl font-black italic uppercase text-slate-800 hover:text-emerald-600">Merkliste</Link>
            <Link href="/einstellungen" className="block text-xl font-black italic uppercase text-slate-800 hover:text-emerald-600">Einstellungen</Link>
            <Link href="/kontakt" className="block text-xl font-black italic uppercase text-emerald-600">Kontakt & FAQ</Link>
          </nav>
          <button onClick={handleLogout} className="mt-auto p-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">Abmelden</button>
        </aside>

        <header className="bg-white border-b px-8 py-5 flex items-center gap-4 sticky top-0 z-50 shadow-sm">
          <div className="flex items-center gap-6">
            <button onClick={() => setSidebarOpen(true)} className="p-3 bg-slate-50 rounded-xl hover:bg-emerald-50 transition-colors">
              <div className="w-6 h-0.5 bg-slate-900 mb-1.5" />
              <div className="w-4 h-0.5 bg-slate-900" />
            </button>
            <div className="flex flex-col">
              <span className="font-black text-emerald-600 text-2xl italic uppercase tracking-tighter">Equily</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Herzlich Willkommen {userName?.split(' ')[0]}</span>
            </div>
          </div>

          <form onSubmit={handleHeaderSearch} className="flex-1 max-w-2xl mx-auto hidden md:flex items-center gap-2">
            <input
              type="text"
              value={headerSearchTerm}
              onChange={(e) => setHeaderSearchTerm(e.target.value)}
              placeholder="Spezialisierung oder Ort suchen..."
              className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-emerald-300 text-sm font-bold"
            />
            <button
              type="submit"
              className="px-5 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500"
            >
              Suchen
            </button>
          </form>

          <div className="flex items-center gap-3 ml-auto">
            <NotificationBell userId={userId} />
            <button
              type="button"
              onClick={openProfile}
              aria-label="Profil öffnen"
              className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-white font-black border-4 border-emerald-500 shadow-lg hover:scale-105 transition-transform"
            >
              {userName?.[0]}
            </button>
          </div>
        </header>

        <main className="home-main">
          <HomeHubSections isLoggedIn={true} />
        </main>
      </div>
    );
  }

  // --- LAYOUT B: GÄSTE ---
  return (
    <div className="home-page">
      <header className="bg-white border-b px-8 py-5 flex items-center gap-4 sticky top-0 z-50">
        <div className="flex flex-col">
          <span className="font-black text-emerald-600 text-2xl tracking-tighter italic uppercase">Equily</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Herzlich Willkommen</span>
        </div>

        <div className="flex gap-4 ml-auto">
          <Link href="/login" className="px-5 py-2 text-xs font-black uppercase text-slate-500">Einloggen</Link>
          <Link href="/registrieren" className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase italic shadow-lg">Registrieren</Link>
        </div>
      </header>
      <main className="home-main">
        <section className="w-full max-w-6xl text-center space-y-6">
          <h1 className="text-5xl md:text-7xl font-black italic tracking-tight uppercase text-slate-900">
            Finde dein Match
          </h1>
          <form onSubmit={handleHeaderSearch} className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={headerSearchTerm}
              onChange={(e) => setHeaderSearchTerm(e.target.value)}
              placeholder="Spezialisierung oder Ort suchen..."
              className="w-full px-5 py-4 bg-white rounded-2xl border border-slate-200 outline-none focus:border-emerald-300 text-sm font-bold"
            />
            <button
              type="submit"
              className="px-8 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500"
            >
              Suchen
            </button>
          </form>

          <div className="max-w-4xl mx-auto">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Kategorien</p>
            <div className="flex flex-wrap justify-center gap-2">
              {GUEST_START_CATEGORIES.map((category) => (
                <button
                  key={`guest-category-${category}`}
                  type="button"
                  onClick={() => openGuestCategory(category)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </section>
        <HomeHubSections isLoggedIn={false} />
      </main>
    </div>
  );
}