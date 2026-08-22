"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Heart, MapPin, MessageCircle, Trash2 } from 'lucide-react';
import { getBookmarkedNetworkPosts, getResolvedUserRole, getWishlistItems, removeWishlistItem, toggleNetworkPostLike, toggleNetworkPostSave } from '../actions';
import LoggedInHeader from '../components/logged-in-header';

type WishlistItem = {
  id: string | number;
  sourceId: string;
  typ: 'person' | 'anzeige';
  profilTyp: 'experte' | 'nutzer';
  name: string;
  ort: string;
  plz: string;
  kategorieText: string;
  content: string;
  createdAt: string;
};

type SavedPost = {
  id: number;
  author_user_id: number;
  group_id: number | null;
  title: string;
  content: string;
  hashtags: string[];
  created_at: string;
  saved_at?: string;
  bookmark_type?: 'saved' | 'liked' | 'saved_liked';
  liked_by_viewer?: boolean;
  saved_by_viewer?: boolean;
  vorname: string;
  nachname: string;
  role: string;
  group_name: string | null;
};

type MerklisteFilter = 'alle' | 'anzeigen' | 'suchen' | 'beitraege' | 'profile';

type MerklisteEntry =
  | { kind: 'wishlist'; createdAt: string; item: WishlistItem }
  | { kind: 'post'; createdAt: string; post: SavedPost };

