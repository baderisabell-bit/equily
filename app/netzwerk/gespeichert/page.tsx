"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  createNetworkPostSaveGroup,
  deleteNetworkPostSaveGroup,
  getNetworkPostSaveGroups,
  getResolvedUserRole,
  getSavedNetworkPosts,
  renameNetworkPostSaveGroup,
  toggleNetworkPostSave
} from '../../actions';
import LoggedInHeader from '../../components/logged-in-header';

type SavedPost = {
  id: number;
  author_user_id: number;
  group_id: number | null;
  title: string;
  content: string;
  hashtags: string[];
  media_items: Array<{ url: string; mediaType: 'image' | 'video' }>;
  created_at: string;
  saved_at?: string;
  vorname: string;
  nachname: string;
  role: string;
  group_name: string | null;
  comment_count: number;
  save_count: number;
  like_count: number;
  report_count: number;
  save_group_names?: string[];
};

type SaveGroup = {
  id: number;
  name: string;
  post_count: number;
};

export default function GespeicherteNetzwerkPostsPage() {
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState('Profil');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'all' | 'group' | 'profile'>('all');
  const [sortBy, setSortBy] = useState<'savedNewest' | 'postNewest' | 'mostComments'>('savedNewest');
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [saveGroups, setSaveGroups] = useState<SaveGroup[]>([]);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');
  const [newGroupName, setNewGroupName] = useState('');
  const [renamingGroupId, setRenamingGroupId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    const roleRaw = sessionStorage.getItem('userRole');
    const userIdRaw = sessionStorage.getItem('userId');
    const parsed = userIdRaw ? parseInt(userIdRaw, 10) : NaN;

    if (Number.isNaN(parsed) || parsed <= 0) {
      window.location.href = '/login';
      return;
    }

    setRole(roleRaw);
    setUserName(sessionStorage.getItem('userName') || (roleRaw === 'experte' ? 'Experte' : 'Nutzer'));
    setUserId(parsed);

    getResolvedUserRole(parsed).then((roleRes) => {
      if (roleRes.success && roleRes.role) {
        setRole(roleRes.role);
        sessionStorage.setItem('userRole', roleRes.role);
      }
    }).catch(() => {
      // Keep the session role when resolving fails.
    });
  }, []);

  const loadSaved = async (viewerId: number) => {
    setLoading(true);
    const res = await getSavedNetworkPosts(viewerId, 120);
    if (res.success) {
      setSavedPosts((res.posts || []) as SavedPost[]);
    }
    setLoading(false);
  };

  const loadSaveGroups = async (viewerId: number) => {
    const res = await getNetworkPostSaveGroups(viewerId);
    if (res.success) {
      setSaveGroups((res.groups || []) as SaveGroup[]);
    }
  };

  useEffect(() => {
    if (!userId) return;
    loadSaved(userId);
    loadSaveGroups(userId);
  }, [userId]);

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...savedPosts];

    if (scope === 'group') {
      list = list.filter((post) => Boolean(post.group_id));
    } else if (scope === 'profile') {
      list = list.filter((post) => !post.group_id);
    }

    if (selectedGroupFilter !== 'all') {
      list = list.filter((post) => Array.isArray(post.save_group_names) && post.save_group_names.includes(selectedGroupFilter));
    }

    if (q) {
      list = list.filter((post) => {
        const hay = [post.title, post.content, post.group_name || '', post.vorname, post.nachname, ...(Array.isArray(post.hashtags) ? post.hashtags : [])]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }

    if (sortBy === 'postNewest') {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'mostComments') {
      list.sort((a, b) => Number(b.comment_count || 0) - Number(a.comment_count || 0));
    } else {
      list.sort(
        (a, b) =>
          new Date(String(b.saved_at || b.created_at)).getTime() -
          new Date(String(a.saved_at || a.created_at)).getTime()
      );
    }

    return list;
  }, [savedPosts, query, scope, selectedGroupFilter, sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, scope, selectedGroupFilter, sortBy]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const groupCount = filtered.filter((post) => Boolean(post.group_id)).length;
    const profileCount = total - groupCount;
    const totalComments = filtered.reduce((acc, post) => acc + Number(post.comment_count || 0), 0);

    const topCommented = filtered.reduce<SavedPost | null>((best, post) => {
      if (!best) return post;
      return Number(post.comment_count || 0) > Number(best.comment_count || 0) ? post : best;
    }, null);

    return {
      total,
      groupCount,
      profileCount,
      totalComments,
      topCommentedTitle: topCommented?.title || null,
      topCommentedCount: Number(topCommented?.comment_count || 0)
    };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, idx) => idx + 1);
    }

    const pages: number[] = [1];
    const start = Math.max(2, safePage - 1);
    const end = Math.min(totalPages - 1, safePage + 1);

    for (let p = start; p <= end; p += 1) {
      pages.push(p);
    }

    pages.push(totalPages);
    return Array.from(new Set(pages)).sort((a, b) => a - b);
  }, [safePage, totalPages]);

  const unsavePost = async (postId: number) => {
    if (!userId || busy) return;
    setBusy(true);
    const res = await toggleNetworkPostSave({ userId, postId });
    setBusy(false);

    if (!res.success) {
      alert(res.error || 'Beitrag konnte nicht entfernt werden.');
      return;
    }

    await loadSaved(userId);
  };

  const openPublicProfile = (targetUserId: number) => {
    const safeId = Number(targetUserId);
    if (!Number.isInteger(safeId) || safeId <= 0) return;
    window.location.href = `/profil/${safeId}`;
  };

  const openGroup = (groupId: number) => {
    const safeId = Number(groupId);
    if (!Number.isInteger(safeId) || safeId <= 0) return;
    window.location.href = `/netzwerk/gruppen/${safeId}`;
  };

  const createGroup = async () => {
    if (!userId || busy) return;
    const name = newGroupName.trim();
    if (name.length < 2) {
      alert('Gruppenname ist zu kurz.');
      return;
    }
    setBusy(true);
    const res = await createNetworkPostSaveGroup({ userId, name });
    setBusy(false);
    if (!res.success) {
      alert(res.error || 'Gruppe konnte nicht erstellt werden.');
      return;
    }
    setNewGroupName('');
    await loadSaveGroups(userId);
  };

  const startRenameGroup = (group: SaveGroup) => {
    setRenamingGroupId(group.id);
    setRenameValue(group.name);
  };

  const confirmRenameGroup = async (groupId: number) => {
    if (!userId || busy) return;
    const name = renameValue.trim();
    if (name.length < 2) {
      alert('Gruppenname ist zu kurz.');
      return;
    }
    setBusy(true);
    const res = await renameNetworkPostSaveGroup({ userId, groupId, name });
    setBusy(false);
    if (!res.success) {
      alert(res.error || 'Gruppe konnte nicht umbenannt werden.');
      return;
    }
    setRenamingGroupId(null);
    setRenameValue('');
    if (selectedGroupFilter !== 'all') {
      setSelectedGroupFilter(name);
    }
    await loadSaveGroups(userId);
    await loadSaved(userId);
  };

  const removeGroup = async (groupId: number) => {
    if (!userId || busy) return;
    const approved = window.confirm('Diese Speichergruppe wirklich loeschen?');
    if (!approved) return;
    setBusy(true);
    const res = await deleteNetworkPostSaveGroup({ userId, groupId });
    setBusy(false);
    if (!res.success) {
      alert(res.error || 'Gruppe konnte nicht geloescht werden.');
      return;
    }
    if (selectedGroupFilter !== 'all') {
      setSelectedGroupFilter('all');
    }
    await loadSaveGroups(userId);
    await loadSaved(userId);
  };

  const normalizedRole = String(role || '').trim().toLowerCase();
  const isExpertRole = normalizedRole === 'experte';

  if (!userId) {
    return (
      <div className="min-h-screen bg-slate-50 p-10">
        <p className="text-sm font-black uppercase tracking-widest text-slate-400">Lade gespeicherte Beiträge...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
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
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/netzwerk/gespeichert'; }} className="block text-left text-lg font-black italic uppercase text-emerald-600 hover:text-emerald-600">Gespeichert</button>
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/merkliste'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Merkliste</button>
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/nachrichten'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Nachrichten</button>
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/einstellungen'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Einstellungen</button>
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/kontakt'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Kontakt & FAQ</button>
        </nav>
        <button onClick={handleLogout} className="mt-auto p-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">Abmelden</button>
      </aside>

      <LoggedInHeader
        userId={userId}
        role={role}
        userName={userName}
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenProfile={openProfile}
      />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <section className="bg-white border border-slate-200 rounded-[2rem] p-6 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Netzwerk</p>
          <h1 className="text-3xl font-black italic uppercase tracking-tight text-slate-900">Meine gespeicherten Beiträge</h1>
          <p className="text-sm text-slate-600">Durchsuche und verwalte alle gespeicherten Beiträge an einem Ort.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suche in Titel, Inhalt, Hashtags"
            className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-medium"
          />
          <select
            value={scope}
            onChange={(e) => setScope((e.target.value as 'all' | 'group' | 'profile'))}
            className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold"
          >
            <option value="all">Alle</option>
            <option value="group">Nur Gruppenbeiträge</option>
            <option value="profile">Nur Profilbeiträge</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy((e.target.value as 'savedNewest' | 'postNewest' | 'mostComments'))}
            className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold"
          >
            <option value="savedNewest">Zuletzt gespeichert</option>
            <option value="postNewest">Neueste Beiträge</option>
            <option value="mostComments">Meiste Kommentare</option>
          </select>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Speichergruppen</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedGroupFilter('all')}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border ${selectedGroupFilter === 'all' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 text-slate-700'}`}
              >
                Alle Gruppen
              </button>
              {saveGroups.map((group) => (
                <button
                  key={`group-filter-${group.id}`}
                  type="button"
                  onClick={() => setSelectedGroupFilter(group.name)}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border ${selectedGroupFilter === group.name ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 text-slate-700'}`}
                >
                  {group.name} ({group.post_count || 0})
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Neue Speichergruppe"
              className="w-full md:w-80 p-3 rounded-xl border border-slate-200 bg-slate-50 font-medium"
            />
            <button
              type="button"
              onClick={createGroup}
              disabled={busy}
              className="px-4 py-3 rounded-xl text-[10px] font-black uppercase bg-slate-900 text-white disabled:opacity-60"
            >
              Gruppe erstellen
            </button>
          </div>

          {saveGroups.length > 0 && (
            <div className="space-y-2">
              {saveGroups.map((group) => (
                <div key={`group-row-${group.id}`} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex flex-wrap items-center gap-2 justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    {renamingGroupId === group.id ? (
                      <>
                        <input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="p-2 rounded-lg border border-slate-200 bg-white text-sm"
                        />
                        <button type="button" onClick={() => confirmRenameGroup(group.id)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-slate-900 text-white">Speichern</button>
                        <button type="button" onClick={() => { setRenamingGroupId(null); setRenameValue(''); }} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-300 text-slate-700">Abbrechen</button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-black uppercase text-slate-900">{group.name}</p>
                        <p className="text-[10px] font-black uppercase text-slate-500">{group.post_count || 0} Beitraege</p>
                      </>
                    )}
                  </div>
                  {renamingGroupId !== group.id && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => startRenameGroup(group)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-300 text-slate-700">Umbenennen</button>
                      <button type="button" onClick={() => removeGroup(group.id)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-red-200 text-red-600">Loeschen</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-6 grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <p className="text-[10px] font-black uppercase text-slate-400">Gespeichert</p>
            <p className="text-2xl font-black italic text-slate-900 mt-1">{stats.total}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <p className="text-[10px] font-black uppercase text-slate-400">Gruppenposts</p>
            <p className="text-2xl font-black italic text-slate-900 mt-1">{stats.groupCount}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <p className="text-[10px] font-black uppercase text-slate-400">Profilposts</p>
            <p className="text-2xl font-black italic text-slate-900 mt-1">{stats.profileCount}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <p className="text-[10px] font-black uppercase text-slate-400">Kommentare gesamt</p>
            <p className="text-2xl font-black italic text-slate-900 mt-1">{stats.totalComments}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <p className="text-[10px] font-black uppercase text-slate-400">Top Kommentar</p>
            <p className="text-xs font-black uppercase text-slate-700 mt-1 line-clamp-2">{stats.topCommentedTitle || 'Kein Beitrag'}</p>
            <p className="text-[10px] font-black uppercase text-emerald-700 mt-1">{stats.topCommentedCount} Kommentare</p>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-6 space-y-3">
          {loading ? (
            <p className="text-sm font-black uppercase tracking-widest text-slate-400">Lade...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-500">Keine gespeicherten Beiträge gefunden.</p>
          ) : (
            paginated.map((post) => (
              <article key={`saved-post-${post.id}`} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-black uppercase text-slate-900">{post.title}</p>
                  <button
                    type="button"
                    onClick={() => unsavePost(post.id)}
                    className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-red-200 text-red-600"
                  >
                    Entfernen
                  </button>
                </div>
                <div className="text-[10px] font-black uppercase text-slate-400 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => openPublicProfile(Number(post.author_user_id))} className="text-emerald-700 hover:text-emerald-600 transition-colors">
                    {post.vorname} {post.nachname}
                  </button>
                  <span>•</span>
                  <span>{post.role}</span>
                  {post.group_name && post.group_id ? (
                    <>
                      <span>•</span>
                      <button type="button" onClick={() => openGroup(Number(post.group_id))} className="text-slate-600 hover:text-emerald-600 transition-colors">
                        Gruppe: {post.group_name}
                      </button>
                    </>
                  ) : null}
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{post.content}</p>

                {Array.isArray(post.hashtags) && post.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {post.hashtags.map((tag) => (
                      <span key={`${post.id}-${tag}`} className="px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-50 text-emerald-700">#{tag}</span>
                    ))}
                  </div>
                )}

                {Array.isArray(post.save_group_names) && post.save_group_names.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {post.save_group_names.map((name) => (
                      <span key={`${post.id}-save-group-${name}`} className="px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-slate-200 text-slate-700">{name}</span>
                    ))}
                  </div>
                )}

                <div className="text-[10px] font-black uppercase text-slate-500">
                  Kommentare: {post.comment_count || 0} • Likes: {post.like_count || 0} • Gespeichert: {post.save_count || 0} • Gemeldet: {post.report_count || 0}
                </div>

                <button
                  type="button"
                  onClick={() => { window.location.href = `/netzwerk#post-${post.id}`; }}
                  className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-300 text-slate-700"
                >
                  Im Feed öffnen
                </button>
                <button
                  type="button"
                  onClick={() => openPublicProfile(Number(post.author_user_id))}
                  className="ml-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-emerald-200 text-emerald-700"
                >
                  Profil öffnen
                </button>
                {post.group_id ? (
                  <button
                    type="button"
                    onClick={() => openGroup(Number(post.group_id))}
                    className="ml-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-300 text-slate-700"
                  >
                    Gruppe öffnen
                  </button>
                ) : null}
              </article>
            ))
          )}

          {!loading && filtered.length > 0 && (
            <div className="pt-4 mt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Seite {safePage} von {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-300 text-slate-700 disabled:opacity-40"
                >
                  Zurück
                </button>
                <select
                  value={safePage}
                  onChange={(e) => setCurrentPage(parseInt(e.target.value, 10))}
                  className="md:hidden p-2 rounded-xl border border-slate-300 bg-white text-[10px] font-black uppercase text-slate-700"
                >
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
                    <option key={`mobile-page-${page}`} value={page}>
                      Seite {page}
                    </option>
                  ))}
                </select>
                <div className="hidden md:flex items-center gap-1">
                  {pageNumbers.map((page, index) => {
                    const prev = pageNumbers[index - 1];
                    const showGap = index > 0 && prev && page - prev > 1;
                    return (
                      <React.Fragment key={`page-fragment-${page}`}>
                        {showGap && <span className="px-1 text-xs font-black text-slate-400">…</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`min-w-8 px-2 py-2 rounded-lg text-[10px] font-black uppercase border ${safePage === page ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 text-slate-700'}`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-300 text-slate-700 disabled:opacity-40"
                >
                  Weiter
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
