"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  addNetworkPostComment,
  createNetworkPost,
  getResolvedUserRole,
  getGroupModerationQueue,
  getNetworkFeed,
  getNetworkGroups,
  getNetworkPostComments,
  joinNetworkGroup,
  reportNetworkPost,
  toggleNetworkPostLike,
  toggleNetworkPostSave,
  uploadNetworkMedia
} from '../../../actions';
import LoggedInHeader from '../../../components/logged-in-header';
import MediaDropzone from '../../../components/media-dropzone';

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
  moderation_status: 'pending' | 'approved' | 'rejected';
  comment_count: number;
  save_count: number;
  like_count: number;
  liked_by_viewer: boolean;
  saved_by_viewer: boolean;
  save_group_names?: string[];
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
  group_id?: number;
  vorname: string;
  nachname: string;
  role: string;
};

type UploadedMedia = {
  url: string;
  mediaType: 'image' | 'video';
};

export default function GroupDetailPage() {
  const params = useParams<{ groupId: string }>();
  const groupId = Number(params.groupId);

  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState('Profil');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [group, setGroup] = useState<GroupItem | null>(null);
  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [moderationQueue, setModerationQueue] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postHashtags, setPostHashtags] = useState('');
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);
  const [commentsByPost, setCommentsByPost] = useState<Record<number, CommentItem[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});
  const [reportDialogPostId, setReportDialogPostId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportError, setReportError] = useState('');
  const [reportBusy, setReportBusy] = useState(false);

  const openPublicProfile = (targetUserId: number) => {
    const safeId = Number(targetUserId);
    if (!Number.isInteger(safeId) || safeId <= 0) return;
    window.location.href = `/profil/${safeId}`;
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

  useEffect(() => {
    const roleRaw = sessionStorage.getItem('userRole');
    setRole(roleRaw);
    setUserName(sessionStorage.getItem('userName') || (roleRaw === 'experte' ? 'Experte' : 'Nutzer'));

    const userIdRaw = sessionStorage.getItem('userId');
    const parsedUserId = userIdRaw ? parseInt(userIdRaw, 10) : NaN;
    if (Number.isNaN(parsedUserId) || parsedUserId <= 0) {
      window.location.href = '/login';
      return;
    }

    setUserId(parsedUserId);

    getResolvedUserRole(parsedUserId).then((roleRes) => {
      if (roleRes.success && roleRes.role) {
        setRole(roleRes.role);
        sessionStorage.setItem('userRole', roleRes.role);
      }
    }).catch(() => {
      // Keep the session role when resolving fails.
    });
  }, []);

  const loadGroupData = async (viewerId: number) => {
    setLoading(true);
    const [groupsRes, feedRes, moderationRes] = await Promise.all([
      getNetworkGroups(viewerId),
      getNetworkFeed(viewerId, 80),
      getGroupModerationQueue(viewerId)
    ]);

    if (groupsRes.success) {
      const foundGroup = ((groupsRes.groups || []) as GroupItem[]).find((item) => Number(item.id) === groupId) || null;
      setGroup(foundGroup);
    }

    if (feedRes.success) {
      const filteredPosts = ((feedRes.posts || []) as FeedItem[])
        .filter((post) => Number(post.group_id) === groupId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setPosts(filteredPosts);
    }

    if (moderationRes.success) {
      const filteredQueue = ((moderationRes.items || []) as ModerationItem[]).filter((item) => Number(item.group_id) === groupId || item.group_name === group?.name);
      setModerationQueue(filteredQueue);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!userId || !Number.isInteger(groupId) || groupId <= 0) return;
    loadGroupData(userId);
  }, [userId, groupId]);

  const isOwner = useMemo(() => posts.some((post) => post.can_moderate), [posts]);

  const handleJoinGroup = async () => {
    if (!userId || !group || busy) return;
    setBusy(true);
    const res = await joinNetworkGroup({ groupId: group.id, userId });
    setBusy(false);
    if (!res.success) {
      alert(res.error || 'Beitritt fehlgeschlagen.');
      return;
    }
    await loadGroupData(userId);
  };

  const handleMediaUpload = async (files: File[]) => {
    if (!userId || files.length === 0) return;

    setBusy(true);
    const uploaded: UploadedMedia[] = [];

    for (const file of files.slice(0, 6)) {
      const formData = new FormData();
      formData.append('file', file);
      const res = await uploadNetworkMedia(userId, formData);
      if (res.success && res.url) {
        uploaded.push({
          url: String(res.url),
          mediaType: res.mediaType === 'video' ? 'video' : 'image'
        });
      }
    }

    setUploadedMedia((prev) => [...prev, ...uploaded].slice(0, 8));
    setBusy(false);
  };

  const handleCreateGroupPost = async () => {
    if (!userId || !group || !group.is_member || busy) return;

    setBusy(true);
    const res = await createNetworkPost({
      userId,
      title: postTitle,
      content: postContent,
      hashtags: postHashtags,
      mediaItems: uploadedMedia,
      groupId: group.id,
      postTarget: 'group'
    });
    setBusy(false);

    if (!res.success) {
      alert(res.error || 'Gruppenbeitrag konnte nicht erstellt werden.');
      return;
    }

    setPostTitle('');
    setPostContent('');
    setPostHashtags('');
    setUploadedMedia([]);
    await loadGroupData(userId);
    alert('Gruppenbeitrag wurde zur Freigabe eingereicht.');
  };

  const openReportDialog = (postId: number) => {
    setReportDialogPostId(postId);
    setReportReason('');
    setReportError('');
  };

  const confirmReport = async () => {
    if (!userId || reportDialogPostId === null || reportBusy) return;
    const reason = reportReason.trim();
    if (reason.length < 5) {
      setReportError('Bitte einen Grund mit mindestens 5 Zeichen angeben.');
      return;
    }

    setReportBusy(true);
    const res = await reportNetworkPost({ userId, postId: reportDialogPostId, reason });
    setReportBusy(false);
    if (!res.success) {
      setReportError(res.error || 'Meldung konnte nicht übermittelt werden.');
      return;
    }

    setReportDialogPostId(null);
    setReportReason('');
    setReportError('');
    alert('Beitrag wurde gemeldet. Danke für dein Feedback.');
  };

  const toggleLikePost = async (postId: number) => {
    if (!userId || busy) return;
    setBusy(true);
    const res = await toggleNetworkPostLike({ userId, postId });
    setBusy(false);
    if (!res.success) {
      alert(res.error || 'Like fehlgeschlagen.');
      return;
    }
    await loadGroupData(userId);
  };

  const toggleSavePost = async (postId: number) => {
    if (!userId || busy) return;
    setBusy(true);
    const res = await toggleNetworkPostSave({ userId, postId });
    setBusy(false);
    if (!res.success) {
      alert(res.error || 'Speichern fehlgeschlagen.');
      return;
    }
    await loadGroupData(userId);
  };

  const loadComments = async (postId: number) => {
    if (!userId) return;
    const res = await getNetworkPostComments({ userId, postId, limit: 40 });
    if (!res.success) return;
    setCommentsByPost((prev) => ({ ...prev, [postId]: (res.items || []) as CommentItem[] }));
  };

  const submitComment = async (postId: number) => {
    if (!userId || busy) return;
    const comment = String(commentInputs[postId] || '').trim();
    if (comment.length < 2) {
      alert('Kommentar ist zu kurz.');
      return;
    }
    setBusy(true);
    const res = await addNetworkPostComment({ userId, postId, comment });
    setBusy(false);
    if (!res.success) {
      alert(res.error || 'Kommentar fehlgeschlagen.');
      return;
    }
    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    await Promise.all([loadGroupData(userId), loadComments(postId)]);
  };

  const normalizedRole = String(role || '').trim().toLowerCase();
  const isExpertRole = normalizedRole === 'experte';

  if (!Number.isInteger(groupId) || groupId <= 0) {
    return <div className="min-h-screen bg-slate-50 p-10 text-sm font-black uppercase tracking-widest text-slate-400">Ungültige Gruppen-ID.</div>;
  }

  if (!userId || loading) {
    return <div className="min-h-screen bg-slate-50 p-10 text-sm font-black uppercase tracking-widest text-slate-400">Lade Gruppe...</div>;
  }

  if (!group) {
    return <div className="min-h-screen bg-slate-50 p-10 text-sm font-black uppercase tracking-widest text-slate-400">Gruppe nicht gefunden.</div>;
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
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/netzwerk/gespeichert'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Gespeichert</button>
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
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2rem] p-6 space-y-4">
            <h2 className="text-lg font-black italic uppercase text-slate-900">In dieser Gruppe posten</h2>
            <p className="text-sm text-slate-500">Gruppenbeiträge können hier direkt erstellt werden. Der Host hat je nach Abo bis zu 72 Stunden zur Freigabe, danach wird der Beitrag automatisch veröffentlicht.</p>
            {!group.is_member && (
              <p className="text-xs font-bold text-slate-500">Zum Posten musst du zuerst Mitglied dieser Gruppe werden.</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={postTitle} onChange={(e) => setPostTitle(e.target.value)} disabled={!group.is_member} placeholder="Titel" className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold disabled:opacity-60" />
              <input value={postHashtags} onChange={(e) => setPostHashtags(e.target.value)} disabled={!group.is_member} placeholder="#gruppe #austausch" className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold disabled:opacity-60" />
            </div>
            <textarea value={postContent} onChange={(e) => setPostContent(e.target.value)} disabled={!group.is_member} rows={5} placeholder="Was möchtest du in der Gruppe teilen?" className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 font-medium resize-none disabled:opacity-60" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
              <MediaDropzone
                title="Bilder oder Videos"
                description="Ziehe Dateien in das Feld oder klicke zum Auswählen."
                accept="image/*,video/*"
                multiple
                disabled={!group.is_member || busy}
                buttonLabel={busy ? 'Lädt...' : 'Dateien auswählen'}
                busyLabel="Lädt..."
                onFiles={handleMediaUpload}
              />
              <button onClick={handleCreateGroupPost} disabled={!group.is_member || busy} className="px-5 py-3 rounded-xl text-[10px] font-black uppercase bg-emerald-600 text-white disabled:opacity-60">Zur Freigabe senden</button>
            </div>
            {uploadedMedia.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {uploadedMedia.map((item, index) => (
                  <span key={`${item.url}-${index}`} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-slate-100 text-slate-600">{item.mediaType === 'video' ? 'Video' : 'Bild'} {index + 1}</span>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-[2rem] p-6 space-y-4">
            <h2 className="text-lg font-black italic uppercase text-slate-900">Übersicht</h2>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mitglieder</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{group.member_count}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sichtbare Gruppenbeiträge</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{posts.length}</p>
            </div>
            {isOwner && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Freigaben offen</p>
                <p className="mt-2 text-2xl font-black text-amber-900">{moderationQueue.length}</p>
              </div>
            )}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-6 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-lg font-black italic uppercase text-slate-900">Gruppenfeed</h2>
            <p className="text-xs text-slate-500">Nur freigegebene Gruppenbeiträge und deine eigenen Einreichungen sind sichtbar.</p>
          </div>
          {posts.length === 0 ? (
            <p className="text-sm text-slate-500">Noch keine sichtbaren Beiträge in dieser Gruppe.</p>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <article key={`group-post-${post.id}`} className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-black uppercase italic text-slate-900">{post.title}</p>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                        <button onClick={() => openPublicProfile(Number(post.author_user_id))} className="text-emerald-700 hover:text-emerald-600 transition-colors">{post.vorname} {post.nachname}</button>
                        <span>•</span>
                        <span>{post.role}</span>
                        <span>•</span>
                        <span>{new Date(post.created_at).toLocaleString('de-DE')}</span>
                      </div>
                      <button onClick={() => openPublicProfile(Number(post.author_user_id))} className="mt-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-emerald-200 text-emerald-700">Profil ansehen</button>
                    </div>
                    {post.moderation_status === 'pending' && (
                      <span className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">In Freigabe</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{post.content}</p>
                  {Array.isArray(post.hashtags) && post.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {post.hashtags.map((tag) => (
                        <span key={`${post.id}-${tag}`} className="px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-white border border-slate-200 text-slate-500">#{tag}</span>
                      ))}
                    </div>
                  )}
                  {Array.isArray(post.media_items) && post.media_items.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {post.media_items.map((item, index) => (
                        item.mediaType === 'video' ? (
                          <video key={`${post.id}-media-${index}`} src={item.url} controls className="w-full h-52 object-cover rounded-2xl bg-slate-900" />
                        ) : (
                          <img key={`${post.id}-media-${index}`} src={item.url} alt="Beitragsmedium" className="w-full h-52 object-cover rounded-2xl" />
                        )
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button type="button" onClick={() => toggleLikePost(post.id)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-300 text-slate-700">
                      {post.liked_by_viewer ? 'Geliked' : 'Liken'} ({post.like_count || 0})
                    </button>
                    <button type="button" onClick={() => toggleSavePost(post.id)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-300 text-slate-700">
                      {post.saved_by_viewer ? 'Gespeichert' : 'Speichern'} ({post.save_count || 0})
                    </button>
                    <button type="button" onClick={() => openReportDialog(post.id)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-red-200 text-red-700 bg-red-50">
                      Melden
                    </button>
                    <button type="button" onClick={() => loadComments(post.id)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-300 text-slate-700">
                      Kommentare ({post.comment_count || 0})
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        value={commentInputs[post.id] || ''}
                        onChange={(event) => setCommentInputs((prev) => ({ ...prev, [post.id]: event.target.value }))}
                        placeholder="Kommentar schreiben"
                        className="flex-1 p-3 rounded-xl border border-slate-200 bg-white text-sm"
                      />
                      <button type="button" onClick={() => submitComment(post.id)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-slate-900 text-white">Senden</button>
                    </div>
                    {Array.isArray(commentsByPost[post.id]) && commentsByPost[post.id].length > 0 && (
                      <div className="space-y-2">
                        {commentsByPost[post.id].map((comment) => (
                          <div key={`${post.id}-comment-${comment.id}`} className="p-3 rounded-xl border border-slate-200 bg-white">
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
          )}
        </section>

        {reportDialogPostId !== null && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <button type="button" aria-label="Dialog schließen" onClick={() => setReportDialogPostId(null)} className="absolute inset-0 bg-slate-900/40" />
            <div className="relative w-full max-w-lg bg-white rounded-[2rem] border border-slate-200 shadow-2xl p-6 space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Melden</p>
                <h3 className="mt-2 text-xl font-black italic uppercase text-slate-900">Beitrag melden</h3>
              </div>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                rows={4}
                placeholder="Grund angeben (mindestens 5 Zeichen)"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
              />
              {reportError && <p className="text-sm font-bold text-red-600">{reportError}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setReportDialogPostId(null)} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-200 text-slate-600">
                  Abbrechen
                </button>
                <button type="button" onClick={confirmReport} disabled={reportBusy} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-red-600 text-white disabled:opacity-60">
                  {reportBusy ? 'Sende...' : 'Melden'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}