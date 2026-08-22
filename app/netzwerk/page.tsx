"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  addNetworkPostComment,
  createNetworkGroup,
  getResolvedUserRole,
  getGroupModerationQueue,
  getNetworkFeed,
  getNetworkGroups,
  getNetworkOverview,
  getNetworkPostComments,
  moderateGroupPost,
  reportNetworkPost,
  joinNetworkGroup,
  respondToConnectionRequest,
  shareNetworkPost,
  sendConnectionRequest,
  trackInteractionShare,
  toggleNetworkPostLike,
  getNetworkPostSaveGroups,
  toggleNetworkPostSave,
} from '../actions';
import LoggedInHeader from '../components/logged-in-header';

type NetworkOverview = {
  incoming: any[];
  outgoing: any[];
  connections: any[];
  discover: any[];
};

type GroupItem = {
  id: number;
  name: string;
  description: string | null;
  member_count: number;
  is_member: boolean;
};

type FeedItem = {
  id: number;
  author_user_id: number;
  group_id: number | null;
  title: string;
  content: string;
  hashtags: string[];
  media_items: Array<{ url: string; mediaType: 'image' | 'video' }>;
  created_at: string;
  vorname: string;
  nachname: string;
  role: string;
  group_name: string | null;
  post_target: 'profile' | 'group';
  moderation_status: 'pending' | 'approved' | 'rejected';
  moderation_deadline: string | null;
  rejection_reason: string | null;
  shared_post_id: number | null;
  shared_title: string | null;
  shared_author_vorname: string | null;
  shared_author_nachname: string | null;
  comment_count: number;
  save_count: number;
  report_count: number;
  like_count: number;
  saved_by_viewer: boolean;
  liked_by_viewer: boolean;
  save_group_names: string[];
  can_moderate: boolean;
};

type CommentItem = {
  id: number;
  comment_text: string;
  created_at: string;
  vorname: string;
  nachname: string;
};

type ModerationItem = {
  id: number;
  title: string;
  content: string;
  moderation_deadline: string | null;
  group_name: string;
  vorname: string;
  nachname: string;
  role: string;
};

type SaveGroupItem = { id: number; name: string; post_count: number };

