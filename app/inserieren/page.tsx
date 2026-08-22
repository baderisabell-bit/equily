"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ANGEBOT_KATEGORIEN } from '../suche/kategorien-daten';
import { getStoredProfileData, saveExpertProfileData, trackInteractionShare, uploadNetworkMedia } from '../actions';
import { ChevronLeft, Eye, Heart, MapPin, Plus, Share2, Trash2 } from 'lucide-react';
import LoggedInHeader from '../components/logged-in-header';
import MediaDropzone from '../components/media-dropzone';

type PriceRow = {
  id: string;
  betrag: string;
  typ: 'einzel' | 'custom';
  typBezeichnung: string; // Für "eigene Bezeichnung" oder Info-Text
  anzahlLeistungen: string; // Nur für Abo relevant
};

type AdItem = {
  id: string;
  titel: string;
  kategorie: string;
  modus: 'mobil' | 'vor_ort';
  mobilRadiusKm: string;
  beschreibung: string;
  titleImageUrl: string;
  mediaItems: Array<{ url: string; mediaType: 'image' | 'video' }>;
  preise: PriceRow[];
  billingType: 'einmal';
  sessionsPerAbo: string;
  singleSessionCancellationAllowed: boolean;
  maxCancellationsPerAbo: string;
  cancellationWindowHours: string;
  billingNotes: string;
  visibility: 'public' | 'draft';
  viewsCount: number;
  wishlistCount: number;
  createdAt: string;
  updatedAt: string;
};