export default function MerklistePage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [filterTyp, setFilterTyp] = useState<MerklisteFilter>('alle');
  const [needsLogin, setNeedsLogin] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState('Profil');
  const [userId, setUserId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const typ = params.get('typ');
    if (typ === 'beitrag' || typ === 'beitraege') {
      setFilterTyp('beitraege');
      return;
    }
    if (typ === 'anzeige') {
      setFilterTyp('anzeigen');
      return;
    }
    if (typ === 'suche') {
      setFilterTyp('suchen');
      return;
    }
    if (typ === 'person' || typ === 'profil') {
      setFilterTyp('profile');
    }
  }, []);

  useEffect(() => {
    const roleRaw = sessionStorage.getItem('userRole');
    setRole(roleRaw);
    setUserName(sessionStorage.getItem('userName') || (roleRaw === 'experte' ? 'Experte' : 'Nutzer'));

    const load = async () => {
      const userIdRaw = sessionStorage.getItem('userId');
      if (!userIdRaw) {
        setNeedsLogin(true);
        setItems([]);
        return;
      }

      const userId = parseInt(userIdRaw, 10);
      if (Number.isNaN(userId)) {
        setNeedsLogin(true);
        setItems([]);
        return;
      }

      setUserId(userId);

      getResolvedUserRole(userId).then((roleRes) => {
        if (roleRes.success && roleRes.role) {
          setRole(roleRes.role);
          sessionStorage.setItem('userRole', roleRes.role);
        }
      }).catch(() => {
        // Keep the session role when resolving fails.
      });

      const res = await getWishlistItems(userId);
      if (res.success && Array.isArray(res.items)) {
        setNeedsLogin(false);
        setItems(res.items as WishlistItem[]);
      } else {
        setItems([]);
      }

      const savedPostsRes = await getBookmarkedNetworkPosts(userId, 120);
      if (savedPostsRes.success && Array.isArray(savedPostsRes.posts)) {
        setSavedPosts(savedPostsRes.posts as SavedPost[]);
      } else {
        setSavedPosts([]);
      }
    };

    load();
  }, []);

  const filtered = useMemo<MerklisteEntry[]>(() => {
    const anzeigeItems = items.filter((item) => item.typ === 'anzeige' && item.profilTyp === 'experte');
    const sucheItems = items.filter((item) => item.typ === 'anzeige' && item.profilTyp === 'nutzer');
    const profileItems = items.filter((item) => item.typ === 'person');

    let wishlistBase: WishlistItem[] = [];
    let postBase: SavedPost[] = [];

    if (filterTyp === 'anzeigen') {
      wishlistBase = anzeigeItems;
    } else if (filterTyp === 'suchen') {
      wishlistBase = sucheItems;
    } else if (filterTyp === 'profile') {
      wishlistBase = profileItems;
    } else if (filterTyp === 'beitraege') {
      postBase = savedPosts;
    } else {
      wishlistBase = items;
      postBase = savedPosts;
    }

    const entries: MerklisteEntry[] = [
      ...wishlistBase.map((item) => ({ kind: 'wishlist' as const, createdAt: String(item.createdAt || ''), item })),
      ...postBase.map((post) => ({ kind: 'post' as const, createdAt: String(post.saved_at || post.created_at || ''), post }))
    ];

    entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return entries;
  }, [items, savedPosts, filterTyp]);

  const filterStats = useMemo(() => {
    const anzeigen = items.filter((item) => item.typ === 'anzeige' && item.profilTyp === 'experte').length;
    const suchen = items.filter((item) => item.typ === 'anzeige' && item.profilTyp === 'nutzer').length;
    const profile = items.filter((item) => item.typ === 'person').length;
    const beitraege = savedPosts.length;
    return {
      anzeigen,
      suchen,
      profile,
      beitraege,
      alle: items.length + savedPosts.length
    };
  }, [items, savedPosts]);

  const removeItem = async (id: string | number) => {
    const userIdRaw = sessionStorage.getItem('userId');
    if (!userIdRaw) return;

    const userId = parseInt(userIdRaw, 10);
    const targetItem = items.find((item) => String(item.id) === String(id));
    const sourceId = String(targetItem?.sourceId || id || '').trim();
    if (!Number.isNaN(userId) && sourceId) {
      await removeWishlistItem(userId, sourceId);
    }

    const next = items.filter((item) => item.id !== id);
    setItems(next);
  };

  const removeSavedPost = async (postId: number) => {
    const userIdRaw = sessionStorage.getItem('userId');
    if (!userIdRaw) return;
    const uid = parseInt(userIdRaw, 10);
    if (Number.isNaN(uid)) return;

    const target = savedPosts.find((post) => post.id === postId);
    if (!target) return;

    let failed = false;
    if (target.saved_by_viewer) {
      const saveRes = await toggleNetworkPostSave({ userId: uid, postId });
      if (!saveRes.success) {
        alert(saveRes.error || 'Beitrag konnte nicht aus gespeichert entfernt werden.');
        failed = true;
      }
    }

    if (!failed && target.liked_by_viewer) {
      const likeRes = await toggleNetworkPostLike({ userId: uid, postId });
      if (!likeRes.success) {
        alert(likeRes.error || 'Like konnte nicht entfernt werden.');
        failed = true;
      }
    }

    if (failed) {
      return;
    }

    setSavedPosts((prev) => prev.filter((post) => post.id !== postId));
  };

  const getPublicProfileHref = (item: WishlistItem) => {
    const source = String(item.sourceId || '');
    const dbMatch = source.match(/db-(\d+)/);
    if (dbMatch?.[1]) {
      return `/profil/${dbMatch[1]}`;
    }

    const trailingIdMatch = source.match(/(\d+)$/);
    if (trailingIdMatch?.[1]) {
      return `/profil/${trailingIdMatch[1]}`;
    }

    return item.profilTyp === 'experte' ? '/einstellungen' : '/dashboard/nutzer/profil';
  };

  const writeMessageTo = (item: WishlistItem) => {
    const params = new URLSearchParams();
    params.set('target', item.name);
    params.set('targetType', item.typ === 'anzeige' ? 'anzeige' : 'person');

    const match = String(item.sourceId || '').match(/(\d+)$/);
    if (match?.[1]) {
      params.set('targetUserId', match[1]);
    }

    window.location.href = `/nachrichten?${params.toString()}`;
  };

  const normalizedRole = (role || '').trim().toLowerCase();

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

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-900">
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      />
      <aside className={`fixed left-0 top-0 h-full w-72 bg-white z-[70] shadow-2xl transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} p-6 flex flex-col`}>
        <div className="flex justify-between items-center mb-8 text-emerald-600 font-black italic tracking-tighter">MENÜ <button onClick={() => setSidebarOpen(false)} className="text-slate-300">×</button></div>
        <nav className="space-y-5 flex-grow">
          {normalizedRole === 'nutzer' || normalizedRole === 'user' || normalizedRole === 'kunde' ? (
            <>
              <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Startseite</button>
              <button type="button" onClick={() => { setSidebarOpen(false); openProfile(); }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Mein Profil</button>
              <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/merkliste'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Merkliste</button>
              <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/nachrichten'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Nachrichten</button>
              <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/einstellungen'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Einstellungen</button>
              <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/kontakt'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Kontakt & FAQ</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Startseite</button>
              <button type="button" onClick={() => { setSidebarOpen(false); openProfile(); }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Mein Profil</button>

              <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/netzwerk'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Netzwerk</button>
              <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/merkliste'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Merkliste</button>
              <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/nachrichten'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Nachrichten</button>
              <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/einstellungen'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Einstellungen</button>
              <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/kontakt'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Kontakt & FAQ</button>
            </>
          )}
        </nav>
        {role && (
          <button onClick={handleLogout} className="mt-auto p-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">Abmelden</button>
        )}
      </aside>

      <LoggedInHeader
        userId={userId}
        role={role}
        userName={userName}
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenProfile={openProfile}
      />

      <main className="max-w-5xl mx-auto px-6 mt-10 space-y-6">
        <section className="bg-white rounded-[2rem] border border-slate-100 p-4">
          <div className="flex flex-wrap gap-2">
            {([
              { key: 'alle', label: `Alle (${filterStats.alle})` },
              { key: 'anzeigen', label: `Anzeigen (${filterStats.anzeigen})` },
              { key: 'suchen', label: `Suchen (${filterStats.suchen})` },
              { key: 'beitraege', label: `Beiträge (${filterStats.beitraege})` },
              { key: 'profile', label: `Profile (${filterStats.profile})` }
            ] as Array<{ key: MerklisteFilter; label: string }>).map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => setFilterTyp(entry.key)}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${filterTyp === entry.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </section>

        {filtered.length === 0 && (
          <section className="bg-white rounded-[2.5rem] p-10 border border-slate-100 text-center">
            <Heart className="mx-auto text-slate-300" size={24} />
            <p className="mt-3 text-sm font-black uppercase text-slate-500">{needsLogin ? 'Bitte einloggen, um deine Merkliste zu sehen' : 'Keine Einträge für diesen Filter'}</p>
          </section>
        )}

        <div className="space-y-4">
          {filtered.map((entry) => {
            if (entry.kind === 'post') {
              const post = entry.post;
              return (
                <section key={`post-${post.id}`} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm overflow-hidden">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-violet-50 text-violet-700">Beitrag</span>
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-slate-50 text-slate-500">{post.group_id ? 'Gruppe' : 'Profil'}</span>
                      </div>
                      <h2 className="text-lg font-black italic uppercase text-slate-900">{post.title || 'Ohne Titel'}</h2>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {post.vorname} {post.nachname}{post.group_name ? ` • Gruppe: ${post.group_name}` : ''}
                      </p>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">{post.content}</p>
                    </div>
                    <div className="w-full md:w-auto grid grid-cols-1 sm:grid-cols-3 md:grid-cols-1 gap-2">
                      <Link href={`/netzwerk#post-${post.id}`} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 inline-flex items-center gap-1 justify-center whitespace-nowrap">Im Feed öffnen</Link>
                      <button onClick={() => removeSavedPost(post.id)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-50 border border-slate-200 text-slate-500 hover:border-red-200 hover:text-red-500 inline-flex items-center gap-1 justify-center whitespace-nowrap"><Trash2 size={12} /> Entfernen</button>
                    </div>
                  </div>
                </section>
              );
            }

            const item = entry.item;
            const typLabel = item.typ === 'person'
              ? 'Profil'
              : item.profilTyp === 'experte'
                ? 'Anzeige'
                : 'Suche';

            return (
              <section key={item.id} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600">{typLabel}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-slate-50 text-slate-500">{item.profilTyp}</span>
                    </div>
                    <h2 className="text-lg font-black italic uppercase text-slate-900">{item.name}</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.kategorieText}</p>
                    <p className="text-sm text-slate-600">{item.content}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1"><MapPin size={12} /> {item.plz} {item.ort}</p>
                  </div>
                  <div className="w-full md:w-auto grid grid-cols-1 sm:grid-cols-3 md:grid-cols-1 gap-2">
                    <Link href={getPublicProfileHref(item)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 inline-flex items-center gap-1 justify-center whitespace-nowrap">Profil öffnen</Link>
                    <button onClick={() => writeMessageTo(item)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-500 inline-flex items-center gap-1 justify-center whitespace-nowrap"><MessageCircle size={12} /> Nachricht</button>
                    <button onClick={() => removeItem(item.id)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-50 border border-slate-200 text-slate-500 hover:border-red-200 hover:text-red-500 inline-flex items-center gap-1 justify-center whitespace-nowrap"><Trash2 size={12} /> Entfernen</button>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