export default function NetzwerkPage() {
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState('Profil');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [overview, setOverview] = useState<NetworkOverview>({ incoming: [], outgoing: [], connections: [], discover: [] });
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);

  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [saveGroups, setSaveGroups] = useState<SaveGroupItem[]>([]);
  const [moderationQueue, setModerationQueue] = useState<ModerationItem[]>([]);
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<number, CommentItem[]>>({});
  const [feedFilter, setFeedFilter] = useState<'all' | 'own' | 'group' | 'pending'>('all');
  const [feedSort, setFeedSort] = useState<'newest' | 'mostComments' | 'mostSaved'>('newest');
  const [reportDialogPostId, setReportDialogPostId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [rejectDialogPostId, setRejectDialogPostId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [saveGroupPickerPostId, setSaveGroupPickerPostId] = useState<number | null>(null);
  const [selectedSaveGroupsByPost, setSelectedSaveGroupsByPost] = useState<Record<number, string[]>>({});
  const [newSaveGroupByPost, setNewSaveGroupByPost] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);

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

  const openProfile = () => {
    const userIdRaw = sessionStorage.getItem('userId');
    const parsedUserId = userIdRaw ? parseInt(userIdRaw, 10) : NaN;
    if (!Number.isNaN(parsedUserId) && parsedUserId > 0) {
      window.location.href = `/profil/${parsedUserId}`;
      return;
    }
    window.location.href = '/login';
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

  const handleLogout = () => {
    sessionStorage.clear();
    window.location.href = '/';
  };

  const normalizedRole = String(role || '').trim().toLowerCase();
  const isExpertRole = normalizedRole === 'experte';

  const loadAll = async (viewerId: number) => {
    setLoading(true);
    const [overviewRes, groupsRes, feedRes, moderationRes, saveGroupsRes] = await Promise.all([
      getNetworkOverview(viewerId),
      getNetworkGroups(viewerId),
      getNetworkFeed(viewerId, 60),
      getGroupModerationQueue(viewerId),
      getNetworkPostSaveGroups(viewerId)
    ]);

    if (overviewRes.success) {
      setOverview({
        incoming: overviewRes.incoming || [],
        outgoing: overviewRes.outgoing || [],
        connections: overviewRes.connections || [],
        discover: overviewRes.discover || []
      });
    }

    if (groupsRes.success) {
      setGroups(groupsRes.groups as GroupItem[]);
    }

    if (feedRes.success) {
      setFeed((feedRes.posts || []) as FeedItem[]);
    }

    if (moderationRes.success) {
      setModerationQueue((moderationRes.items || []) as ModerationItem[]);
    }

    if (saveGroupsRes.success) {
      setSaveGroups((saveGroupsRes.groups || []) as SaveGroupItem[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!userId) return;
    loadAll(userId);
  }, [userId]);

  const connectedPartnerIds = useMemo(() => {
    return new Set((overview.connections || []).map((entry) => Number(entry.partner_user_id)));
  }, [overview.connections]);

  const filteredFeed = useMemo(() => {
    let base = [...feed];

    if (feedFilter === 'own') {
      base = base.filter((post) => Number(post.author_user_id) === Number(userId));
    } else if (feedFilter === 'group') {
      base = base.filter((post) => Boolean(post.group_id));
    } else if (feedFilter === 'pending') {
      base = base.filter((post) => post.moderation_status === 'pending');
    }

    if (feedSort === 'mostComments') {
      base.sort((a, b) => Number(b.comment_count || 0) - Number(a.comment_count || 0));
    } else if (feedSort === 'mostSaved') {
      base.sort((a, b) => Number(b.save_count || 0) - Number(a.save_count || 0));
    } else {
      base.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return base;
  }, [feed, feedFilter, feedSort, userId]);

  const savedFeed = useMemo(() => {
    return feed.filter((post) => Boolean(post.saved_by_viewer));
  }, [feed]);

  const requestConnect = async (targetUserId: number) => {
    if (!userId || busy) return;
    setBusy(true);
    const res = await sendConnectionRequest({ requesterId: userId, targetUserId });
    setBusy(false);

    if (!res.success) {
      alert(res.error || 'Vernetzungsanfrage fehlgeschlagen.');
      return;
    }

    await loadAll(userId);
  };

  const answerRequest = async (requestId: number, accept: boolean) => {
    if (!userId || busy) return;
    setBusy(true);
    const res = await respondToConnectionRequest({ requestId, responderId: userId, accept });
    setBusy(false);

    if (!res.success) {
      alert(res.error || 'Aktion fehlgeschlagen.');
      return;
    }

    await loadAll(userId);
  };

  const createGroup = async () => {
    if (!userId || busy) return;
    setBusy(true);
    const res = await createNetworkGroup({
      founderUserId: userId,
      name: groupName,
      description: groupDescription
    });
    setBusy(false);

    if (!res.success) {
      alert(res.error || 'Gruppe konnte nicht erstellt werden.');
      return;
    }

    setGroupName('');
    setGroupDescription('');
    await loadAll(userId);
  };

  const joinGroup = async (groupId: number) => {
    if (!userId || busy) return;
    setBusy(true);
    const res = await joinNetworkGroup({ groupId, userId });
    setBusy(false);

    if (!res.success) {
      alert(res.error || 'Beitritt fehlgeschlagen.');
      return;
    }

    await loadAll(userId);
  };

  const loadComments = async (postId: number) => {
    if (!userId) return;
    const res = await getNetworkPostComments({ userId, postId, limit: 50 });
    if (!res.success) return;
    setCommentsByPost((prev) => ({ ...prev, [postId]: (res.items || []) as CommentItem[] }));
  };

  const submitComment = async (postId: number) => {
    if (!userId || busy) return;
    const raw = String(commentInputs[postId] || '').trim();
    if (raw.length < 2) {
      alert('Kommentar ist zu kurz.');
      return;
    }

    setBusy(true);
    const res = await addNetworkPostComment({ userId, postId, comment: raw });
    setBusy(false);
    if (!res.success) {
      alert(res.error || 'Kommentar konnte nicht gespeichert werden.');
      return;
    }

    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    await Promise.all([loadAll(userId), loadComments(postId)]);
  };

  const toggleSavePost = async (post: FeedItem, explicitGroupNames?: string[]) => {
    if (!userId || busy) return;

    const postId = Number(post.id);
    if (!Number.isInteger(postId) || postId <= 0) return;
    const groupNames = explicitGroupNames;

    setBusy(true);
    const res = await toggleNetworkPostSave({ userId, postId, groupNames });
    setBusy(false);

    if (!res.success) {
      alert(res.error || 'Beitrag konnte nicht gespeichert werden.');
      return;
    }

    await loadAll(userId);
  };

  const openSaveGroupPicker = (postId: number) => {
    setSaveGroupPickerPostId(postId);
    const targetPost = feed.find((item) => item.id === postId);
    const existingNames = targetPost && Array.isArray(targetPost.save_group_names) ? targetPost.save_group_names : [];
    setSelectedSaveGroupsByPost((prev) => {
      if (Array.isArray(prev[postId])) return prev;
      return { ...prev, [postId]: existingNames };
    });
  };

  const toggleSaveGroupSelection = (postId: number, groupName: string) => {
    setSelectedSaveGroupsByPost((prev) => {
      const current = Array.isArray(prev[postId]) ? prev[postId] : [];
      const next = current.includes(groupName)
        ? current.filter((name) => name !== groupName)
        : [...current, groupName];
      return { ...prev, [postId]: next.slice(0, 12) };
    });
  };

  const confirmSaveWithGroups = async (post: FeedItem) => {
    const postId = Number(post.id);
    const selected = Array.isArray(selectedSaveGroupsByPost[postId]) ? selectedSaveGroupsByPost[postId] : [];
    const freeGroup = String(newSaveGroupByPost[postId] || '').trim();
    const groups = Array.from(new Set([...selected, ...(freeGroup ? [freeGroup] : [])])).slice(0, 12);
    await toggleSavePost(post, groups);
    setSaveGroupPickerPostId(null);
    setNewSaveGroupByPost((prev) => ({ ...prev, [postId]: '' }));
    setSelectedSaveGroupsByPost((prev) => ({ ...prev, [postId]: [] }));
  };

  const toggleLikePost = async (postId: number) => {
    if (!userId || busy) return;
    setBusy(true);
    const res = await toggleNetworkPostLike({ userId, postId });
    setBusy(false);

    if (!res.success) {
      alert(res.error || 'Beitrag konnte nicht geliket werden.');
      return;
    }

    await loadAll(userId);
  };

  const reportPost = async (postId: number, reason: string) => {
    if (!userId || busy) return;
    setBusy(true);
    const res = await reportNetworkPost({ userId, postId, reason });
    setBusy(false);

    if (!res.success) {
      alert(res.error || 'Beitrag konnte nicht gemeldet werden.');
      return;
    }

    alert('Beitrag wurde gemeldet. Danke für dein Feedback.');
    await loadAll(userId);
  };

  const sharePost = async (postId: number) => {
    if (!userId || busy) return;
    setBusy(true);
    const res = await shareNetworkPost({ userId, postId });
    setBusy(false);

    if (!res.success) {
      alert(res.error || 'Beitrag konnte nicht geteilt werden.');
      return;
    }

    await loadAll(userId);
  };

  const moderatePost = async (postId: number, decision: 'approved' | 'rejected', rejectionReason = '') => {
    if (!userId || busy) return;

    setBusy(true);
    const res = await moderateGroupPost({ postId, moderatorUserId: userId, decision, rejectionReason });
    setBusy(false);

    if (!res.success) {
      alert(res.error || 'Moderation fehlgeschlagen.');
      return;
    }

    await loadAll(userId);
  };

  const copyPostLink = async (postId: number) => {
    const post = feed.find((item) => Number(item.id) === Number(postId));
    const url = `${window.location.origin}/netzwerk#post-${postId}`;
    try {
      await navigator.clipboard.writeText(url);
      if (userId && post?.author_user_id) {
        await trackInteractionShare({
          sourceType: 'beitrag',
          sourceId: String(postId),
          ownerUserId: Number(post.author_user_id),
          sharedByUserId: userId,
          channel: 'link'
        });
      }
      alert('Link kopiert.');
    } catch {
      window.prompt('Link manuell kopieren:', url);
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-slate-50 p-10">
        <p className="text-sm font-black uppercase tracking-widest text-slate-400">Lade Netzwerk...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[85] transition-opacity ${reportDialogPostId !== null || rejectDialogPostId !== null || saveGroupPickerPostId !== null ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />
      {reportDialogPostId !== null && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Beitrag melden</h3>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={4}
              placeholder="Meldegrund (mindestens 5 Zeichen)"
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setReportDialogPostId(null); setReportReason(''); }}
                className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-300 text-slate-700"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={async () => {
                  const reason = reportReason.trim();
                  if (reason.length < 5) {
                    alert('Bitte einen Meldegrund mit mindestens 5 Zeichen eingeben.');
                    return;
                  }
                  const postId = reportDialogPostId;
                  setReportDialogPostId(null);
                  setReportReason('');
                  if (postId) await reportPost(postId, reason);
                }}
                className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-red-600 text-white"
              >
                Melden
              </button>
            </div>
          </div>
        </div>
      )}
      {rejectDialogPostId !== null && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Beitrag ablehnen</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="Ablehnungsgrund (Pflicht, mind. 5 Zeichen)"
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setRejectDialogPostId(null); setRejectReason(''); }}
                className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-300 text-slate-700"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={async () => {
                  const reason = rejectReason.trim();
                  if (reason.length < 5) {
                    alert('Bitte einen Ablehnungsgrund mit mindestens 5 Zeichen eingeben.');
                    return;
                  }
                  const postId = rejectDialogPostId;
                  setRejectDialogPostId(null);
                  setRejectReason('');
                  if (postId) await moderatePost(postId, 'rejected', reason);
                }}
                className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-slate-900 text-white"
              >
                Ablehnen
              </button>
            </div>
          </div>
        </div>
      )}
      {saveGroupPickerPostId !== null && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Beitrag in Gruppen speichern</h3>
            {saveGroups.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {saveGroups.map((group) => {
                  const selected = (selectedSaveGroupsByPost[saveGroupPickerPostId] || []).includes(group.name);
                  return (
                    <button
                      key={`save-group-modal-${group.id}`}
                      type="button"
                      onClick={() => toggleSaveGroupSelection(saveGroupPickerPostId, group.name)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase border ${selected ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                      {group.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Noch keine Speichergruppen vorhanden.</p>
            )}
            <input
              value={newSaveGroupByPost[saveGroupPickerPostId] || ''}
              onChange={(e) => setNewSaveGroupByPost((prev) => ({ ...prev, [saveGroupPickerPostId]: e.target.value }))}
              placeholder="Neue Gruppe (optional)"
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setSaveGroupPickerPostId(null)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-300 text-slate-700">Abbrechen</button>
              <button
                type="button"
                onClick={async () => {
                  const targetPost = feed.find((item) => item.id === saveGroupPickerPostId);
                  if (!targetPost) {
                    setSaveGroupPickerPostId(null);
                    return;
                  }
                  await confirmSaveWithGroups(targetPost);
                }}
                className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-slate-900 text-white"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
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
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/netzwerk/gespeichert'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Gespeichert</button>
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/merkliste'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Merkliste</button>
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/nachrichten'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Nachrichten</button>
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/einstellungen'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Einstellungen</button>
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/kontakt'; }} className="block text-left text-lg font-black italic uppercase text-emerald-600">Kontakt & FAQ</button>
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

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <section className="bg-white border border-slate-200 rounded-[2rem] p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Social</p>
          <h1 className="mt-2 text-3xl font-black italic uppercase tracking-tight text-slate-900">Netzwerk, Gruppen & Beiträge</h1>
          <p className="mt-2 text-sm text-slate-600">Nachrichten an fremde Personen sind nur nach angenommener Vernetzungsanfrage möglich.</p>
        </section>

        {loading ? (
          <section className="bg-white border border-slate-200 rounded-[2rem] p-8">
            <p className="text-sm font-black uppercase tracking-widest text-slate-400">Lade Netzwerkdaten...</p>
          </section>
        ) : (
          <>
            <section id="followers" className="grid grid-cols-1 xl:grid-cols-2 gap-6 scroll-mt-24">
              <div className="bg-white border border-slate-200 rounded-[2rem] p-6 space-y-4">
                <h2 className="text-lg font-black italic uppercase text-slate-900">Vernetzungsanfragen</h2>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Eingehend</p>
                  <div className="space-y-2">
                    {overview.incoming.length === 0 ? (
                      <p className="text-xs text-slate-500">Keine offenen Anfragen.</p>
                    ) : overview.incoming.map((req) => (
                      <div key={`in-${req.id}`} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{req.vorname} {req.nachname}</p>
                          <p className="text-[10px] font-black uppercase text-slate-400">{req.role}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => openPublicProfile(Number(req.requester_user_id))} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-emerald-200 text-emerald-700">Profil</button>
                          <button onClick={() => answerRequest(req.id, true)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-emerald-600 text-white">Annehmen</button>
                          <button onClick={() => answerRequest(req.id, false)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-300 text-slate-600">Ablehnen</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Ausgehend</p>
                  <div className="space-y-2">
                    {overview.outgoing.length === 0 ? (
                      <p className="text-xs text-slate-500">Keine offenen Anfragen.</p>
                    ) : overview.outgoing.map((req) => (
                      <div key={`out-${req.id}`} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{req.vorname} {req.nachname}</p>
                          <p className="text-[10px] font-black uppercase text-slate-400">Anfrage gesendet</p>
                        </div>
                        <button onClick={() => openPublicProfile(Number(req.addressee_user_id))} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-emerald-200 text-emerald-700">Profil</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div id="following" className="bg-white border border-slate-200 rounded-[2rem] p-6 space-y-4 scroll-mt-24">
                <div>
                  <h2 className="text-lg font-black italic uppercase text-slate-900">Verbindungen</h2>
                  <div className="mt-2 space-y-2 max-h-[220px] overflow-auto">
                    {overview.connections.length === 0 ? (
                      <p className="text-xs text-slate-500">Noch keine bestätigten Verbindungen.</p>
                    ) : overview.connections.map((entry) => (
                      <div key={`con-${entry.id}`} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{entry.vorname} {entry.nachname}</p>
                          <p className="text-[10px] font-black uppercase text-slate-400">{entry.role || 'Vernetzt'}</p>
                        </div>
                        <button onClick={() => openPublicProfile(Number(entry.partner_user_id))} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-emerald-200 text-emerald-700">Profil</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-black italic uppercase text-slate-900">Menschen entdecken (Vorschläge)</h2>
                  <Link
                    href="/suche"
                    className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  >
                    Zur Suche
                  </Link>
                </div>
                <p className="text-xs text-slate-500">Die Liste ist algorithmisch sortiert nach gemeinsamen Kategorien, Ort und Profilnähe.</p>
                <div className="space-y-2 max-h-[360px] overflow-auto">
                  {overview.discover.map((person) => {
                    const personId = Number(person.id);
                    const status = String(person.connection_status || 'none');
                    const isConnected = connectedPartnerIds.has(personId) || status === 'accepted';
                    const statusLabel = isConnected
                      ? 'Verbunden'
                      : status === 'pending'
                        ? (Number(person.requester_user_id) === userId ? 'Angefragt' : 'Hat angefragt')
                        : 'Nicht vernetzt';

                    return (
                      <div key={`dis-${person.id}`} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{person.display_name || `${person.vorname} ${person.nachname}`}</p>
                          <p className="text-[10px] font-black uppercase text-slate-400">{person.role} {person.ort ? `• ${person.ort}` : ''}</p>
                        </div>
                        {isConnected ? (
                          <div className="flex gap-2">
                            <button onClick={() => openPublicProfile(personId)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-emerald-200 text-emerald-700">Profil</button>
                            <span className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-emerald-50 text-emerald-700">{statusLabel}</span>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={() => openPublicProfile(personId)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-emerald-200 text-emerald-700">Profil</button>
                            <button onClick={() => requestConnect(personId)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-slate-900 text-white">Vernetzen</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-[2rem] p-6 space-y-4">
                <h2 className="text-lg font-black italic uppercase text-slate-900">Gruppe gründen</h2>
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Gruppenname"
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                />
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Kurzbeschreibung"
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-medium resize-none"
                />
                <button onClick={createGroup} className="px-4 py-3 rounded-xl text-[10px] font-black uppercase bg-emerald-600 text-white">Gruppe erstellen</button>
              </div>

              <div className="bg-white border border-slate-200 rounded-[2rem] p-6 space-y-4">
                <h2 className="text-lg font-black italic uppercase text-slate-900">Gruppen</h2>
                <div className="space-y-2 max-h-[250px] overflow-auto">
                  {groups.length === 0 ? (
                    <p className="text-xs text-slate-500">Noch keine Gruppen vorhanden.</p>
                  ) : groups.map((group) => (
                    <div key={`g-${group.id}`} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{group.name}</p>
                        <p className="text-[10px] font-black uppercase text-slate-400">{group.member_count} Mitglieder</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openGroup(group.id)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-emerald-200 text-emerald-700">Öffnen</button>
                        {group.is_member ? (
                          <span className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-emerald-50 text-emerald-700">Mitglied</span>
                        ) : (
                          <button onClick={() => joinGroup(group.id)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-slate-900 text-white">Beitreten</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-[2rem] p-6 space-y-4">
              <h2 className="text-lg font-black italic uppercase text-slate-900">Beiträge im Profil oder in Gruppen</h2>
              <p className="text-sm text-slate-500">
                Beiträge werden jetzt direkt im Profil oder in der jeweiligen Gruppe erstellt.
                Im Netzwerk findest du nur Feed, Gruppenübersicht und Moderation.
              </p>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={openProfile} className="px-4 py-3 rounded-xl text-[10px] font-black uppercase bg-slate-900 text-white">
                  Mein Profil öffnen
                </button>
                <Link href="/netzwerk" className="px-4 py-3 rounded-xl text-[10px] font-black uppercase border border-slate-200 text-slate-700">
                  Gruppen ansehen
                </Link>
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-[2rem] p-6 space-y-4">
              <h2 className="text-lg font-black italic uppercase text-slate-900">Moderation (Host)</h2>
              {moderationQueue.length === 0 ? (
                <p className="text-sm text-slate-500">Keine offenen Gruppenbeiträge zur Freigabe.</p>
              ) : (
                <div className="space-y-3">
                  {moderationQueue.map((item) => (
                    <article key={`mod-${item.id}`} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                      <p className="text-xs font-black uppercase text-emerald-700">{item.group_name}</p>
                      <p className="text-sm font-black uppercase text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500">
                        {item.vorname} {item.nachname} ({item.role})
                        {item.moderation_deadline ? ` • Frist bis ${new Date(item.moderation_deadline).toLocaleString('de-DE')}` : ''}
                      </p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{item.content}</p>
                      <div className="flex gap-2">
                        <button onClick={() => moderatePost(item.id, 'approved')} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-emerald-600 text-white">Freigeben</button>
                        <button onClick={() => moderatePost(item.id, 'rejected')} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-300 text-slate-700">Ablehnen</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-white border border-slate-200 rounded-[2rem] p-6 space-y-4">
              <h2 className="text-lg font-black italic uppercase text-slate-900">Feed</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  value={feedFilter}
                  onChange={(e) => setFeedFilter((e.target.value as 'all' | 'own' | 'group' | 'pending'))}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                >
                  <option value="all">Alle Beiträge</option>
                  <option value="own">Nur meine Beiträge</option>
                  <option value="group">Nur Gruppenbeiträge</option>
                  <option value="pending">Nur Pending (Moderation)</option>
                </select>
                <select
                  value={feedSort}
                  onChange={(e) => setFeedSort((e.target.value as 'newest' | 'mostComments' | 'mostSaved'))}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                >
                  <option value="newest">Neueste zuerst</option>
                  <option value="mostComments">Meiste Kommentare</option>
                  <option value="mostSaved">Meist gespeichert</option>
                </select>
              </div>
              <div className="space-y-3">
                {filteredFeed.length === 0 ? (
                  <p className="text-sm text-slate-500">Noch keine Beiträge vorhanden.</p>
                ) : filteredFeed.map((post) => (
                  <article id={`post-${post.id}`} key={`post-${post.id}`} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-black uppercase text-slate-900">{post.title}</p>
                        {post.moderation_status === 'pending' && (
                          <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-amber-100 text-amber-700">Wartet auf Freigabe</span>
                        )}
                        {post.moderation_status === 'rejected' && (
                          <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-red-100 text-red-700">Abgelehnt</span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                        <button onClick={() => openPublicProfile(Number(post.author_user_id))} className="text-emerald-700 hover:text-emerald-600 transition-colors">
                          {post.vorname} {post.nachname}
                        </button>
                        <span>•</span>
                        <span>{post.role}</span>
                        {post.group_name && post.group_id ? (
                          <>
                            <span>•</span>
                            <button onClick={() => openGroup(Number(post.group_id))} className="text-slate-600 hover:text-emerald-600 transition-colors">
                              Gruppe: {post.group_name}
                            </button>
                          </>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button onClick={() => openPublicProfile(Number(post.author_user_id))} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-emerald-200 text-emerald-700">Profil ansehen</button>
                        {post.group_id ? (
                          <button onClick={() => openGroup(Number(post.group_id))} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-300 text-slate-700">Gruppe ansehen</button>
                        ) : null}
                      </div>
                      {post.rejection_reason ? (
                        <p className="text-xs text-red-600 mt-2">Ablehnungsgrund: {post.rejection_reason}</p>
                      ) : null}
                      {post.shared_post_id ? (
                        <p className="text-xs text-slate-500 mt-2">
                          Geteilter Beitrag von {post.shared_author_vorname} {post.shared_author_nachname}: {post.shared_title}
                        </p>
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

                    {Array.isArray(post.media_items) && post.media_items.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {post.media_items.map((media, idx) => (
                          <div key={`${post.id}-m-${idx}`} className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                            {media.mediaType === 'video' ? (
                              <video controls className="w-full h-56 object-cover" src={media.url} />
                            ) : (
                              <img src={media.url} alt="Beitragsbild" className="w-full h-56 object-cover" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button onClick={() => copyPostLink(post.id)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-300 text-slate-700">Link</button>
                      <button onClick={() => sharePost(post.id)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-300 text-slate-700">Teilen</button>
                      <button onClick={() => toggleLikePost(post.id)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-300 text-slate-700">
                        {post.liked_by_viewer ? 'Geliked' : 'Liken'} ({post.like_count || 0})
                      </button>
                      <button onClick={() => post.saved_by_viewer ? toggleSavePost(post) : openSaveGroupPicker(post.id)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-300 text-slate-700">
                        {post.saved_by_viewer ? 'Gespeichert' : 'Speichern'} ({post.save_count || 0})
                      </button>
                      <button onClick={() => { setReportDialogPostId(post.id); setReportReason(''); }} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-red-200 text-red-600">Melden ({post.report_count || 0})</button>
                      {post.can_moderate && post.moderation_status === 'pending' && (
                        <>
                          <button onClick={() => moderatePost(post.id, 'approved')} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-emerald-600 text-white">Freigeben</button>
                          <button onClick={() => { setRejectDialogPostId(post.id); setRejectReason(''); }} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-300 text-slate-700">Ablehnen</button>
                        </>
                      )}
                    </div>

                    <div className="pt-1 space-y-2">
                      {Array.isArray(post.save_group_names) && post.save_group_names.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {post.save_group_names.map((groupName) => (
                            <span key={`${post.id}-save-group-${groupName}`} className="px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-slate-200 text-slate-700">{groupName}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          value={commentInputs[post.id] || ''}
                          onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                          placeholder="Kommentar schreiben"
                          className="flex-1 p-3 rounded-xl border border-slate-200 bg-white text-sm"
                        />
                        <button onClick={() => submitComment(post.id)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-slate-900 text-white">Kommentieren</button>
                        <button onClick={() => loadComments(post.id)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-300 text-slate-700">
                          Kommentare ({post.comment_count || 0})
                        </button>
                      </div>
                      {Array.isArray(commentsByPost[post.id]) && commentsByPost[post.id].length > 0 && (
                        <div className="space-y-2">
                          {commentsByPost[post.id].map((comment) => (
                            <div key={`c-${comment.id}`} className="p-3 rounded-xl border border-slate-200 bg-white">
                              <p className="text-[10px] font-black uppercase text-slate-500">{comment.vorname} {comment.nachname}</p>
                              <p className="text-sm text-slate-700 mt-1">{comment.comment_text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-[2rem] p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black italic uppercase text-slate-900">Gespeichert</h2>
                <Link href="/netzwerk/gespeichert" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-300 text-slate-700">Alle anzeigen</Link>
              </div>
              {savedFeed.length === 0 ? (
                <p className="text-sm text-slate-500">Du hast noch keine Beiträge gespeichert.</p>
              ) : (
                <div className="space-y-2">
                  {savedFeed.map((post) => (
                    <div key={`saved-${post.id}`} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black uppercase text-slate-900">{post.title}</p>
                        <div className="text-[10px] font-black uppercase text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                          <button onClick={() => openPublicProfile(Number(post.author_user_id))} className="text-emerald-700 hover:text-emerald-600 transition-colors">
                            {post.vorname} {post.nachname}
                          </button>
                          {post.group_name && post.group_id ? (
                            <>
                              <span>•</span>
                              <button onClick={() => openGroup(Number(post.group_id))} className="text-slate-600 hover:text-emerald-600 transition-colors">
                                {post.group_name}
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openPublicProfile(Number(post.author_user_id))} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-emerald-200 text-emerald-700">Profil</button>
                        {post.group_id ? <button onClick={() => openGroup(Number(post.group_id))} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-300 text-slate-700">Gruppe</button> : null}
                        <button onClick={() => copyPostLink(post.id)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-300 text-slate-700">Zum Beitrag</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