const EMPTY_PRICE_ROW = (): PriceRow => ({
  id: `price-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  betrag: '',
  typ: 'einzel',
  typBezeichnung: '',
  anzahlLeistungen: '1'
});

const MOBIL_RADIUS_OPTIONS = ['5', '10', '15', '20', '25', '30', '40', '50'];

export default function InserierenPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [viewerRole, setViewerRole] = useState<string | null>(null);
  const [viewerName, setViewerName] = useState('Profil');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [profilMeta, setProfilMeta] = useState<{ name: string; ort: string; plz: string; kategorien: string[]; zertifikate: string[]; angebotText: string; profilData: Record<string, any> }>({
    name: '',
    ort: '',
    plz: '',
    kategorien: [],
    zertifikate: [],
    angebotText: '',
    profilData: {}
  });
  const [ads, setAds] = useState<AdItem[]>([]);
  const [visibilityFilter, setVisibilityFilter] = useState<'public' | 'draft'>('public');
  const [formData, setFormData] = useState({
    titel: '',
    kategorie: '',
    modus: 'vor_ort' as 'mobil' | 'vor_ort',
    mobilRadiusKm: '',
    beschreibung: '',
    titleImageUrl: '',
    billingType: 'einmal' as 'einmal' | 'abo',
    sessionsPerAbo: '',
    singleSessionCancellationAllowed: false,
    maxCancellationsPerAbo: '',
    cancellationWindowHours: '',
    billingNotes: ''
  });
  const [mediaItems, setMediaItems] = useState<Array<{ url: string; mediaType: 'image' | 'video' }>>([]);
  const [preisRows, setPreisRows] = useState<PriceRow[]>([EMPTY_PRICE_ROW()]);
  const [editingAdId, setEditingAdId] = useState<string | null>(null);

  const verfuegbareKategorien = useMemo(() => {
    if (profilMeta.kategorien.length > 0) return profilMeta.kategorien;
    return ANGEBOT_KATEGORIEN.map((kat) => kat.label);
  }, [profilMeta.kategorien]);

  const gefilterteAds = useMemo(() => ads.filter((ad) => ad.visibility === visibilityFilter), [ads, visibilityFilter]);

  useEffect(() => {
    const init = async () => {
      const userIdRaw = sessionStorage.getItem('userId');
      const roleRaw = String(sessionStorage.getItem('userRole') || '').trim().toLowerCase();
      const parsedUserId = userIdRaw ? parseInt(userIdRaw, 10) : NaN;
      setViewerRole(sessionStorage.getItem('userRole'));
      setViewerName(sessionStorage.getItem('userName') || 'Profil');

      if (Number.isNaN(parsedUserId) || parsedUserId <= 0) {
        window.location.href = '/login';
        return;
      }
      if (roleRaw !== 'experte') {
        window.location.href = `/profil/${parsedUserId}`;
        return;
      }

      setUserId(parsedUserId);

      const res = await getStoredProfileData(parsedUserId);
      if (!res.success || !res.data) {
        setError('Profil konnte nicht geladen werden.');
        setLoading(false);
        return;
      }

      const profilData = (res.data.profil_data && typeof res.data.profil_data === 'object') ? res.data.profil_data : {};
      const loadedAds = Array.isArray(profilData.angeboteAnzeigen)
        ? profilData.angeboteAnzeigen.map((item: any, idx: number) => ({
            id: String(item?.id || `ad-${idx}`),
            titel: String(item?.titel || '').trim(),
            kategorie: String(item?.kategorie || '').trim(),
            modus: item?.modus === 'mobil' ? 'mobil' : 'vor_ort',
            mobilRadiusKm: MOBIL_RADIUS_OPTIONS.includes(String(item?.mobilRadiusKm || '').trim()) ? String(item?.mobilRadiusKm).trim() : '',
            beschreibung: String(item?.beschreibung || '').trim(),
            titleImageUrl: String(item?.titleImageUrl || '').trim(),
            mediaItems: Array.isArray(item?.mediaItems)
              ? item.mediaItems
                  .map((media: any) => ({
                    url: String(media?.url || '').trim(),
                    mediaType: media?.mediaType === 'video' ? 'video' : 'image'
                  }))
                  .filter((media: { url: string }) => media.url)
              : [],
            preise: Array.isArray(item?.preise)
              ? item.preise.map((preis: any, priceIdx: number) => ({
                  id: String(preis?.id || `price-${idx}-${priceIdx}`),
                  typ: preis?.typ === 'custom' ? 'custom' : 'einzel',
                  betrag: String(preis?.betrag || '').trim(),
                  typBezeichnung: String(preis?.typBezeichnung || preis?.leistung || '').trim(),
                  anzahlLeistungen: String(preis?.anzahlLeistungen || '').trim()
                }))
              : [],
            billingType: 'einmal',
            sessionsPerAbo: String(item?.sessionsPerAbo || '').trim(),
            singleSessionCancellationAllowed: Boolean(item?.singleSessionCancellationAllowed),
            maxCancellationsPerAbo: String(item?.maxCancellationsPerAbo || '').trim(),
            cancellationWindowHours: String(item?.cancellationWindowHours || '').trim(),
            billingNotes: String(item?.billingNotes || '').trim(),
            visibility: item?.visibility === 'draft' ? 'draft' : 'public',
            viewsCount: Math.max(0, Number(item?.viewsCount || 0)),
            wishlistCount: Math.max(0, Number(item?.wishlistCount || 0)),
            createdAt: String(item?.createdAt || new Date().toISOString()),
            updatedAt: String(item?.updatedAt || new Date().toISOString())
          }))
        : [];

      setAds(loadedAds);
      setProfilMeta({
        name: String(res.data.display_name || '').trim(),
        ort: String(res.data.ort || '').trim(),
        plz: String(res.data.plz || '').trim(),
        kategorien: Array.isArray(res.data.kategorien) ? res.data.kategorien : [],
        zertifikate: Array.isArray(res.data.zertifikate) ? res.data.zertifikate : [],
        angebotText: String(res.data.angebot_text || '').trim(),
        profilData
      });
      setFormData((prev) => ({ ...prev, kategorie: (Array.isArray(res.data.kategorien) && res.data.kategorien[0]) || verfuegbareKategorien[0] || '' }));

      setLoading(false);
    };

    init();
  }, []);

  const uploadMedia = async (file: File, target: 'title' | 'gallery') => {
    if (!userId) return;
    setSaving(true);
    setError('');
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    const res = await uploadNetworkMedia(userId, formDataUpload);
    setSaving(false);
    if (!res.success || !res.url) {
      setError(res.error || 'Upload fehlgeschlagen.');
      return;
    }

    if (target === 'title') {
      setFormData((prev) => ({ ...prev, titleImageUrl: String(res.url) }));
      setMessage('Titelbild hochgeladen.');
      return;
    }

    setMediaItems((prev) => [...prev, { url: String(res.url), mediaType: res.mediaType === 'video' ? 'video' : 'image' }]);
    setMessage('Medium hinzugefügt.');
  };

  const persistAds = async (nextAds: AdItem[]) => {
    if (!userId) return false;

    setSaving(true);
    setError('');
    setMessage('');

    const nextProfilData = {
      ...(profilMeta.profilData || {}),
      angeboteAnzeigen: nextAds
    };

    const res = await saveExpertProfileData(userId, {
      name: profilMeta.name,
      ort: profilMeta.ort,
      plz: profilMeta.plz,
      angebote: profilMeta.kategorien,
      zertifikate: profilMeta.zertifikate,
      angebotText: profilMeta.angebotText,
      ...nextProfilData
    });

    setSaving(false);
    if (!res.success) {
      setError(res.error || 'Anzeige konnte nicht gespeichert werden.');
      return false;
    }

    setAds(nextAds);
    setProfilMeta((prev) => ({ ...prev, profilData: nextProfilData }));
    return true;
  };

  const createAd = async (visibility: 'public' | 'draft') => {
    if (!formData.titel.trim()) {
      setError('Bitte Titel eingeben.');
      return;
    }
    if (!formData.kategorie.trim()) {
      setError('Bitte Kategorie wählen.');
      return;
    }
    if (!formData.titleImageUrl.trim()) {
      setError('Bitte mindestens ein Titelbild hochladen.');
      return;
    }
    if (formData.modus === 'mobil' && !MOBIL_RADIUS_OPTIONS.includes(formData.mobilRadiusKm)) {
      setError('Bitte für Mobil einen gültigen Umkreis auswählen.');
      return;
    }
    const validPreisRows = preisRows.filter((row) => row.betrag.trim() && row.typBezeichnung.trim());
    if (validPreisRows.length === 0) {
      setError('Bitte mindestens eine vollständige Preiszeile anlegen.');
      return;
    }
    const now = new Date().toISOString();
    const nextAd: AdItem = {
      id: `ad-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      titel: formData.titel.trim(),
      kategorie: formData.kategorie.trim(),
      modus: formData.modus,
      mobilRadiusKm: formData.modus === 'mobil' ? formData.mobilRadiusKm : '',
      beschreibung: formData.beschreibung.trim(),
      titleImageUrl: formData.titleImageUrl.trim(),
      mediaItems,
      preise: validPreisRows,
      billingType: 'einmal',
      sessionsPerAbo: '',
      singleSessionCancellationAllowed: false,
      maxCancellationsPerAbo: '',
      cancellationWindowHours: '',
      billingNotes: '',
      visibility,
      viewsCount: 0,
      wishlistCount: 0,
      createdAt: now,
      updatedAt: now
    };

    const ok = await persistAds([nextAd, ...ads]);
    if (!ok) return;

    setMessage(visibility === 'public' ? 'Anzeige wurde online geschaltet.' : 'Anzeige als Entwurf gespeichert.');
    setFormData({ titel: '', kategorie: verfuegbareKategorien[0] || '', modus: 'vor_ort', mobilRadiusKm: '', beschreibung: '', titleImageUrl: '', billingType: 'einmal', sessionsPerAbo: '', singleSessionCancellationAllowed: false, maxCancellationsPerAbo: '', cancellationWindowHours: '', billingNotes: '' });
    setMediaItems([]);
    setPreisRows([EMPTY_PRICE_ROW()]);
    setVisibilityFilter(visibility);
  };

  const startEditingAd = (ad: AdItem) => {
    setEditingAdId(ad.id);
    setFormData({
      titel: ad.titel || '',
      kategorie: ad.kategorie || (verfuegbareKategorien[0] || ''),
      modus: ad.modus,
      mobilRadiusKm: ad.mobilRadiusKm || '',
      beschreibung: ad.beschreibung || '',
      titleImageUrl: ad.titleImageUrl || '',
      billingType: ad.billingType || 'einmal',
      sessionsPerAbo: ad.sessionsPerAbo || '',
      singleSessionCancellationAllowed: Boolean(ad.singleSessionCancellationAllowed),
      maxCancellationsPerAbo: ad.maxCancellationsPerAbo || '',
      cancellationWindowHours: ad.cancellationWindowHours || '',
      billingNotes: ad.billingNotes || ''
    });
    setMediaItems(Array.isArray(ad.mediaItems) ? ad.mediaItems : []);
    setPreisRows(Array.isArray(ad.preise) && ad.preise.length > 0 ? ad.preise : [EMPTY_PRICE_ROW()]);
    setMessage('Anzeige zum Bearbeiten geladen.');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditingAd = () => {
    setEditingAdId(null);
    setFormData({ titel: '', kategorie: verfuegbareKategorien[0] || '', modus: 'vor_ort', mobilRadiusKm: '', beschreibung: '', titleImageUrl: '', billingType: 'einmal', sessionsPerAbo: '', singleSessionCancellationAllowed: false, maxCancellationsPerAbo: '', cancellationWindowHours: '', billingNotes: '' });
    setMediaItems([]);
    setPreisRows([EMPTY_PRICE_ROW()]);
    setMessage('Bearbeitung abgebrochen.');
    setError('');
  };

  const saveEditedAd = async () => {
    if (!editingAdId) return;
    if (!formData.titel.trim()) {
      setError('Bitte Titel eingeben.');
      return;
    }
    if (!formData.kategorie.trim()) {
      setError('Bitte Kategorie wählen.');
      return;
    }
    if (!formData.titleImageUrl.trim()) {
      setError('Bitte mindestens ein Titelbild hochladen.');
      return;
    }
    if (formData.modus === 'mobil' && !MOBIL_RADIUS_OPTIONS.includes(formData.mobilRadiusKm)) {
      setError('Bitte für Mobil einen gültigen Umkreis auswählen.');
      return;
    }

    const validPreisRows = preisRows.filter((row) => row.betrag.trim() && row.typBezeichnung.trim());
    if (validPreisRows.length === 0) {
      setError('Bitte mindestens eine vollständige Preiszeile anlegen.');
      return;
    }
    const nextAds = ads.map((ad) => {
      if (ad.id !== editingAdId) return ad;
      return {
        ...ad,
        titel: formData.titel.trim(),
        kategorie: formData.kategorie.trim(),
        modus: formData.modus,
        mobilRadiusKm: formData.modus === 'mobil' ? formData.mobilRadiusKm : '',
        beschreibung: formData.beschreibung.trim(),
        titleImageUrl: formData.titleImageUrl.trim(),
        mediaItems,
        preise: validPreisRows,
        billingType: 'einmal' as const,
        sessionsPerAbo: '',
        singleSessionCancellationAllowed: false,
        maxCancellationsPerAbo: '',
        cancellationWindowHours: '',
        billingNotes: '',
        updatedAt: new Date().toISOString()
      };
    });

    const ok = await persistAds(nextAds);
    if (!ok) return;
    setMessage('Anzeige aktualisiert.');
    setEditingAdId(null);
    setFormData({ titel: '', kategorie: verfuegbareKategorien[0] || '', modus: 'vor_ort', mobilRadiusKm: '', beschreibung: '', titleImageUrl: '', billingType: 'einmal', sessionsPerAbo: '', singleSessionCancellationAllowed: false, maxCancellationsPerAbo: '', cancellationWindowHours: '', billingNotes: '' });
    setMediaItems([]);
    setPreisRows([EMPTY_PRICE_ROW()]);
  };

  const shareAdLink = async (adId: string) => {
    if (!userId) return;
    const safeAdId = String(adId || '').trim();
    if (!safeAdId) return;

    const url = `${window.location.origin}/anzeige/${userId}/${encodeURIComponent(safeAdId)}`;
    try {
      await navigator.clipboard.writeText(url);
      await trackInteractionShare({
        sourceType: 'anzeige',
        sourceId: safeAdId,
        ownerUserId: userId,
        sharedByUserId: userId,
        channel: 'link'
      });
      setMessage('Anzeige-Link kopiert.');
      setError('');
    } catch {
      window.prompt('Anzeige-Link manuell kopieren:', url);
    }
  };

  const updateAdVisibility = async (adId: string, visibility: 'public' | 'draft') => {
    const nextAds = ads.map((ad) => (ad.id === adId ? { ...ad, visibility, updatedAt: new Date().toISOString() } : ad));
    const ok = await persistAds(nextAds);
    if (ok) {
      setMessage(visibility === 'public' ? 'Anzeige wurde online geschaltet.' : 'Anzeige wurde zu Entwürfen verschoben.');
    }
  };

  const deleteAd = async (adId: string) => {
    if (!window.confirm('Anzeige wirklich löschen?')) return;
    const nextAds = ads.filter((ad) => ad.id !== adId);
    const ok = await persistAds(nextAds);
    if (ok) {
      setMessage('Anzeige gelöscht.');
      if (editingAdId === adId) {
        cancelEditingAd();
      }
    }
  };

  const handleTitleMediaFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    await uploadMedia(file, 'title');
  };

  const handleGalleryMediaFiles = async (files: File[]) => {
    for (const file of files.slice(0, Math.max(0, 8 - mediaItems.length))) {
      await uploadMedia(file, 'gallery');
    }
  };

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

  if (loading) {
    return <div className="min-h-screen bg-slate-50 p-8 text-slate-500">Lade Inserieren-Seite...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16 text-slate-900">
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      />
      <aside className={`fixed left-0 top-0 h-full w-72 bg-white z-[70] shadow-2xl transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} p-6 flex flex-col`}>
        <div className="flex justify-between items-center mb-8 text-emerald-600 font-black italic tracking-tighter">MENÜ <button onClick={() => setSidebarOpen(false)} className="text-slate-300">×</button></div>
        <nav className="space-y-5 flex-grow">
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Startseite</button>
          <button type="button" onClick={() => { setSidebarOpen(false); openProfile(); }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Mein Profil</button>

          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/netzwerk'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Netzwerk</button>
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/nachrichten'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Nachrichten</button>
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/merkliste'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Merkliste</button>
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/einstellungen'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Einstellungen</button>
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/kontakt'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Kontakt & FAQ</button>
        </nav>
        {userId && (
          <button onClick={handleLogout} className="mt-auto p-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">Abmelden</button>
        )}
      </aside>

      <LoggedInHeader
        userId={userId}
        role={viewerRole}
        userName={viewerName}
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenProfile={openProfile}
      />

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <section className="flex items-center justify-between gap-3">
          <Link href="/profil" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-colors">
            <ChevronLeft size={16} /> Zurück zum Profil
          </Link>
          <h1 className="text-sm md:text-base font-black uppercase italic text-emerald-700 tracking-wider">Anzeige erstellen</h1>
        </section>

        {(message || error) && (
          <div className={`rounded-2xl border p-4 ${error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
            {error || message}
          </div>
        )}

        <section className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm space-y-6">
          <div>
            <h1 className="text-2xl font-black italic uppercase text-slate-900">{editingAdId ? 'Anzeige bearbeiten' : 'Neue Anzeige'}</h1>
            <p className="text-xs text-slate-500 mt-1">Mindestens ein Titelbild ist Pflicht. Weitere Bilder/Videos sind optional.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              id="ad-title"
              name="ad-title"
              value={formData.titel}
              onChange={(e) => setFormData((prev) => ({ ...prev, titel: e.target.value }))}
              placeholder="Titel"
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"
            />
            <select
              id="ad-kategorie"
              name="ad-kategorie"
              value={formData.kategorie}
              onChange={(e) => setFormData((prev) => ({ ...prev, kategorie: e.target.value }))}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"
            >
              {verfuegbareKategorien.map((kategorie) => (
                <option key={kategorie} value={kategorie}>{kategorie}</option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Einsatzmodus</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setFormData((prev) => ({ ...prev, modus: 'mobil' }))} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border ${formData.modus === 'mobil' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>Mobil</button>
              <button type="button" onClick={() => setFormData((prev) => ({ ...prev, modus: 'vor_ort', mobilRadiusKm: '' }))} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border ${formData.modus === 'vor_ort' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>Vor Ort</button>
            </div>
            {formData.modus === 'mobil' && (
              <div className="space-y-1">
                <label htmlFor="ad-mobilRadius" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Umkreis um Profilstandort</label>
                <select
                  id="ad-mobilRadius"
                  name="ad-mobilRadius"
                  value={formData.mobilRadiusKm}
                  onChange={(e) => setFormData((prev) => ({ ...prev, mobilRadiusKm: e.target.value }))}
                  className="w-full md:w-64 rounded-xl border border-slate-200 bg-white p-3 text-sm"
                >
                  <option value="">Umkreis wählen</option>
                  {MOBIL_RADIUS_OPTIONS.map((radius) => (
                    <option key={radius} value={radius}>{radius} km</option>
                  ))}
                </select>
              </div>
            )}
            {formData.modus === 'vor_ort' && (
              <p className="text-xs text-slate-600 inline-flex items-center gap-2"><MapPin size={14} /> Adresse aus Profil: {profilMeta.plz} {profilMeta.ort || 'nicht hinterlegt'}</p>
            )}
          </div>

          <textarea
            id="ad-beschreibung"
            name="ad-beschreibung"
            value={formData.beschreibung}
            onChange={(e) => setFormData((prev) => ({ ...prev, beschreibung: e.target.value }))}
            rows={5}
            placeholder="Beschreibung"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"
          />

          <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Titelbild (Pflicht)</p>
            <MediaDropzone
              title="Titelbild hochladen"
              description="JPG, PNG, WebP oder GIF. Eine Datei reicht aus."
              accept="image/jpeg,image/png,image/webp,image/gif"
              buttonLabel="Datei auswählen"
              busyLabel="Lädt..."
              onFiles={handleTitleMediaFiles}
            />
            {formData.titleImageUrl && <img src={formData.titleImageUrl} alt="Titelbild" className="w-full max-w-sm h-40 object-cover rounded-xl border border-slate-200" />}
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Weitere Medien (optional)</p>
            <MediaDropzone
              title="Bilder und Videos hinzufügen"
              description="Ziehe Medien hier hinein oder klicke, um Dateien auszuwählen."
              accept="image/*,video/*"
              multiple
              buttonLabel="Dateien auswählen"
              busyLabel="Lädt..."
              onFiles={handleGalleryMediaFiles}
            />
            {mediaItems.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {mediaItems.map((media, idx) => (
                  <div key={`${media.url}-${idx}`} className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                    {media.mediaType === 'video' ? <video src={media.url} className="w-full h-24 object-cover" /> : <img src={media.url} alt="Medium" className="w-full h-24 object-cover" />}
                    <button type="button" onClick={() => setMediaItems((prev) => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 text-slate-700 flex items-center justify-center">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Preise</p>
              <button type="button" onClick={() => setPreisRows((prev) => [...prev, EMPTY_PRICE_ROW()])} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase inline-flex items-center gap-1"><Plus size={13} /> Preiszeile</button>
            </div>

            {preisRows.map((row) => (
              <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-3">
                    <label htmlFor={`price-betrag-${row.id}`} className="text-[9px] uppercase font-bold text-slate-400 ml-1">Betrag (€)</label>
                    <input
                      id={`price-betrag-${row.id}`}
                      name={`price-betrag-${row.id}`}
                      value={row.betrag}
                      onChange={(e) => setPreisRows((prev) => prev.map((priceRow) => (priceRow.id === row.id ? { ...priceRow, betrag: e.target.value } : priceRow)))}
                      placeholder="0,00"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label htmlFor={`price-typ-${row.id}`} className="text-[9px] uppercase font-bold text-slate-400 ml-1">Leistungstyp</label>
                    <select
                      id={`price-typ-${row.id}`}
                      name={`price-typ-${row.id}`}
                      value={row.typ}
                      onChange={(e) => setPreisRows((prev) => prev.map((priceRow) => (priceRow.id === row.id ? { ...priceRow, typ: e.target.value as PriceRow['typ'] } : priceRow)))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
                    >
                      <option value="einzel">Einzelleistung</option>
                      <option value="custom">Eigene Bezeichnung</option>
                    </select>
                  </div>

                  <div className="md:col-span-5">
                    {(
                    <>
                        <label className="text-[9px] uppercase font-bold text-slate-400 ml-1">Bezeichnung</label>
                        <input
                          value={row.typBezeichnung}
                          onChange={(e) => setPreisRows((prev) => prev.map((priceRow) => (priceRow.id === row.id ? { ...priceRow, typBezeichnung: e.target.value } : priceRow)))}
                          placeholder={row.typ === 'custom' ? 'z. B. Intensiv-Workshop' : 'Zusatzinfo'}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
                        />
                      </>
                    )}
                  </div>
                </div>

                {preisRows.length > 1 && (
                  <div className="flex justify-end">
                    <button type="button" onClick={() => setPreisRows((prev) => prev.filter((priceRow) => priceRow.id !== row.id))} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="fixed bottom-6 right-6 flex flex-col md:flex-row gap-3 z-[100]">
            <button
              type="button"
              onClick={() => {
                const previewData = { ...formData, prices: preisRows };
                localStorage.setItem('ad_preview', JSON.stringify(previewData));
                window.open('/offer/preview', '_blank');
              }}
              className="px-10 py-4 bg-white text-slate-900 rounded-2xl font-black uppercase italic shadow-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <Eye size={18} /> Vorschau
            </button>

            <button
              type="button"
              onClick={() => editingAdId ? saveEditedAd() : createAd('public')}
              disabled={saving}
              className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase italic shadow-xl hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? 'Speichert...' : editingAdId ? 'Änderungen speichern' : 'Jetzt Veröffentlichen'}
            </button>
          </div>

        </section>

        <section className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-black uppercase italic text-slate-900">Bereits online geschaltet / Entwürfe</h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => setVisibilityFilter('public')} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border ${visibilityFilter === 'public' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>Öffentlich sichtbar</button>
              <button type="button" onClick={() => setVisibilityFilter('draft')} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border ${visibilityFilter === 'draft' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>Entwürfe</button>
            </div>
          </div>

          {gefilterteAds.length === 0 ? (
            <p className="text-sm text-slate-500">Keine Anzeigen in diesem Bereich.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {gefilterteAds.map((ad) => (
                <article key={ad.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  {ad.titleImageUrl && <img src={ad.titleImageUrl} alt={ad.titel} className="w-full h-36 object-cover rounded-xl border border-slate-200" />}
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">{ad.kategorie || 'Kategorie offen'}</p>
                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${ad.visibility === 'public' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{ad.visibility === 'public' ? 'Online' : 'Entwurf'}</span>
                  </div>
                  <h3 className="text-base font-black uppercase italic text-slate-900">{ad.titel}</h3>
                  {ad.modus === 'mobil' && ad.mobilRadiusKm ? (
                    <p className="text-xs text-slate-600 inline-flex items-center gap-2"><MapPin size={14} /> Mobil bis {ad.mobilRadiusKm} km um {profilMeta.plz} {profilMeta.ort || 'Profilstandort'}</p>
                  ) : (
                    <p className="text-xs text-slate-600 inline-flex items-center gap-2"><MapPin size={14} /> Vor Ort: {profilMeta.plz} {profilMeta.ort || 'nicht hinterlegt'}</p>
                  )}
                  <p className="text-sm text-slate-600 line-clamp-3">{ad.beschreibung || 'Keine Beschreibung.'}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 rounded-lg text-[9px] font-black uppercase bg-slate-200 text-slate-700">
                      Einmalzahlung
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <span className="inline-flex items-center gap-1"><Eye size={13} /> {ad.viewsCount}</span>
                    <span className="inline-flex items-center gap-1"><Heart size={13} /> {ad.wishlistCount}</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => startEditingAd(ad)} disabled={saving} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-200 bg-white text-slate-700 disabled:opacity-60">Bearbeiten</button>
                    {userId && <Link href={`/anzeige/${userId}/${ad.id}`} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-200 bg-white text-slate-700">Vorschau</Link>}
                    <button type="button" onClick={() => shareAdLink(ad.id)} disabled={saving} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-200 bg-white text-slate-700 inline-flex items-center gap-1 disabled:opacity-60"><Share2 size={12} /> Link teilen</button>
                    {ad.visibility === 'public' ? (
                      <button type="button" onClick={() => updateAdVisibility(ad.id, 'draft')} disabled={saving} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-200 bg-white text-slate-700 disabled:opacity-60">In Entwürfe</button>
                    ) : (
                      <button type="button" onClick={() => updateAdVisibility(ad.id, 'public')} disabled={saving} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-emerald-200 bg-emerald-50 text-emerald-700 disabled:opacity-60">Online schalten</button>
                    )}
                    <button type="button" onClick={() => deleteAd(ad.id)} disabled={saving} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-red-200 bg-red-50 text-red-700 disabled:opacity-60">Löschen</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}