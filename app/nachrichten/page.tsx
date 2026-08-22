"use client";

import React, { useState, useEffect } from 'react';
import { Search, Send, Heart, Archive, Flag, Filter } from 'lucide-react';
import { createOrGetConnectedChat, getChatMessages, getResolvedUserRole, holeMeineChats, reportChatConversation, sendeNachricht, sendConnectionRequest } from '../actions';
import LoggedInHeader from '../components/logged-in-header';
import { canUseOptionalStorage } from '../lib/storage-consent';

interface Nachricht {
  id: string;
  senderId: number;
  text: string;
  zeitstempel: string;
  gelesen: boolean;
}

interface Chat {
  id: string;
  partnerId: number | null;
  partnerName: string;
  typ: 'person' | 'anzeige';
  letzteNachricht: string;
  zeit: string;
  online: boolean;
  ungelesen: number;
  favorit: boolean;
  archiviert: boolean;
  gemeldet: boolean;
  meldeGrund?: string;
  verlauf: Nachricht[];
}

const CHAT_META_STORAGE_PREFIX = 'chatMeta';

export default function NachrichtenPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [messageInput, setMessageInput] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [quickTarget, setQuickTarget] = useState("");
  const [quickTargetUserId, setQuickTargetUserId] = useState<number | null>(null);
  const [composeBusy, setComposeBusy] = useState(false);
  const [composeError, setComposeError] = useState('');
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [chatSearch, setChatSearch] = useState('');
  const [filterKey, setFilterKey] = useState<'alle' | 'person' | 'anzeige' | 'favorit' | 'archiviert'>('alle');
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSeverity, setReportSeverity] = useState<'normal' | 'strong' | 'animal_abuse'>('normal');
  const [reportError, setReportError] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState('Profil');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [canCloseSidebar, setCanCloseSidebar] = useState(false);

  const loadChatMessages = async (chat: Chat, uid: number) => {
    if (chat.id === 'temp-chat') {
      setActiveChat(chat);
      return chat;
    }

    const chatId = parseInt(chat.id, 10);
    if (Number.isNaN(chatId) || chatId <= 0) {
      setActiveChat(chat);
      return chat;
    }

    const res = await getChatMessages({ chatId, userId: uid });
    const verlauf = res.success && Array.isArray(res.messages) ? res.messages : [];
    const enrichedChat = {
      ...chat,
      verlauf,
      letzteNachricht: verlauf.length > 0 ? verlauf[verlauf.length - 1].text : chat.letzteNachricht,
      zeit: verlauf.length > 0 ? verlauf[verlauf.length - 1].zeitstempel : chat.zeit,
    };

    setActiveChat(enrichedChat);
    setChats((prev) => prev.map((item) => (item.id === enrichedChat.id ? enrichedChat : item)));
    return enrichedChat;
  };

  const refreshChats = async (uid: number, preferredPartnerId?: number | null) => {
    const dbChatsRes = await holeMeineChats(uid);
    const dbChats = dbChatsRes.success && Array.isArray(dbChatsRes.chats) ? dbChatsRes.chats : [];

    let storedMeta: Record<string, Partial<Pick<Chat, 'typ' | 'favorit' | 'archiviert' | 'gemeldet' | 'meldeGrund'>>> = {};
    if (canUseOptionalStorage()) {
      try {
        const raw = localStorage.getItem(`${CHAT_META_STORAGE_PREFIX}-${uid}`);
        if (raw) storedMeta = JSON.parse(raw);
      } catch {
        // Ignoriere ungültige Browserdaten.
      }
    }

    const mapped: Chat[] = dbChats.map((db: any) => {
      const chatId = db.chat_id?.toString();
      const chatTyp: Chat['typ'] = storedMeta[chatId]?.typ === 'anzeige' ? 'anzeige' : 'person';

      return {
        id: chatId,
        partnerId: Number(db.partner_id) || null,
        partnerName: db.partner_name,
        typ: chatTyp,
        letzteNachricht: db.letzte_nachricht || 'Noch keine Nachrichten',
        zeit: db.zeit ? new Date(db.zeit).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        online: false,
        ungelesen: 0,
        favorit: Boolean(storedMeta[chatId]?.favorit),
        archiviert: Boolean(storedMeta[chatId]?.archiviert),
        gemeldet: Boolean(storedMeta[chatId]?.gemeldet),
        meldeGrund: storedMeta[chatId]?.meldeGrund || '',
        verlauf: []
      };
    });

    setChats(mapped);

    const nextActive = preferredPartnerId
      ? mapped.find((chat) => chat.partnerId === preferredPartnerId) || null
      : activeChat && mapped.some((chat) => chat.id === activeChat.id)
        ? mapped.find((chat) => chat.id === activeChat.id) || null
        : mapped[0] || null;

    if (nextActive) {
      await loadChatMessages(nextActive, uid);
      setMobileView('chat');
    } else {
      setActiveChat(null);
      setMobileView('list');
    }

    setIsLoadingChats(false);
  };

  // 1. Daten beim Laden abrufen
  useEffect(() => {
    const roleRaw = sessionStorage.getItem('userRole');
    setRole(roleRaw);
    setUserName(sessionStorage.getItem('userName') || (roleRaw === 'experte' ? 'Experte' : 'Nutzer'));

    const storedId = sessionStorage.getItem('userId');
    if (storedId) {
      const uid = parseInt(storedId);
      setUserId(uid);

      if (!Number.isNaN(uid) && uid > 0) {
        getResolvedUserRole(uid).then((roleRes) => {
          if (roleRes.success && roleRes.role) {
            setRole(roleRes.role);
            sessionStorage.setItem('userRole', roleRes.role);
          }
        }).catch(() => {
          // Keep the session role when resolving fails.
        });
      }

      void refreshChats(uid, quickTargetUserId || null);
    } else {
      setIsLoadingChats(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const target = String(params.get('target') || '').trim();
    const targetType = params.get('targetType') === 'anzeige' ? 'anzeige' : 'person';
    const targetUserIdRaw = parseInt(params.get('targetUserId') || '', 10);
    if (!target) return;

    setQuickTarget(target);
    setQuickTargetUserId(Number.isNaN(targetUserIdRaw) ? null : targetUserIdRaw);
    setMessageInput(`Hallo ${target}, `);

    const tempChat: Chat = {
      id: 'temp-chat',
      partnerId: Number.isNaN(targetUserIdRaw) ? null : targetUserIdRaw,
      partnerName: target,
      typ: targetType,
      letzteNachricht: 'Noch keine Nachrichten',
      zeit: '',
      online: false,
      ungelesen: 0,
      favorit: false,
      archiviert: false,
      gemeldet: false,
      verlauf: []
    };

    setChats((prev) => (prev.length === 0 ? [tempChat] : prev));
    setActiveChat((prev) => prev || tempChat);
    setMobileView('chat');
  }, []);

  useEffect(() => {
    if (!userId || chats.length === 0) return;
    if (!canUseOptionalStorage()) return;
    const snapshot = chats.reduce<Record<string, Pick<Chat, 'typ' | 'favorit' | 'archiviert' | 'gemeldet' | 'meldeGrund'>>>((acc, chat) => {
      acc[chat.id] = {
        typ: chat.typ,
        favorit: chat.favorit,
        archiviert: chat.archiviert,
        gemeldet: chat.gemeldet,
        meldeGrund: chat.meldeGrund || ''
      };
      return acc;
    }, {});
    localStorage.setItem(`${CHAT_META_STORAGE_PREFIX}-${userId}`, JSON.stringify(snapshot));
  }, [chats, userId]);

  const updateChat = (chatId: string, updater: (chat: Chat) => Chat) => {
    setChats((prev) => {
      const next = prev.map((chat) => (chat.id === chatId ? updater(chat) : chat));
      setActiveChat((current) => {
        if (!current) return current;
        return next.find((chat) => chat.id === current.id) || null;
      });
      return next;
    });
  };

  const toggleFavorit = (chatId: string) => {
    updateChat(chatId, (chat) => ({ ...chat, favorit: !chat.favorit }));
  };

  const toggleArchiv = (chatId: string) => {
    updateChat(chatId, (chat) => ({ ...chat, archiviert: !chat.archiviert }));
  };

  const openReportDialog = () => {
    setReportDialogOpen(true);
    setReportReason('');
    setReportSeverity('normal');
    setReportError('');
  };

  const confirmReport = async () => {
    if (!activeChat) return;
    if (!userId) return;

    const normalizedReason = reportReason.trim();
    if (normalizedReason.length < 5) {
      setReportError('Bitte einen Grund mit mindestens 5 Zeichen angeben.');
      return;
    }

    const chatId = parseInt(activeChat.id, 10);
    if (Number.isNaN(chatId) || !activeChat.partnerId) {
      setReportError('Für diesen Chat ist aktuell keine Meldung möglich.');
      return;
    }

    const res = await reportChatConversation({
      chatId,
      reporterUserId: userId,
      reportedUserId: activeChat.partnerId,
      reason: normalizedReason,
      severity: reportSeverity
    });

    if (!res.success) {
      setReportError(res.error || 'Meldung konnte nicht übermittelt werden.');
      return;
    }

    updateChat(activeChat.id, (chat) => ({ ...chat, gemeldet: true, meldeGrund: normalizedReason }));
    setReportDialogOpen(false);
    setReportReason('');
    setReportSeverity('normal');
    setReportError('');

    if (reportSeverity === 'animal_abuse') {
      alert('Tierwohl-Fall eröffnet. Auf der Startseite läuft jetzt die Abstimmung.');
      return;
    }
    alert('Meldung verarbeitet. No-Tolerance-Regeln wurden angewendet.');
  };

  const normalizedRole = (role || '').trim().toLowerCase();
  const isExpertRole = normalizedRole === 'experte';

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

  const filteredChats = chats.filter((chat) => {
    const q = chatSearch.trim().toLowerCase();
    const passtSuche = !q || `${chat.partnerName} ${chat.letzteNachricht}`.toLowerCase().includes(q);

    if (filterKey === 'archiviert') return chat.archiviert && passtSuche;
    if (filterKey === 'favorit') return chat.favorit && !chat.archiviert && passtSuche;

    if (chat.archiviert) return false;
    if (filterKey === 'person') return chat.typ === 'person' && passtSuche;
    if (filterKey === 'anzeige') return chat.typ === 'anzeige' && passtSuche;

    return passtSuche;
  });

  useEffect(() => {
    if (!activeChat && filteredChats.length > 0) {
      setActiveChat(filteredChats[0]);
      return;
    }

    if (activeChat && !filteredChats.some((chat) => chat.id === activeChat.id)) {
      setActiveChat(filteredChats[0] || null);
    }
  }, [filteredChats, activeChat]);

  // 2. Nachricht absenden
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChat || !userId) return;
    const currentChat = activeChat;

    if (currentChat.id === 'temp-chat') {
      if (!quickTargetUserId) {
        alert('Für diesen Kontakt fehlt eine eindeutige Nutzer-ID. Starte den Chat direkt über die Suche.');
        return;
      }

      const chatRes = await createOrGetConnectedChat({ requesterId: userId, targetUserId: quickTargetUserId });
      if (!chatRes.success || chatRes.chatId === null || chatRes.chatId === undefined) {
        alert(chatRes.error || 'Vor dem Schreiben muss eine Vernetzungsanfrage angenommen werden.');
        return;
      }

      const firstSendRes = await sendeNachricht(Number(chatRes.chatId), userId, messageInput);
      if (!firstSendRes.success) {
        alert(firstSendRes.error || 'Nachricht konnte nicht gesendet werden.');
        return;
      }

      const neueNachricht: Nachricht = {
        id: "m" + Date.now(),
        senderId: userId,
        text: messageInput,
        zeitstempel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        gelesen: false
      };

      const replacedChat: Chat = {
        ...currentChat,
        id: String(chatRes.chatId),
        partnerId: quickTargetUserId,
        verlauf: [neueNachricht],
        letzteNachricht: messageInput,
        zeit: neueNachricht.zeitstempel
      };

      setChats((prev) => {
        const withoutTemp = prev.filter((c) => c.id !== 'temp-chat' && c.id !== String(chatRes.chatId));
        return [replacedChat, ...withoutTemp];
      });
      setActiveChat(replacedChat);
      setMobileView('chat');
      setMessageInput('');
      void refreshChats(userId, quickTargetUserId || null);
      return;
    }

    const res = await sendeNachricht(parseInt(currentChat.id), userId, messageInput);
    
    if (res.success) {
      const neueNachricht: Nachricht = {
        id: "m" + Date.now(),
        senderId: userId,
        text: messageInput,
        zeitstempel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        gelesen: false
      };

      const updatedChat = {
        ...currentChat,
        verlauf: [...currentChat.verlauf, neueNachricht],
        letzteNachricht: messageInput,
        zeit: neueNachricht.zeitstempel
      };

      setChats(prev => prev.map(c => c.id === currentChat.id ? updatedChat : c));
      setActiveChat(updatedChat);
      setMessageInput("");
      void refreshChats(userId, currentChat.partnerId || null);
    } else {
      alert(res.error || 'Nachricht konnte nicht gesendet werden.');
    }
  };

  const handleStartConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const recipientId = Number(quickTargetUserId || activeChat?.partnerId || 0);
    const messageText = messageInput.trim();
    const recipientName = quickTarget.trim() || activeChat?.partnerName || (Number.isInteger(recipientId) && recipientId > 0 ? `Nutzer ${recipientId}` : '');

    if (!Number.isInteger(recipientId) || recipientId <= 0) {
      setComposeError('Bitte öffne eine Anzeige oder ein Profil und klicke dort auf Nachricht.');
      return;
    }

    if (!messageText) {
      setComposeError('Bitte eine Nachricht eingeben.');
      return;
    }

    setComposeBusy(true);
    setComposeError('');

    const chatRes = await createOrGetConnectedChat({ requesterId: userId, targetUserId: recipientId });
    if (!chatRes.success || chatRes.chatId === null || chatRes.chatId === undefined) {
      setComposeBusy(false);
      setComposeError(chatRes.error || 'Chat konnte nicht erstellt werden.');
      return;
    }

    const sendRes = await sendeNachricht(Number(chatRes.chatId), userId, messageText);
    setComposeBusy(false);

    if (!sendRes.success) {
      setComposeError(sendRes.error || 'Nachricht konnte nicht gesendet werden.');
      return;
    }

    setMessageInput('');
    setMobileView('chat');

    const startChat: Chat = {
      id: String(chatRes.chatId),
      partnerId: recipientId,
      partnerName: recipientName,
      typ: 'person',
      letzteNachricht: messageText,
      zeit: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      online: false,
      ungelesen: 0,
      favorit: false,
      archiviert: false,
      gemeldet: false,
      verlauf: [],
    };

    setChats((prev) => {
      const withoutDuplicate = prev.filter((chat) => chat.id !== startChat.id && chat.id !== 'temp-chat');
      return [startChat, ...withoutDuplicate];
    });

    await refreshChats(userId, recipientId);
  };

  const requestConnectionForQuickTarget = async () => {
    if (!userId || !quickTargetUserId) {
      alert('Keine eindeutige Zielperson für Vernetzung gefunden.');
      return;
    }

    const res = await sendConnectionRequest({ requesterId: userId, targetUserId: quickTargetUserId });
    if (!res.success) {
      alert(res.error || 'Vernetzungsanfrage fehlgeschlagen.');
      return;
    }

    if (res.status === 'accepted') {
      alert('Ihr seid jetzt vernetzt. Du kannst direkt schreiben.');
      return;
    }

    alert('Vernetzungsanfrage gesendet. Nachrichten sind möglich, sobald die Anfrage angenommen wurde.');
  };

  if (isLoadingChats) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-400 font-black uppercase tracking-widest animate-pulse">Lade Chats...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 overflow-hidden">
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
          <button type="button" onClick={() => { closeSidebar(); openProfile(); }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Mein Profil</button>

          <button type="button" onClick={() => { closeSidebar(); window.location.href = '/netzwerk'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Netzwerk</button>
          <button type="button" onClick={() => { closeSidebar(); window.location.href = '/merkliste'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Merkliste</button>
          <button type="button" onClick={() => { closeSidebar(); window.location.href = '/nachrichten'; }} className="block text-left text-lg font-black italic uppercase text-emerald-600">Nachrichten</button>
          <button type="button" onClick={() => { closeSidebar(); window.location.href = '/einstellungen'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Einstellungen</button>
          <button type="button" onClick={() => { closeSidebar(); window.location.href = '/kontakt'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Kontakt & FAQ</button>
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

      <div className="flex h-[calc(100vh-80px)] overflow-hidden">
      
      {/* LINKE SEITE: CHAT-LISTE */}
      <aside className="w-full md:w-96 bg-white border-r border-slate-100 flex flex-col">
        <div className="p-6 border-b border-slate-50">
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic mb-4">Nachrichten</h1>
          <form onSubmit={handleStartConversation} className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 space-y-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Neue Nachricht</p>
              <p className="text-xs text-emerald-900/70 font-medium mt-1">Empfänger wird automatisch aus dem gewählten Profil/der Anzeige übernommen.</p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <div className="w-full px-3 py-2 rounded-xl border border-emerald-200 bg-white text-xs font-black uppercase tracking-widest text-emerald-700">
                Empfänger: {quickTarget || activeChat?.partnerName || 'Nicht gesetzt'}
              </div>
              <textarea
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Nachricht schreiben..."
                rows={4}
                className="w-full px-3 py-2 rounded-xl border border-emerald-200 bg-white text-sm outline-none focus:border-emerald-400 resize-none"
              />
            </div>
            {composeError && <p className="text-[11px] font-bold text-red-600">{composeError}</p>}
            <button
              type="submit"
              disabled={composeBusy}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
            >
              <Send size={14} />
              {composeBusy ? 'Sende...' : 'Senden'}
            </button>
          </form>
          <div className="flex items-center gap-2 mb-4">
            <Filter size={14} className="text-emerald-600" />
            <button onClick={() => setFilterKey('alle')} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border ${filterKey === 'alle' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}>Alle</button>
            <button onClick={() => setFilterKey('person')} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border ${filterKey === 'person' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}>Person</button>
            <button onClick={() => setFilterKey('anzeige')} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border ${filterKey === 'anzeige' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}>Anzeige</button>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setFilterKey('favorit')} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border inline-flex items-center gap-1 ${filterKey === 'favorit' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}><Heart size={12} /> Favorit</button>
            <button onClick={() => setFilterKey('archiviert')} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border inline-flex items-center gap-1 ${filterKey === 'archiviert' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}><Archive size={12} /> Archiviert</button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Chat suchen..." 
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-2xl text-sm border-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {filteredChats.length === 0 && (
            <div className="p-6 text-center">
              <p className="text-slate-500 font-black uppercase tracking-widest text-sm">Keine Chats für diesen Filter</p>
            </div>
          )}

          {filteredChats.map((chat) => {
            const isActive = activeChat ? activeChat.id === chat.id : false;
            return (
            <button
              key={chat.id}
              onClick={async () => {
                setMobileView('chat');
                if (userId) {
                  await loadChatMessages(chat, userId);
                } else {
                  setActiveChat(chat);
                }
              }}
              className={`w-full p-5 flex items-center gap-4 transition-all border-b border-slate-50 hover:bg-slate-50 ${isActive ? "bg-emerald-50/50 border-r-4 border-r-emerald-600" : ""}`}
            >
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-emerald-600 text-lg uppercase">
                {chat.partnerName.charAt(0)}
              </div>
              <div className="flex-1 text-left">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-black text-slate-900 text-sm uppercase truncate max-w-[120px]">{chat.partnerName}</span>
                  <span className="text-[10px] text-slate-400 font-bold">{chat.zeit}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${chat.typ === 'anzeige' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-600'}`}>{chat.typ === 'anzeige' ? 'Anzeige' : 'Person'}</span>
                  {chat.favorit && <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-rose-50 text-rose-600">Favorit</span>}
                  {chat.archiviert && <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-slate-200 text-slate-600">Archiviert</span>}
                </div>
                <p className="text-xs text-slate-500 truncate w-48 font-medium">{chat.letzteNachricht}</p>
              </div>
            </button>
          );})}
        </div>
      </aside>

      {/* RECHTE SEITE: CHAT-FENSTER */}
      <main className={`${mobileView === 'chat' ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-slate-50/50 relative`}>
        {activeChat ? (
        <>
        <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileView('list')}
              className="md:hidden px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white border border-emerald-200 text-emerald-700"
            >
              Zurück
            </button>
            {quickTarget ? (
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 truncate">Direktnachricht vorbereitet für {quickTarget}</p>
            ) : (
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 truncate">Chat mit {activeChat.partnerName}</p>
            )}
          </div>
          {quickTarget && (
            <button
              type="button"
              onClick={requestConnectionForQuickTarget}
              className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white"
            >
              Vernetzen
            </button>
          )}
        </div>

        <div className="flex-1 p-8 overflow-y-auto space-y-6 flex flex-col no-scrollbar">
          {activeChat.verlauf.map((msg) => {
            const isMe = msg.senderId === userId;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? "items-end ml-auto" : "items-start"} max-w-[75%]`}>
                <div className={`p-4 rounded-2xl ${isMe ? "bg-emerald-600 text-white rounded-tr-none" : "bg-white text-slate-700 rounded-tl-none"} shadow-sm border border-slate-100`}>
                  <p className="text-sm font-medium">{msg.text}</p>
                </div>
                <span className="text-[9px] text-slate-400 font-bold uppercase mt-2">{msg.zeitstempel}</span>
              </div>
            );
          })}
        </div>

        <footer className="p-6 bg-white border-t border-slate-100">
          <form onSubmit={handleSendMessage} className="flex items-center gap-4 bg-slate-50 p-2 rounded-[1.5rem] border border-slate-100">
            <input 
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder={`Deine Nachricht an ${activeChat.partnerName}...`}
              className="flex-1 bg-transparent border-none outline-none p-2 text-sm"
            />
            <button type="submit" disabled={!messageInput.trim()} className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700 transition-all">
              <Send size={18} />
            </button>
          </form>
        </footer>
        </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <p className="text-slate-500 font-black uppercase tracking-widest">Noch keine Chats vorhanden</p>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Starte eine Nachricht aus Suche oder Merkliste</p>
            </div>
          </div>
        )}
      </main>

      {reportDialogOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            onClick={() => {
              setReportDialogOpen(false);
              setReportReason('');
              setReportSeverity('normal');
              setReportError('');
            }}
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Melden Dialog schließen"
          />

          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-[2rem] border border-slate-200 shadow-2xl p-6 space-y-4">
              <h3 className="text-lg font-black italic uppercase text-slate-900">Chat melden</h3>
              <p className="text-sm text-slate-500 font-medium">Bitte gib einen Grund an, damit wir den Vorfall prüfen können.</p>

              <textarea
                value={reportReason}
                onChange={(e) => {
                  setReportReason(e.target.value);
                  if (reportError) setReportError('');
                }}
                placeholder="Grund der Meldung (z.B. Spam, Beleidigung, Betrug...)"
                className="w-full p-4 bg-slate-50 rounded-2xl text-sm border border-slate-200 outline-none focus:border-emerald-300 min-h-[120px] resize-none"
              />
              <select
                value={reportSeverity}
                onChange={(e) => setReportSeverity((e.target.value as 'normal' | 'strong' | 'animal_abuse'))}
                className="w-full p-3 bg-slate-50 rounded-xl text-sm border border-slate-200 outline-none focus:border-emerald-300"
              >
                <option value="normal">Normaler Verstoß (Verwarnungssystem)</option>
                <option value="strong">Schwerer Verstoß (direkt 3 Monate Sperre)</option>
                <option value="animal_abuse">Tierwohl / Tierquälerei (öffentliche Abstimmung)</option>
              </select>
              {reportError && <p className="text-[11px] font-bold text-red-500">{reportError}</p>}

              {activeChat?.gemeldet && activeChat?.meldeGrund && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Bisheriger Meldungsgrund</p>
                  <p className="text-sm text-red-700 mt-1">{activeChat.meldeGrund}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setReportDialogOpen(false);
                    setReportReason('');
                    setReportSeverity('normal');
                    setReportError('');
                  }}
                  className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={confirmReport}
                  className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-red-600 text-white hover:bg-red-500"
                >
                  Meldung senden
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}