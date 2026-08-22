"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { safeToFixed } from '../../lib/num';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Eye, Heart, Home, MapPin, Play, Share2, Star, User, Users, ShieldCheck, Info, CheckCircle2, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import LoggedInHeader from '../../components/logged-in-header';
import MediaDropzone from '../../components/media-dropzone';
import { ZERTIFIKAT_KATEGORIEN } from '../../suche/kategorien-daten';
import {
  createNetworkPost,
  getProfilePosts,
  getPublicProfileMeta,
  getExpertHorses,
  getExpertTeamMembers,
  addExpertHorse,
  addExpertTeamMember,
  removeExpertHorse,
  removeExpertTeamMember,
  removeProfilePost,
  saveExpertProfileData,
  saveUserProfileData,
  getStoredProfileData,
  updateExpertHorse,
  updateExpertTeamMember,
  updateProfilePost,
  uploadProfileHorseImage,
  uploadProfileImage,
  rateUser,
  respondToConnectionRequest,
  sendConnectionRequest,
  trackInteractionShare,
  trackProfileVisit,
  getWishlistedOfferIds,
  toggleProfileOfferWishlist,
  trackProfileOfferViews,
  uploadNetworkMedia,
  reportPublicProfile,
  persistProfileImageUrl
} from '../../actions';

type ProfileState = {
  role: 'experte' | 'nutzer';
  userId: number;
  name: string;
  ort: string;
  plz: string;
  verifiziert: boolean;
  kategorien: string[];
  zertifikate: string[];
  angebotText: string;
  sucheText: string;
  profilData: Record<string, any>;
};

type ProfileStats = {
  followerCount: number;
  followingCount: number;
  groupHostCount: number;
  groupMemberCount: number;
  ratingAvg: number;
  ratingCount: number;
};

type RatingItem = {
  rating: number;
  comment: string | null;
  offer_id?: string | null;
  offer_title?: string | null;
  is_verified_booking?: boolean;
  created_at: string;
  vorname: string;
  nachname: string;
};

type ConnectionItem = {
  id: number;
  status: 'pending' | 'accepted' | 'none';
  requester_user_id: number;
  addressee_user_id: number;
};

type GalerieItem = {
  type: 'image' | 'video';
  url: string;
};

type ProfilePostItem = {
  id: number;
  title: string;
  content: string;
  created_at: string;
  media_items: GalerieItem[];
};

const EXPERT_PROFILE_CATEGORIES = [
  'Reitunterricht',
  'Beritt',
  'Therapien & Training für Reiter',
  'Therapien für Pferde',
  'Hufbearbeitung'
];

export default function PublicProfilePage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [posts, setPosts] = useState<ProfilePostItem[]>([]);
  const [expertTeamMembers, setExpertTeamMembers] = useState<Array<{ id: number; name: string | null; role: string | null; description: string | null; member_user_id: number | null; email: string | null; user_display_name: string | null }>>([]);
  const [expertHorses, setExpertHorses] = useState<Array<{ id: number; name: string | null; breed: string | null; age: number | null; notes: string | null; image_url: string | null }>>([]);
  const [viewerUserId, setViewerUserId] = useState(0);
  const [viewerRole, setViewerRole] = useState<string | null>(null);
  const [viewerName, setViewerName] = useState('Profil');
  const [stats, setStats] = useState<ProfileStats>({
    followerCount: 0,
    followingCount: 0,
    groupHostCount: 0,
    groupMemberCount: 0,
    ratingAvg: 0,
    ratingCount: 0
  });
  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [connection, setConnection] = useState<ConnectionItem | null>(null);
  const [connectionBusy, setConnectionBusy] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingOfferId, setRatingOfferId] = useState('');
  const [ratingBusy, setRatingBusy] = useState(false);
  const [lightboxItem, setLightboxItem] = useState<GalerieItem | null>(null);
  const [activeTab, setActiveTab] = useState<'beitraege' | 'anzeigen' | 'team' | 'schulpferde'>('anzeigen');
  const [offerVisibilityFilter, setOfferVisibilityFilter] = useState<'public' | 'draft'>('public');
  const [viewingDrafts, setViewingDrafts] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [contentBusy, setContentBusy] = useState(false);
  const [contentMessage, setContentMessage] = useState('');
  const [contentError, setContentError] = useState('');
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState('');
  const [newPostForm, setNewPostForm] = useState({ title: '', content: '' });
  const [newPostMediaItems, setNewPostMediaItems] = useState<GalerieItem[]>([]);
  const [uploadingPostMedia, setUploadingPostMedia] = useState(false);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editingPostForm, setEditingPostForm] = useState({ title: '', content: '' });
  const [newOfferForm, setNewOfferForm] = useState({
    titel: '',
    kategorie: '',
    beschreibung: '',
    titleImageUrl: '',
    mediaItems: [] as GalerieItem[]
  });
  const [uploadingOfferMedia, setUploadingOfferMedia] = useState(false);
  const [newSearchForm, setNewSearchForm] = useState({ titel: '', kategorie: '', beschreibung: '' });
  const [draftsHydrated, setDraftsHydrated] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [editingOfferForm, setEditingOfferForm] = useState({ titel: '', kategorie: '', beschreibung: '' });
  const [editingSearchId, setEditingSearchId] = useState<string | null>(null);
  const [editingSearchForm, setEditingSearchForm] = useState({ titel: '', kategorie: '', beschreibung: '' });
  const [newTeamForm, setNewTeamForm] = useState({ memberUserId: '', inviteEmail: '' });
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  const [newHorseForm, setNewHorseForm] = useState({ name: '', breed: '', age: '', notes: '', imageUrl: '' });
  const [editingHorseId, setEditingHorseId] = useState<number | null>(null);
  const [editingHorseForm, setEditingHorseForm] = useState({ name: '', breed: '', age: '', notes: '', imageUrl: '' });
  const offerViewTrackRef = useRef('');
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [editCertificates, setEditCertificates] = useState<string[]>([]);
  const [newQualificationInput, setNewQualificationInput] = useState('');
  const [openQualificationSection, setOpenQualificationSection] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    ort: '',
    plz: '',
    mainText: '',
    description: '',
    profilbildUrl: '',
    website: '',
    profilbildPositionX: 50,
    profilbildPositionY: 50,
    profilbildZoom: 1
  });
  const [showRatingsDetails, setShowRatingsDetails] = useState(false);
  const [profileImageDragActive, setProfileImageDragActive] = useState(false);
  const [imageEditMode, setImageEditMode] = useState(false);
  const profileImageFrameRef = useRef<HTMLDivElement | null>(null);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [searchVisibilityFilter, setSearchVisibilityFilter] = useState<'public' | 'draft'>('public');
  const [wishlistedOfferIds, setWishlistedOfferIds] = useState<string[]>([]);
  const [offerActionBusyId, setOfferActionBusyId] = useState<string | null>(null);
  const normalizedViewerRole = String(viewerRole || '').trim().toLowerCase();
  const isExpertViewer = Boolean(normalizedViewerRole) && !['nutzer', 'user', 'kunde'].includes(normalizedViewerRole);
  const isOwnProfile = Boolean(profile && viewerUserId > 0 && viewerUserId === profile.userId);

  const loadMeta = async (profileUserId: number, viewerId: number, isMounted = true) => {
    const metaRes = await getPublicProfileMeta({ profileUserId, viewerUserId: viewerId });
    if (!isMounted) return;
    if (metaRes.success) {
      setStats(metaRes.stats);
      setRatings((metaRes.ratings || []) as RatingItem[]);
      setConnection((metaRes.connection || null) as ConnectionItem | null);
    }
  };

  const loadSecondaryProfileData = async (profileUserId: number, viewerId: number, isExpertProfile: boolean, isMounted = true) => {
    const [postsRes, metaRes] = await Promise.all([
      getProfilePosts(viewerId, profileUserId, 12),
      getPublicProfileMeta({ profileUserId, viewerUserId: viewerId })
    ]);

    if (!isMounted) return;

    if (postsRes.success && Array.isArray(postsRes.posts)) {
      setPosts((postsRes.posts || []).map((post: any) => ({
        id: Number(post.id),
        title: String(post.title || '').trim(),
        content: String(post.content || '').trim(),
        created_at: String(post.created_at || ''),
        media_items: Array.isArray(post.media_items)
          ? post.media_items
              .map((item: any) => ({
                type: String(item?.mediaType || item?.type || 'image') === 'video' ? 'video' : 'image',
                url: normalizeMediaUrl(String(item?.url || '').trim())
              }))
              .filter((item: GalerieItem) => item.url.length > 0)
          : []
      })));
    }

    if (metaRes.success) {
      setStats(metaRes.stats);
      setRatings((metaRes.ratings || []) as RatingItem[]);
      setConnection((metaRes.connection || null) as ConnectionItem | null);
    }

    // Don't auto-load team & horses; load them lazily when tabs are opened for better UX
    if (!isExpertProfile) {
      setExpertTeamMembers([]);
      setExpertHorses([]);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const profileUserId = parseInt(String(params.userId || ''), 10);
      if (Number.isNaN(profileUserId) || profileUserId <= 0) {
        if (isMounted) setLoading(false);
        return;
      }

      // Warte bis viewerUserId gesetzt ist (von sessionStorage)
      // Dies sollte schnell passieren, aber wir müssen es sicherstellen
      const safeViewer = viewerUserId;
      if (!isMounted) return;

      // Wir setzen hier nur die UI-Sperre zurück, die Daten kommen aus dem State
      setEditMode(false);

      const profileRes = await getStoredProfileData(profileUserId);

      if (!isMounted) return;

      const isExpertProfile = Boolean(
        profileRes.success
          && profileRes.data
          && String(profileRes.data.role || '').trim().toLowerCase() === 'experte'
      );

      if (profileRes.success && profileRes.data) {
        const row = profileRes.data;
        const profilData = {
          ...(row.profil_data || {}),
          gesuche: row.gesuche || row.profil_data?.gesuche || []
        };

        setProfile({
          role: row.role === 'experte' ? 'experte' : 'nutzer',
          userId: profileUserId,
          name: row.display_name || `${profilData.vorname || ''} ${profilData.nachname || ''}`.trim() || `Profil ${profileUserId}`,
          ort: row.ort || '',
          plz: row.plz || '',
          verifiziert: Boolean(row.user_verifiziert ?? row.verifiziert),
          kategorien: Array.isArray(row.kategorien) ? row.kategorien : [],
          zertifikate: Array.isArray(row.zertifikate) ? row.zertifikate : [],
          angebotText: row.angebot_text || '',
          sucheText: row.suche_text || '',
          profilData
        });

        if (safeViewer > 0 && safeViewer === profileUserId && row.role) {
          const resolvedRole = String(row.role).trim().toLowerCase();
          setViewerRole(resolvedRole);
          sessionStorage.setItem('userRole', resolvedRole);
        }

        if (safeViewer > 0 && safeViewer !== profileUserId) {
          void trackProfileVisit(safeViewer, profileUserId);
        }
      } else {
        setLoadError(String(profileRes.error || 'Profil konnte nicht geladen werden.'));
        setLoading(false);
        return;
      }

      setLoading(false);

      void loadSecondaryProfileData(profileUserId, safeViewer, isExpertProfile, isMounted);
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [params]);

  const horseImages = useMemo(() => {
    if (!profile) return [] as string[];
    const pferdeRaw = profile.profilData?.pferde;
    const pferdeBilder = Array.isArray(pferdeRaw)
      ? pferdeRaw.flatMap((item: any) => (Array.isArray(item?.bilder) ? item.bilder : [])).map((url: any) => String(url || '').trim())
      : [];
    const legacyImages = Array.isArray(profile.profilData?.pferdBilder)
      ? profile.profilData.pferdBilder.map((url: any) => normalizeMediaUrl(String(url || '').trim()))
      : [];
    return [...pferdeBilder.map((u) => normalizeMediaUrl(u)), ...legacyImages].filter((url, index, all) => url.length > 0 && all.indexOf(url) === index);
  }, [profile]);

  // Normalize media URLs: turn root-relative paths into absolute URLs so <img src=...> works
  const normalizeMediaUrl = (url?: string) => {
    const raw = String(url || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) {
      console.log('normalizeMediaUrl: already absolute URL:', raw);
      return raw;
    }
    if (raw.startsWith('//')) {
      const result = `${window.location.protocol}${raw}`;
      console.log('normalizeMediaUrl: protocol-relative to:', result);
      return result;
    }
    if (raw.startsWith('/')) {
      const result = `${window.location.origin}${raw}`;
      console.log('normalizeMediaUrl: root-relative to:', result);
      return result;
    }
    console.log('normalizeMediaUrl: unchanged:', raw);
    return raw;
  };

  const horseCards = useMemo<Array<{ id: string; name: string; rasse: string; alter: string; beschreibung: string; bilder: string[] }>>(() => {
    if (!profile) return [];
    if (expertHorses.length > 0) {
      return expertHorses.map((horse) => ({
        id: String(horse.id),
        name: String(horse.name || '').trim(),
        rasse: String(horse.breed || '').trim(),
        alter: horse.age == null ? '' : String(horse.age),
        beschreibung: String(horse.notes || '').trim(),
        bilder: horse.image_url ? [normalizeMediaUrl(String(horse.image_url).trim())] : []
      }));
    }

    const raw = profile.profilData?.pferde;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw
        .map((item: any, idx: number) => {
          const bilder = Array.isArray(item?.bilder)
            ? item.bilder.map((url: any) => String(url || '').trim()).filter((url: string) => url.length > 0)
            : [];
          return {
            id: String(item?.id || `horse-${idx}`),
            name: String(item?.name || '').trim(),
            rasse: String(item?.rasse || '').trim(),
            alter: String(item?.alter || '').trim(),
            beschreibung: String(item?.beschreibung || '').trim(),
            bilder
          };
        })
        .filter((item: { id: string; name: string; rasse: string; alter: string; beschreibung: string; bilder: string[] }) => item.name || item.rasse || item.alter || item.beschreibung || item.bilder.length > 0);
    }

    const legacyHorse = {
      id: 'legacy-horse',
      name: String(profile.profilData?.pferdName || '').trim(),
      rasse: String(profile.profilData?.pferdRasse || '').trim(),
      alter: String(profile.profilData?.pferdAlter || '').trim(),
      beschreibung: String(profile.profilData?.pferdBeschreibung || '').trim(),
      bilder: horseImages
    };

    return legacyHorse.name || legacyHorse.rasse || legacyHorse.alter || legacyHorse.beschreibung || legacyHorse.bilder.length > 0 ? [legacyHorse] : [];
  }, [expertHorses, horseImages, profile]);

  const teamCards = useMemo<Array<{ id: string; name: string; rolle: string; beschreibung: string; bild_url: string }>>(() => {
    if (!profile) return [];
    if (expertTeamMembers.length > 0) {
      return expertTeamMembers.map((member) => ({
        id: String(member.id),
        name: String(member.user_display_name || member.name || '').trim(),
        rolle: String(member.role || '').trim(),
        beschreibung: [String(member.description || '').trim(), member.email ? `Kontakt: ${member.email}` : ''].filter(Boolean).join('\n'),
        bild_url: ''
      }));
    }

    const raw = profile.profilData?.unserTeam;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw
        .map((item: any, idx: number) => ({
          id: String(item?.id || `team-${idx}`),
          name: String(item?.name || '').trim(),
          rolle: String(item?.rolle || '').trim(),
          beschreibung: String(item?.beschreibung || '').trim(),
          bild_url: String(item?.bild_url || '').trim()
        }))
        .filter((item: { id: string; name: string; rolle: string; beschreibung: string; bild_url: string }) => item.name || item.rolle || item.beschreibung || item.bild_url);
    }

    const legacyBeschreibung = String(profile.profilData?.mitarbeiter || '').trim();
    return legacyBeschreibung
      ? [
          {
            id: 'legacy-team',
            name: '',
            rolle: '',
            beschreibung: legacyBeschreibung,
            bild_url: ''
          }
        ]
      : [];
  }, [expertTeamMembers, profile]);

  const angebotCards = useMemo(() => {
    if (!profile) return [] as Array<{
      id: string;
      titel: string;
      kategorie: string;
      beschreibung: string;
      preview: string;
      conditionsText: string;
      visibility: 'public' | 'draft';
      viewsCount: number;
      wishlistCount: number;
      titleImageUrl: string;
      boostedUntil?: string | null;
    }>;
    const raw = profile.profilData?.angeboteAnzeigen;
    if (!Array.isArray(raw)) return [];

    return raw
      .map((item: any, idx: number) => {
        const preise = Array.isArray(item?.preise)
          ? item.preise
              .map((preis: any) => ({
                label: String(preis?.label || preis?.typ || '').trim(),
                preis: String(preis?.preis || preis?.betrag || '').trim(),
                einheit: String(preis?.einheit || preis?.leistung || '').trim()
              }))
              .filter((preis: { label: string; preis: string; einheit: string }) => preis.label || preis.preis)
          : [];
        const previewIndex = Number.isInteger(item?.previewPreisIndex) ? Number(item.previewPreisIndex) : 0;
        const preview = preise[Math.max(0, Math.min(previewIndex, Math.max(preise.length - 1, 0)))];
        const previewText = preview ? `${preview.label || 'Preis'}: ${preview.preis || '-'} ${preview.einheit || ''}`.trim() : '';
        const billingType = String(item?.billingType || '').trim().toLowerCase() === 'abo' ? 'abo' : 'einmal';
        const sessionsPerAbo = String(item?.sessionsPerAbo || '').trim();
        const cancellationAllowed = Boolean(item?.singleSessionCancellationAllowed);
        const maxCancellations = String(item?.maxCancellationsPerAbo || '').trim();
        const cancellationWindowHours = String(item?.cancellationWindowHours || '').trim();

        const conditionsParts: string[] = [
          billingType === 'abo' ? 'Abrechnung: Abo' : 'Abrechnung: Einmalzahlung',
        ];
        if (billingType === 'abo' && sessionsPerAbo) {
          conditionsParts.push(`Leistungen im Abo: ${sessionsPerAbo}`);
        }
        if (billingType === 'abo') {
          conditionsParts.push(`Ruecktritt einzelner Leistung: ${cancellationAllowed ? 'Ja' : 'Nein'}`);
          if (cancellationAllowed && maxCancellations) {
            conditionsParts.push(`Max. Ruecktritte: ${maxCancellations}`);
          }
          if (cancellationWindowHours) {
            conditionsParts.push(`Ruecktrittsfrist: ${cancellationWindowHours}h`);
          }
        }

        return {
          id: String(item?.id || `angebot-${idx}`),
          titel: String(item?.titel || '').trim(),
          kategorie: String(item?.kategorie || '').trim(),
          beschreibung: String(item?.beschreibung || '').trim(),
          preview: previewText,
          conditionsText: conditionsParts.join(' · '),
          visibility: item?.visibility === 'draft' ? 'draft' : 'public',
          viewsCount: Math.max(0, Number(item?.viewsCount || 0)),
          wishlistCount: Math.max(0, Number(item?.wishlistCount || 0)),
          titleImageUrl: normalizeMediaUrl(String(item?.titleImageUrl || '').trim()),
          boostedUntil: item?.boostedUntil ? String(item.boostedUntil) : null
        };
      })
      .filter((item: { id: string; titel: string; kategorie: string; beschreibung: string; preview: string; conditionsText: string }) => item.titel || item.kategorie || item.beschreibung || item.preview || item.conditionsText);
  }, [profile]);

  const searchCards = useMemo(() => {
    if (!profile || profile.role !== 'nutzer') return [] as Array<{
      id: string;
      titel: string;
      kategorie: string;
      beschreibung: string;
      visibility: 'public' | 'draft';
      viewsCount: number;
      boostedUntil?: string | null;
    }>;

    const raw = profile.profilData?.gesuche;
    const rawSearches = Array.isArray(raw)
      ? raw
      : raw && typeof raw === 'object'
        ? Object.values(raw as Record<string, any>)
        : [];

    return rawSearches
      .map((item: any, idx: number) => ({
        id: String(item?.id || `gesuch-${idx}`),
        titel: String(item?.titel || '').trim(),
        kategorie: String(item?.kategorie || '').trim(),
        beschreibung: String(item?.beschreibung || '').trim(),
        visibility: item?.visibility === 'draft' ? 'draft' : 'public',
        viewsCount: Math.max(0, Number(item?.viewsCount || 0)),
        boostedUntil: item?.boostedUntil ? String(item.boostedUntil) : null
      }))
      .filter((item: { id: string; titel: string; kategorie: string; beschreibung: string }) => item.titel || item.kategorie || item.beschreibung);
  }, [profile]);

  const visibleSearchCards = useMemo(() => {
    const now = Date.now();
    const filtered = isOwnProfile
      ? searchCards.filter((item) => (searchVisibilityFilter === 'draft' ? item.visibility === 'draft' : item.visibility === 'public'))
      : searchCards.filter((item) => item.visibility === 'public');

    return filtered
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const aBoostEnd = a.item.boostedUntil ? new Date(a.item.boostedUntil).getTime() : Number.NaN;
        const bBoostEnd = b.item.boostedUntil ? new Date(b.item.boostedUntil).getTime() : Number.NaN;
        const aBoostActive = Number.isFinite(aBoostEnd) && aBoostEnd > now;
        const bBoostActive = Number.isFinite(bBoostEnd) && bBoostEnd > now;

        if (aBoostActive !== bBoostActive) {
          return aBoostActive ? -1 : 1;
        }

        if (aBoostActive && bBoostActive && aBoostEnd !== bBoostEnd) {
          return bBoostEnd - aBoostEnd;
        }

        return a.index - b.index;
      })
      .map((entry) => entry.item);
  }, [isOwnProfile, searchCards, searchVisibilityFilter]);

  const hasPublicSearches = useMemo(() => {
    return profile?.role === 'nutzer' && searchCards.some((item) => item.visibility === 'public');
  }, [profile, searchCards]);

  const visibleAngebotCards = useMemo(() => {
    const now = Date.now();
    const filtered = isOwnProfile
      ? angebotCards.filter((item) => (offerVisibilityFilter === 'draft' ? item.visibility === 'draft' : item.visibility === 'public'))
      : angebotCards.filter((item) => item.visibility === 'public');

    return filtered
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const aBoostEnd = a.item.boostedUntil ? new Date(a.item.boostedUntil).getTime() : Number.NaN;
        const bBoostEnd = b.item.boostedUntil ? new Date(b.item.boostedUntil).getTime() : Number.NaN;
        const aBoostActive = Number.isFinite(aBoostEnd) && aBoostEnd > now;
        const bBoostActive = Number.isFinite(bBoostEnd) && bBoostEnd > now;

        if (aBoostActive !== bBoostActive) {
          return aBoostActive ? -1 : 1;
        }

        if (aBoostActive && bBoostActive && aBoostEnd !== bBoostEnd) {
          return bBoostEnd - aBoostEnd;
        }

        return a.index - b.index;
      })
      .map((entry) => entry.item);
  }, [angebotCards, isOwnProfile, offerVisibilityFilter]);

  const hasPublicExpertAds = useMemo(() => {
    return profile?.role === 'experte' && angebotCards.some((item) => item.visibility === 'public');
  }, [angebotCards, profile]);

  useEffect(() => {
    if (!hasPublicExpertAds) {
      setRatingOfferId('');
      return;
    }

    if (!ratingOfferId) {
      const firstOfferId = visibleAngebotCards.find((item) => item.visibility === 'public')?.id || '';
      if (firstOfferId) {
        setRatingOfferId(firstOfferId);
      }
    }
  }, [hasPublicExpertAds, ratingOfferId, visibleAngebotCards]);

  const wishlistedOfferIdSet = useMemo(() => new Set(wishlistedOfferIds), [wishlistedOfferIds]);

  const has = (value: any) => Boolean(String(value || '').trim());
  const clampPercent = (value: number, fallback = 50) => {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(0, Math.min(100, value));
  };
  const clampZoom = (value: number, fallback = 1) => {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(1, Math.min(2, value));
  };
  const galerieItems = useMemo((): GalerieItem[] => {
    if (!profile) return [];
    const raw = profile.profilData?.galerie;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item: any) => ({
        type: (String(item?.type || 'image') === 'video' ? 'video' : 'image') as 'image' | 'video',
        url: normalizeMediaUrl(String(item?.url || '').trim())
      }))
      .filter((item) => item.url.length > 0);
  }, [profile]);

  const profileImagePreviewUrl = useMemo(() => {
    // In edit/image-edit mode, prioritize the current form value
    if (isOwnProfile && (editMode || imageEditMode)) {
      const formUrl = String(editForm.profilbildUrl || '').trim();
      if (formUrl.length > 0) {
        return normalizeMediaUrl(formUrl);
      }
    }
    // Otherwise show the saved profile image
    if (!profile) return '';
    const profilbild = String(profile.profilData?.profilbild_url || '').trim();
    if (profilbild) return normalizeMediaUrl(profilbild);
    const firstGalleryImage = Array.isArray(profile.profilData?.galerie)
      ? profile.profilData.galerie
          .map((item: any) => ({
            type: String(item?.type || 'image') === 'video' ? 'video' : 'image',
            url: String(item?.url || '').trim()
          }))
          .find((item: { type: string; url: string }) => item.type === 'image' && item.url.length > 0)?.url || ''
      : '';
    if (firstGalleryImage) return normalizeMediaUrl(firstGalleryImage);
    return normalizeMediaUrl(horseImages[0] || '');
  }, [editForm.profilbildUrl, editMode, imageEditMode, isOwnProfile, profile, horseImages]);
  const profileImagePosition = useMemo(() => {
    if (isOwnProfile && editMode) {
      return {
        x: clampPercent(Number(editForm.profilbildPositionX), 50),
        y: clampPercent(Number(editForm.profilbildPositionY), 50),
        zoom: clampZoom(Number(editForm.profilbildZoom), 1)
      };
    }

    const x = clampPercent(Number(profile?.profilData?.profilbild_position_x), 50);
    const y = clampPercent(Number(profile?.profilData?.profilbild_position_y), 50);
    const zoom = clampZoom(Number(profile?.profilData?.profilbild_zoom), 1);
    return { x, y, zoom };
  }, [editForm.profilbildPositionX, editForm.profilbildPositionY, editForm.profilbildZoom, editMode, isOwnProfile, profile?.profilData?.profilbild_position_x, profile?.profilData?.profilbild_position_y, profile?.profilData?.profilbild_zoom]);
  const profileImageObjectStyle = useMemo(() => ({
    objectPosition: `${profileImagePosition.x}% ${profileImagePosition.y}%`,
    transform: `scale(${profileImagePosition.zoom})`,
    transformOrigin: `${profileImagePosition.x}% ${profileImagePosition.y}%`
  }), [profileImagePosition.x, profileImagePosition.y, profileImagePosition.zoom]);

  // Debug: log profile image preview URL changes
  useEffect(() => {
    console.log('=== Profile Image Preview Debug ===');
    console.log('profileImagePreviewUrl:', profileImagePreviewUrl);
    console.log('editForm.profilbildUrl:', editForm.profilbildUrl);
    console.log('isOwnProfile:', isOwnProfile);
    console.log('editMode:', editMode);
    console.log('imageEditMode:', imageEditMode);
    if (profile?.profilData?.profilbild_url) {
      console.log('profile.profilData.profilbild_url:', profile.profilData.profilbild_url);
    }
  }, [profileImagePreviewUrl, editForm.profilbildUrl, isOwnProfile, editMode, imageEditMode, profile?.profilData?.profilbild_url]);

  const isPublicProfile = profile ? profile.profilData?.isPublicProfile !== false : true;
  const hasTeam = teamCards.length > 0;
  const hasSchulpferde = horseCards.length > 0;
  const generalInfoText = String(profile?.profilData?.freitextBeschreibung || '').trim();
  const websiteRaw = String(profile?.profilData?.website || '').trim();
  const websiteHref = websiteRaw && /^https?:\/\//i.test(websiteRaw) ? websiteRaw : (websiteRaw ? `https://${websiteRaw}` : '');
  const expertCategoryBadges = useMemo(() => {
    if (!profile || profile.role !== 'experte') return [] as Array<{ label: string; selected: boolean }>;
    return EXPERT_PROFILE_CATEGORIES.map((label) => ({
      label,
      selected: profile.kategorien.includes(label)
    }));
  }, [profile]);
  const verifiedQualificationSet = useMemo(() => {
    const values = Array.isArray(profile?.profilData?.verifizierteZertifikate)
      ? profile!.profilData.verifizierteZertifikate
      : [];
    return new Set(values.map((item: any) => String(item || '').trim()).filter(Boolean));
  }, [profile]);
  const qualificationGroups = useMemo(() => {
    return Object.entries(ZERTIFIKAT_KATEGORIEN).map(([groupName, content]) => {
      const tokens: string[] = [];

      const collectTokens = (value: any, prefix?: string) => {
        if (Array.isArray(value)) {
          value.forEach((entry) => {
            const token = prefix ? `${prefix}: ${String(entry)}` : String(entry);
            if (token.trim()) tokens.push(token.trim());
          });
          return;
        }

        if (value && typeof value === 'object') {
          Object.entries(value).forEach(([childKey, childValue]) => {
            if (childKey === 'Sonstiges') {
              return;
            }
            if (Array.isArray(childValue)) {
              childValue.forEach((entry) => {
                const token = `${childKey}: ${String(entry)}`;
                if (token.trim()) tokens.push(token.trim());
              });
              return;
            }
            if (childValue == null) {
              if (childKey.trim()) tokens.push(childKey.trim());
              return;
            }
            const token = `${childKey}: ${String(childValue)}`;
            if (token.trim()) tokens.push(token.trim());
          });
          return;
        }

        const token = String(value || '').trim();
        if (token) tokens.push(token);
      };

      collectTokens(content);

      return {
        groupName,
        tokens: Array.from(new Set(tokens)),
      };
    });
  }, []);
  const postDraftKey = profile?.userId ? `equi:draft:profile:${profile.userId}:new-post` : '';
  const offerDraftKey = profile?.userId ? `equi:draft:profile:${profile.userId}:new-offer` : '';
  const searchDraftKey = profile?.userId ? `equi:draft:profile:${profile.userId}:new-search` : '';
  const hasPostDraft = Boolean(newPostForm.title.trim() || newPostForm.content.trim());
  const hasOfferDraft = Boolean(
    newOfferForm.titel.trim()
    || newOfferForm.kategorie.trim()
    || newOfferForm.beschreibung.trim()
    || newOfferForm.titleImageUrl.trim()
    || newOfferForm.mediaItems.length > 0
  );
  const hasSearchDraft = Boolean(newSearchForm.titel.trim() || newSearchForm.kategorie.trim() || newSearchForm.beschreibung.trim());

  const formatEuro = (cents: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100);

  const formatDate = (value?: string | null) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleString('de-DE');
  };

  const toggleQualification = (value: string) => {
    const normalized = String(value || '').trim();
    if (!normalized) return;
    setEditCertificates((prev) => (prev.includes(normalized) ? prev.filter((item) => item !== normalized) : [...prev, normalized]));
  };

  const addCustomQualification = () => {
    const normalized = String(newQualificationInput || '').trim();
    if (!normalized) return;
    setEditCertificates((prev) => (prev.includes(normalized) ? prev : [...prev, normalized]));
    setNewQualificationInput('');
  };

  const removeQualification = (value: string) => {
    const normalized = String(value || '').trim();
    if (!normalized) return;
    setEditCertificates((prev) => prev.filter((item) => item !== normalized));
  };

  const openReportDialog = () => {
    setReportDialogOpen(true);
    setReportReason('');
    setReportError('');
  };

  const confirmProfileReport = async () => {
    if (!profile || !viewerUserId || isOwnProfile || reportBusy) return;
    const reason = reportReason.trim();
    if (reason.length < 5) {
      setReportError('Bitte einen Grund mit mindestens 5 Zeichen angeben.');
      return;
    }

    setReportBusy(true);
    const res = await reportPublicProfile({ reporterUserId: viewerUserId, profileUserId: profile.userId, reason });
    setReportBusy(false);

    if (!res.success) {
      setReportError(res.error || 'Meldung konnte nicht gesendet werden.');
      return;
    }

    setReportDialogOpen(false);
    setReportReason('');
    setReportError('');
    alert('Profil wurde gemeldet.');
  };

  useEffect(() => {
    if (!profile || isOwnProfile || viewerUserId <= 0 || profile.role !== 'experte') {
      setWishlistedOfferIds([]);
      return;
    }

    let cancelled = false;
    // 1. Wir wandeln die IDs explizit in Strings um, bevor wir sie an die Action senden
getWishlistedOfferIds(String(viewerUserId), String(profile.userId)).then((res) => {
  if (cancelled || !res.success) return;
  
  // 2. Wir stellen sicher, dass res.offerIds ein Array ist 
  // 3. Wir typisieren 'id' im map als 'string | number', um den 'implicit any' Fehler zu lösen
  const safeIds = Array.isArray(res.offerIds) 
    ? res.offerIds.map((id: string | number) => String(id)) 
    : [];
    
  setWishlistedOfferIds(safeIds);
});

    return () => {
      cancelled = true;
    };
  }, [isOwnProfile, profile, viewerUserId]);

useEffect(() => {
  if (typeof window !== "undefined") {
    const rawId = sessionStorage.getItem('userId');
    const role = sessionStorage.getItem('userRole');
    const name = sessionStorage.getItem('userName');

    if (rawId) setViewerUserId(parseInt(rawId, 10));
    if (role) setViewerRole(role);
    if (name) setViewerName(name);
  }
}, []);

useEffect(() => {
  if (typeof window === 'undefined') return;

  const applyTabFromHash = () => {
    const rawHash = window.location.hash.replace('#', '').trim().toLowerCase();
    if (!rawHash) return;

    if (rawHash === 'beitraege') {
      setActiveTab('beitraege');
      return;
    }

    if (rawHash === 'anzeigen') {
      setActiveTab('anzeigen');
      return;
    }


    if (rawHash === 'team' && profile?.role === 'experte' && (editMode || hasTeam)) {
      setActiveTab('team');
      return;
    }

    if (rawHash === 'schulpferde' && profile?.role === 'experte' && (editMode || hasSchulpferde)) {
      setActiveTab('schulpferde');
    }
  };

  applyTabFromHash();
  window.addEventListener('hashchange', applyTabFromHash);
  return () => {
    window.removeEventListener('hashchange', applyTabFromHash);
  };
}, [editMode, hasSchulpferde, hasTeam, profile?.role]);

  useEffect(() => {
    if (!profile || isOwnProfile || viewerUserId <= 0 || profile.role !== 'experte') return;

    const publicOfferIds = angebotCards
      .filter((offer) => offer.visibility === 'public')
      .map((offer) => String(offer.id || '').trim())
      .filter(Boolean);

    if (publicOfferIds.length === 0) return;

    const trackKey = `${profile.userId}:${viewerUserId}:${publicOfferIds.join('|')}`;
    if (offerViewTrackRef.current === trackKey) return;
    offerViewTrackRef.current = trackKey;

    trackProfileOfferViews({
      viewerUserId,
      profileUserId: profile.userId,
      offerIds: publicOfferIds
    }).then((res) => {
      if (!res.success || !res.countsByOfferId) return;
      setProfile((prev) => {
        if (!prev) return prev;
        const rawOffers = Array.isArray(prev.profilData?.angeboteAnzeigen) ? prev.profilData.angeboteAnzeigen : [];
        if (rawOffers.length === 0) return prev;
        const nextOffers = rawOffers.map((offer: any) => {
          const offerId = String(offer?.id || '').trim();
          if (!offerId || !(offerId in res.countsByOfferId)) return offer;
          return {
            ...offer,
            viewsCount: Math.max(0, Number(res.countsByOfferId[offerId] || 0))
          };
        });
        return {
          ...prev,
          profilData: {
            ...(prev.profilData || {}),
            angeboteAnzeigen: nextOffers
          }
        };
      });
    });
  }, [angebotCards, isOwnProfile, profile, viewerUserId]);

  useEffect(() => {
    if (!profile) return;
    if (!editMode && profile.role !== 'experte' && (activeTab === 'team' || activeTab === 'schulpferde')) {
      setActiveTab('anzeigen');
      return;
    }
    if (!editMode && profile.role === 'experte' && activeTab === 'team' && !hasTeam) {
      setActiveTab('anzeigen');
      return;
    }
    if (!editMode && profile.role === 'experte' && activeTab === 'schulpferde' && !hasSchulpferde) {
      setActiveTab('anzeigen');
    }
  }, [activeTab, editMode, hasSchulpferde, hasTeam, profile]);

  useEffect(() => {
    if (!profile) return;
    const description = String(profile.profilData?.freitextBeschreibung || profile.profilData?.profilBeschreibung || '').trim();
    const profilbildUrl = String(profile.profilData?.profilbild_url || '').trim();
    const website = String(profile.profilData?.website || '').trim();
    setEditForm({
      name: profile.name || '',
      ort: profile.ort || '',
      plz: profile.plz || '',
      mainText: profile.role === 'experte' ? (profile.angebotText || '') : (profile.sucheText || ''),
      description,
      profilbildUrl,
      website,
      profilbildPositionX: clampPercent(Number(profile.profilData?.profilbild_position_x), 50),
      profilbildPositionY: clampPercent(Number(profile.profilData?.profilbild_position_y), 50),
      profilbildZoom: clampZoom(Number(profile.profilData?.profilbild_zoom), 1),
    });
    setEditCategories(Array.isArray(profile.kategorien) ? profile.kategorien : []);
    setEditCertificates(Array.isArray(profile.zertifikate) ? profile.zertifikate : []);
    setNewQualificationInput('');
  }, [profile]);

  useEffect(() => {
    if (activeTab !== 'beitraege') {
      setShowRatingsDetails(false);
    }
  }, [activeTab]);

  // Lazy-load team and horses when tabs are opened (performance optimization)
  useEffect(() => {
    if (!profile || profile.role !== 'experte' || !profile.userId) return;
    if (activeTab !== 'team' && activeTab !== 'schulpferde') return;

    const loadTeamAndHorses = async () => {
      if (activeTab === 'team' && expertTeamMembers.length === 0) {
        const teamRes = await getExpertTeamMembers(profile.userId);
        if (teamRes.success && Array.isArray(teamRes.teamMembers)) {
          setExpertTeamMembers(teamRes.teamMembers as Array<{ id: number; name: string | null; role: string | null; description: string | null; member_user_id: number | null; email: string | null; user_display_name: string | null }>);
        }
      }
      if (activeTab === 'schulpferde' && expertHorses.length === 0) {
        const horsesRes = await getExpertHorses(profile.userId);
        if (horsesRes.success && Array.isArray(horsesRes.horses)) {
          setExpertHorses(horsesRes.horses as Array<{ id: number; name: string | null; breed: string | null; age: number | null; notes: string | null; image_url: string | null }>);
        }
      }
    };

    loadTeamAndHorses();
  }, [activeTab, profile, expertTeamMembers.length, expertHorses.length]);

  useEffect(() => {
    if (!isOwnProfile || !editMode || !postDraftKey || !offerDraftKey || draftsHydrated) return;
    if (typeof window === 'undefined') return;

    try {
      const savedPostDraft = localStorage.getItem(postDraftKey);
      if (savedPostDraft) {
        const parsedPost = JSON.parse(savedPostDraft);
        setNewPostForm({
          title: String(parsedPost?.title || ''),
          content: String(parsedPost?.content || '')
        });
      }

      const savedOfferDraft = localStorage.getItem(offerDraftKey);
      if (savedOfferDraft) {
        const parsedOffer = JSON.parse(savedOfferDraft);
        setNewOfferForm({
          titel: String(parsedOffer?.titel || ''),
          kategorie: String(parsedOffer?.kategorie || ''),
          beschreibung: String(parsedOffer?.beschreibung || ''),
          titleImageUrl: String(parsedOffer?.titleImageUrl || ''),
          mediaItems: Array.isArray(parsedOffer?.mediaItems)
            ? parsedOffer.mediaItems
                .map((item: any) => ({
                  type: String(item?.type || '').trim() === 'video' ? 'video' : 'image',
                  url: String(item?.url || '').trim()
                }))
                .filter((item: GalerieItem) => item.url)
            : []
        });
      }
    } catch {
      // Ignore broken draft payloads and continue with empty forms.
    }

    setDraftsHydrated(true);
  }, [draftsHydrated, editMode, isOwnProfile, offerDraftKey, postDraftKey]);

  useEffect(() => {
    if (!isOwnProfile || !editMode || !postDraftKey || !draftsHydrated) return;
    if (typeof window === 'undefined') return;

    const hasPostDraft = Boolean(newPostForm.title.trim() || newPostForm.content.trim());
    if (!hasPostDraft) {
      localStorage.removeItem(postDraftKey);
      return;
    }

    localStorage.setItem(postDraftKey, JSON.stringify(newPostForm));
  }, [draftsHydrated, editMode, isOwnProfile, newPostForm, postDraftKey]);

  useEffect(() => {
    if (!isOwnProfile || !editMode || !offerDraftKey || !draftsHydrated) return;
    if (typeof window === 'undefined') return;

    const hasOfferDraft = Boolean(
      newOfferForm.titel.trim()
      || newOfferForm.kategorie.trim()
      || newOfferForm.beschreibung.trim()
      || newOfferForm.titleImageUrl.trim()
      || newOfferForm.mediaItems.length > 0
    );
    if (!hasOfferDraft) {
      localStorage.removeItem(offerDraftKey);
      return;
    }

    localStorage.setItem(offerDraftKey, JSON.stringify(newOfferForm));
  }, [draftsHydrated, editMode, isOwnProfile, newOfferForm, offerDraftKey]);

  useEffect(() => {
    if (!isOwnProfile || !editMode || !searchDraftKey || draftsHydrated) return;
    if (typeof window === 'undefined') return;

    try {
      const savedSearchDraft = localStorage.getItem(searchDraftKey);
      if (savedSearchDraft) {
        const parsedSearch = JSON.parse(savedSearchDraft);
        setNewSearchForm({
          titel: String(parsedSearch?.titel || ''),
          kategorie: String(parsedSearch?.kategorie || ''),
          beschreibung: String(parsedSearch?.beschreibung || '')
        });
      }
    } catch {
      // Ignore broken draft payloads and continue with empty forms.
    }

    setDraftsHydrated(true);
  }, [draftsHydrated, editMode, isOwnProfile, searchDraftKey]);

  useEffect(() => {
    if (!isOwnProfile || !editMode || !searchDraftKey || !draftsHydrated) return;
    if (typeof window === 'undefined') return;

    const hasSearchDraft = Boolean(newSearchForm.titel.trim() || newSearchForm.kategorie.trim() || newSearchForm.beschreibung.trim());
    if (!hasSearchDraft) {
      localStorage.removeItem(searchDraftKey);
      return;
    }

    localStorage.setItem(searchDraftKey, JSON.stringify(newSearchForm));
  }, [draftsHydrated, editMode, isOwnProfile, newSearchForm, searchDraftKey]);

  const handleConnect = async () => {
    if (!profile || viewerUserId <= 0 || isOwnProfile || connectionBusy) return;
    setConnectionBusy(true);
    const res = await sendConnectionRequest({ requesterId: viewerUserId, targetUserId: profile.userId });
    setConnectionBusy(false);
    if (!res.success) {
      alert(res.error || 'Vernetzungsanfrage fehlgeschlagen.');
      return;
    }
    await loadMeta(profile.userId, viewerUserId);
  };

  const handleAcceptConnection = async () => {
    if (!profile || !connection || !connection.id || viewerUserId <= 0 || connectionBusy) return;
    setConnectionBusy(true);
    const res = await respondToConnectionRequest({ requestId: Number(connection.id), responderId: viewerUserId, accept: true });
    setConnectionBusy(false);
    if (!res.success) {
      alert(res.error || 'Anfrage konnte nicht angenommen werden.');
      return;
    }
    await loadMeta(profile.userId, viewerUserId);
  };

  const handleSaveProfile = async () => {
    if (!profile || !isOwnProfile || editBusy) return;
    setEditBusy(true);

    const nextProfilData = {
      profilbild_url: editForm.profilbildUrl,
      profilbild_position_x: clampPercent(Number(editForm.profilbildPositionX), 50),
      profilbild_position_y: clampPercent(Number(editForm.profilbildPositionY), 50),
      profilbild_zoom: clampZoom(Number(editForm.profilbildZoom), 1),
      freitextBeschreibung: editForm.description,
      website: editForm.website,
    };

    try {
      const res = profile.role === 'experte'
        ? await saveExpertProfileData(profile.userId, {
            name: editForm.name,
            ort: editForm.ort,
            plz: editForm.plz,
            angebote: editCategories,
            zertifikate: editCertificates,
            angebotText: editForm.mainText,
            ...nextProfilData
          })
        : await saveUserProfileData(profile.userId, {
            profilName: editForm.name,
            ort: editForm.ort,
            plz: editForm.plz,
            kategorien: profile.kategorien,
            zertifikate: editCertificates,
            sucheText: editForm.mainText,
            ...nextProfilData
          });

      if (!res.success) {
        alert(res.error || 'Profil konnte nicht gespeichert werden.');
        return;
      }

      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          name: editForm.name,
          ort: editForm.ort,
          plz: editForm.plz,
          kategorien: prev.role === 'experte' ? editCategories : prev.kategorien,
          zertifikate: editCertificates,
          angebotText: prev.role === 'experte' ? editForm.mainText : prev.angebotText,
          sucheText: prev.role === 'nutzer' ? editForm.mainText : prev.sucheText,
          profilData: {
            ...(prev.profilData || {}),
            profilbild_url: editForm.profilbildUrl,
            profilbild_position_x: clampPercent(Number(editForm.profilbildPositionX), 50),
            profilbild_position_y: clampPercent(Number(editForm.profilbildPositionY), 50),
            profilbild_zoom: clampZoom(Number(editForm.profilbildZoom), 1),
            freitextBeschreibung: editForm.description,
            website: editForm.website,
            verifizierteZertifikate: Array.isArray(prev.profilData?.verifizierteZertifikate) ? prev.profilData.verifizierteZertifikate : []
          }
        };
      });

      sessionStorage.setItem('userName', editForm.name || viewerName);
      setViewerName(editForm.name || viewerName);

      const refreshedRes = await getStoredProfileData(profile.userId);
      if (refreshedRes.success && refreshedRes.data) {
        const row = refreshedRes.data;
        const profilData = {
          ...(row.profil_data || {}),
          gesuche: row.gesuche || row.profil_data?.gesuche || []
        };
        setProfile((prev) => ({
          role: row.role === 'experte' ? 'experte' : 'nutzer',
          userId: profile.userId,
          name: row.display_name || `${profilData.vorname || ''} ${profilData.nachname || ''}`.trim() || prev?.name || editForm.name,
          ort: row.ort || '',
          plz: row.plz || '',
          verifiziert: Boolean(row.user_verifiziert ?? row.verifiziert),
          kategorien: Array.isArray(row.kategorien) ? row.kategorien : [],
          zertifikate: Array.isArray(row.zertifikate) ? row.zertifikate : [],
          angebotText: row.angebot_text || '',
          sucheText: row.suche_text || '',
          profilData
        }));
      }

      setEditMode(false);
    } catch {
      alert('Speichern fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setEditBusy(false);
    }
  };

  const handleCancelEdit = () => {
    if (!profile) return;
    const profilbildUrl = String(profile.profilData?.profilbild_url || '').trim();
    const description = String(profile.profilData?.freitextBeschreibung || profile.profilData?.profilBeschreibung || '').trim();
    const website = String(profile.profilData?.website || '').trim();
    setEditForm({
      name: profile.name || '',
      ort: profile.ort || '',
      plz: profile.plz || '',
      mainText: profile.role === 'experte' ? (profile.angebotText || '') : (profile.sucheText || ''),
      description,
      profilbildUrl,
      website,
      profilbildPositionX: clampPercent(Number(profile.profilData?.profilbild_position_x), 50),
      profilbildPositionY: clampPercent(Number(profile.profilData?.profilbild_position_y), 50),
      profilbildZoom: clampZoom(Number(profile.profilData?.profilbild_zoom), 1),
    });
    setEditCategories(Array.isArray(profile.kategorien) ? profile.kategorien : []);
    setEditCertificates(Array.isArray(profile.zertifikate) ? profile.zertifikate : []);
    setNewQualificationInput('');
    setOpenQualificationSection(null);
    setDraftsHydrated(false);
    setEditMode(false);
  };

  const handleUploadProfileImage = async (files: File[]) => {
    if (!profile || !isOwnProfile || files.length === 0) return;

    setUploadingProfileImage(true);

    try {
      const file = files[0];
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await uploadProfileImage(profile.userId, formData);

      if (!uploadRes.success) {
        alert(uploadRes.error || 'Profilbild konnte nicht hochgeladen werden.');
        return;
      }

      console.log('Raw upload URL from server:', uploadRes.url);
      const uploadedUrl = normalizeMediaUrl(String(uploadRes.url || ''));
      console.log('Normalized upload URL:', uploadedUrl);
      
      const persistedRes = await persistProfileImageUrl(profile.userId, uploadedUrl);
      if (!persistedRes.success) {
        alert(persistedRes.error || 'Profilbild konnte nicht gespeichert werden.');
        return;
      }

      console.log('Setting editForm with URL:', uploadedUrl);
      setEditForm((prev) => ({
        ...prev,
        profilbildUrl: uploadedUrl,
        profilbildPositionX: 50,
        profilbildPositionY: 50,
        profilbildZoom: 1
      }));

      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          profilData: {
            ...(prev.profilData || {}),
            profilbild_url: uploadedUrl,
            profilbild_position_x: 50,
            profilbild_position_y: 50,
            profilbild_zoom: 1
          }
        };
      });

      alert('Profilbild erfolgreich hochgeladen!');
    } catch {
      alert('Upload fehlgeschlagen. Bitte Bild verkleinern und erneut versuchen.');
    } finally {
      setUploadingProfileImage(false);
    }
  };

  const applyProfileImagePositionFromPointer = (clientX: number, clientY: number) => {
    if (!isOwnProfile || !editMode || !profileImageFrameRef.current) return;
    const rect = profileImageFrameRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const nextX = clampPercent(((clientX - rect.left) / rect.width) * 100, 50);
    const nextY = clampPercent(((clientY - rect.top) / rect.height) * 100, 50);
    setEditForm((prev) => ({ ...prev, profilbildPositionX: nextX, profilbildPositionY: nextY }));
  };

  const handleProfileImagePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isOwnProfile || !(editMode || imageEditMode) || !profileImagePreviewUrl) return;
    setProfileImageDragActive(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    applyProfileImagePositionFromPointer(event.clientX, event.clientY);
  };

  const handleProfileImagePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!profileImageDragActive) return;
    applyProfileImagePositionFromPointer(event.clientX, event.clientY);
  };

  const handleProfileImagePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    setProfileImageDragActive(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const setContentFeedback = (message: string, error = '') => {
    setContentMessage(message);
    setContentError(error);
  };

  const handlePostMediaUpload = async (files: File[]) => {
    if (!profile || !isOwnProfile || files.length === 0) return;

    setUploadingPostMedia(true);
    setContentError('');

    const nextItems = [...newPostMediaItems];
    const uploadErrors: string[] = [];

    for (const file of files.slice(0, Math.max(0, 8 - newPostMediaItems.length))) {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await uploadNetworkMedia(profile.userId, formData);
      if (uploadRes.success && uploadRes.url) {
        nextItems.push({
          url: String(uploadRes.url),
          type: uploadRes.mediaType === 'video' ? 'video' : 'image'
        });
      } else {
        uploadErrors.push(`${file.name}: ${uploadRes.error || 'Upload fehlgeschlagen.'}`);
      }
    }

    setUploadingPostMedia(false);
    setNewPostMediaItems(nextItems.slice(0, 8));
    if (uploadErrors.length > 0) {
      setContentFeedback('', uploadErrors.slice(0, 2).join(' '));
    }

  };

  const removePostMediaItem = (index: number) => {
    setNewPostMediaItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleOfferMediaUpload = async (files: File[], target: 'title' | 'gallery') => {
    if (!profile || !isOwnProfile || profile.role !== 'experte' || files.length === 0) return;

    setUploadingOfferMedia(true);
    setContentError('');

    const uploadedItems: GalerieItem[] = [];
    const uploadErrors: string[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await uploadNetworkMedia(profile.userId, formData);
      if (uploadRes.success && uploadRes.url) {
        uploadedItems.push({
          url: String(uploadRes.url),
          type: uploadRes.mediaType === 'video' ? 'video' : 'image'
        });
      } else {
        uploadErrors.push(`${file.name}: ${uploadRes.error || 'Upload fehlgeschlagen.'}`);
      }
    }

    setUploadingOfferMedia(false);

    if (uploadedItems.length > 0) {
      setNewOfferForm((prev) => {
        if (target === 'title') {
          const firstImage = uploadedItems.find((item) => item.type === 'image');
          if (firstImage) {
            return { ...prev, titleImageUrl: firstImage.url };
          }
          return prev;
        }

        const nextMediaItems = [...prev.mediaItems, ...uploadedItems].slice(0, 8);
        return { ...prev, mediaItems: nextMediaItems };
      });
    }

    if (uploadErrors.length > 0) {
      setContentFeedback('', uploadErrors.slice(0, 2).join(' '));
    }
  };

  const removeOfferMediaItem = (index: number) => {
    setNewOfferForm((prev) => ({
      ...prev,
      mediaItems: prev.mediaItems.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const refreshProfileCollections = async () => {
    if (!profile) return;
    const [postsRes, teamRes, horsesRes] = await Promise.all([
      getProfilePosts(viewerUserId, profile.userId, 20),
      getExpertTeamMembers(profile.userId),
      getExpertHorses(profile.userId)
    ]);

    if (postsRes.success && Array.isArray(postsRes.posts)) {
      setPosts((postsRes.posts || []).map((post: any) => ({
        id: Number(post.id),
        title: String(post.title || '').trim(),
        content: String(post.content || '').trim(),
        created_at: String(post.created_at || ''),
        media_items: Array.isArray(post.media_items)
          ? post.media_items
              .map((item: any) => ({
                type: String(item?.mediaType || item?.type || 'image') === 'video' ? 'video' : 'image',
                url: normalizeMediaUrl(String(item?.url || '').trim())
              }))
              .filter((item: GalerieItem) => item.url.length > 0)
          : []
      })));
    }
    if (teamRes.success && Array.isArray(teamRes.teamMembers)) {
      setExpertTeamMembers(teamRes.teamMembers as Array<{ id: number; name: string | null; role: string | null; description: string | null; member_user_id: number | null; email: string | null; user_display_name: string | null }>);
    }
    if (horsesRes.success && Array.isArray(horsesRes.horses)) {
      setExpertHorses(horsesRes.horses as Array<{ id: number; name: string | null; breed: string | null; age: number | null; notes: string | null; image_url: string | null }>);
    }
  };

  const getOffersRaw = () => (Array.isArray(profile?.profilData?.angeboteAnzeigen) ? [...profile!.profilData.angeboteAnzeigen] : []);

  const getSearchesRaw = () => {
    const raw = profile?.profilData?.gesuche;
    if (Array.isArray(raw)) return [...raw];
    if (raw && typeof raw === 'object') return Object.values(raw as Record<string, any>);
    return [] as any[];
  };

  const saveOffersRaw = async (rawOffers: any[]) => {
    if (!profile || profile.role !== 'experte') return { success: false, error: 'Nur für Experten verfügbar.' };
    const nextProfilData = {
      ...(profile.profilData || {}),
      angeboteAnzeigen: rawOffers
    };
    const res = await saveExpertProfileData(profile.userId, {
      name: profile.name,
      ort: profile.ort,
      plz: profile.plz,
      angebote: profile.kategorien,
      zertifikate: profile.zertifikate,
      angebotText: profile.angebotText,
      ...nextProfilData
    });

    if (res.success) {
      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          profilData: {
            ...(prev.profilData || {}),
            angeboteAnzeigen: rawOffers
          }
        };
      });
    }

    return res;
  };

  const saveSearchesRaw = async (rawSearches: any[]) => {
    if (!profile || profile.role !== 'nutzer') return { success: false, error: 'Nur für Nutzer verfügbar.' };
    const res = await saveUserProfileData(profile.userId, {
      profilName: profile.name,
      ort: profile.ort,
      plz: profile.plz,
      kategorien: profile.kategorien,
      sucheText: profile.sucheText,
      ...(profile.profilData || {}),
      gesuche: rawSearches
    });

    if (res.success) {
      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          profilData: {
            ...(prev.profilData || {}),
            gesuche: rawSearches
          }
        };
      });
    }

    return res;
  };

  const handleCreatePostInline = async () => {
    if (!profile || !isOwnProfile) return;
    setContentBusy(true);
    setContentFeedback('', '');
    const res = await createNetworkPost({
      userId: profile.userId,
      title: newPostForm.title,
      content: newPostForm.content,
      mediaItems: newPostMediaItems.map((item) => ({
        url: item.url,
        mediaType: item.type
      })),
      postTarget: 'profile'
    });
    setContentBusy(false);
    if (!res.success) {
      setContentFeedback('', res.error || 'Beitrag konnte nicht erstellt werden.');
      return;
    }
    setNewPostForm({ title: '', content: '' });
    setNewPostMediaItems([]);
    if (typeof window !== 'undefined' && postDraftKey) {
      localStorage.removeItem(postDraftKey);
    }
    await refreshProfileCollections();
    setContentFeedback('Beitrag erstellt.', '');
  };

  const handleUpdatePostInline = async () => {
    if (!profile || !isOwnProfile || !editingPostId) return;
    setContentBusy(true);
    setContentFeedback('', '');
    const res = await updateProfilePost({
      userId: profile.userId,
      postId: editingPostId,
      title: editingPostForm.title,
      content: editingPostForm.content
    });
    setContentBusy(false);
    if (!res.success) {
      setContentFeedback('', res.error || 'Beitrag konnte nicht aktualisiert werden.');
      return;
    }
    setEditingPostId(null);
    setEditingPostForm({ title: '', content: '' });
    await refreshProfileCollections();
    setContentFeedback('Beitrag aktualisiert.', '');
  };

  const handleDeletePostInline = async (postId: number) => {
    if (!profile || !isOwnProfile || !confirm('Beitrag wirklich loeschen?')) return;
    setContentBusy(true);
    setContentFeedback('', '');
    const res = await removeProfilePost({ userId: profile.userId, postId });
    setContentBusy(false);
    if (!res.success) {
      setContentFeedback('', res.error || 'Beitrag konnte nicht geloescht werden.');
      return;
    }
    await refreshProfileCollections();
    setContentFeedback('Beitrag geloescht.', '');
  };

  const handleCreateOfferInline = async () => {
    if (!profile || !isOwnProfile || profile.role !== 'experte') return;
    const titel = String(newOfferForm.titel || '').trim();
    const kategorie = String(newOfferForm.kategorie || '').trim();
    const beschreibung = String(newOfferForm.beschreibung || '').trim();
    if (!titel && !kategorie && !beschreibung) {
      setContentFeedback('', 'Bitte mindestens einen Wert für die Anzeige eintragen.');
      return;
    }
    setContentBusy(true);
    setContentFeedback('', '');
    const offers = getOffersRaw();
    offers.unshift({
      id: `angebot-${Date.now()}`,
      titel,
      kategorie,
      beschreibung,
      titleImageUrl: String(newOfferForm.titleImageUrl || '').trim(),
      mediaItems: newOfferForm.mediaItems.map((item) => ({
        url: String(item.url || '').trim(),
        mediaType: item.type === 'video' ? 'video' : 'image'
      })).filter((item) => item.url),
      preise: []
    });
    const res = await saveOffersRaw(offers);
    setContentBusy(false);
    if (!res.success) {
      setContentFeedback('', res.error || 'Anzeige konnte nicht gespeichert werden.');
      return;
    }
    setNewOfferForm({ titel: '', kategorie: '', beschreibung: '', titleImageUrl: '', mediaItems: [] });
    if (typeof window !== 'undefined' && offerDraftKey) {
      localStorage.removeItem(offerDraftKey);
    }
    setContentFeedback('Anzeige gespeichert.', '');
  };

  const handleUpdateOfferInline = async () => {
    if (!profile || !isOwnProfile || profile.role !== 'experte' || !editingOfferId) return;
    setContentBusy(true);
    setContentFeedback('', '');
    const offers = getOffersRaw().map((item: any) => {
      if (String(item?.id || '') !== editingOfferId) return item;
      return {
        ...item,
        titel: editingOfferForm.titel,
        kategorie: editingOfferForm.kategorie,
        beschreibung: editingOfferForm.beschreibung
      };
    });
    const res = await saveOffersRaw(offers);
    setContentBusy(false);
    if (!res.success) {
      setContentFeedback('', res.error || 'Anzeige konnte nicht aktualisiert werden.');
      return;
    }
    setEditingOfferId(null);
    setEditingOfferForm({ titel: '', kategorie: '', beschreibung: '' });
    setContentFeedback('Anzeige aktualisiert.', '');
  };

  const handleDeleteOfferInline = async (offerId: string) => {
    if (!profile || !isOwnProfile || profile.role !== 'experte' || !confirm('Anzeige wirklich loeschen?')) return;
    setContentBusy(true);
    setContentFeedback('', '');
    const offers = getOffersRaw().filter((item: any) => String(item?.id || '') !== offerId);
    const res = await saveOffersRaw(offers);
    setContentBusy(false);
    if (!res.success) {
      setContentFeedback('', res.error || 'Anzeige konnte nicht geloescht werden.');
      return;
    }
    setContentFeedback('Anzeige geloescht.', '');
  };

  const handleCreateSearchInline = async () => {
    if (!profile || !isOwnProfile || profile.role !== 'nutzer') return;
    const titel = String(newSearchForm.titel || '').trim();
    const kategorie = String(newSearchForm.kategorie || '').trim();
    const beschreibung = String(newSearchForm.beschreibung || '').trim();
    if (!titel && !kategorie && !beschreibung) {
      setContentFeedback('', 'Bitte mindestens einen Wert für die Suche eintragen.');
      return;
    }
    setContentBusy(true);
    setContentFeedback('', '');
    const searches = getSearchesRaw();
    searches.unshift({ id: `gesuch-${Date.now()}`, titel, kategorie, beschreibung, visibility: 'public', viewsCount: 0 });
    const res = await saveSearchesRaw(searches);
    setContentBusy(false);
    if (!res.success) {
      setContentFeedback('', res.error || 'Suche konnte nicht gespeichert werden.');
      return;
    }
    setNewSearchForm({ titel: '', kategorie: '', beschreibung: '' });
    if (typeof window !== 'undefined' && searchDraftKey) {
      localStorage.removeItem(searchDraftKey);
    }
    setContentFeedback('Suche gespeichert.', '');
  };

  const handleUpdateSearchInline = async () => {
    if (!profile || !isOwnProfile || profile.role !== 'nutzer' || !editingSearchId) return;
    setContentBusy(true);
    setContentFeedback('', '');
    const searches = getSearchesRaw().map((item: any) => {
      if (String(item?.id || '') !== editingSearchId) return item;
      return {
        ...item,
        titel: editingSearchForm.titel,
        kategorie: editingSearchForm.kategorie,
        beschreibung: editingSearchForm.beschreibung
      };
    });
    const res = await saveSearchesRaw(searches);
    setContentBusy(false);
    if (!res.success) {
      setContentFeedback('', res.error || 'Suche konnte nicht aktualisiert werden.');
      return;
    }
    setEditingSearchId(null);
    setEditingSearchForm({ titel: '', kategorie: '', beschreibung: '' });
    setContentFeedback('Suche aktualisiert.', '');
  };

  const handleDeleteSearchInline = async (searchId: string) => {
    if (!profile || !isOwnProfile || profile.role !== 'nutzer' || !confirm('Suche wirklich loeschen?')) return;
    setContentBusy(true);
    setContentFeedback('', '');
    const searches = getSearchesRaw().filter((item: any) => String(item?.id || '') !== searchId);
    const res = await saveSearchesRaw(searches);
    setContentBusy(false);
    if (!res.success) {
      setContentFeedback('', res.error || 'Suche konnte nicht geloescht werden.');
      return;
    }
    if (editingSearchId === searchId) {
      setEditingSearchId(null);
      setEditingSearchForm({ titel: '', kategorie: '', beschreibung: '' });
    }
    setContentFeedback('Suche geloescht.', '');
  };

  const handleToggleOfferWishlist = async (angebot: {
    id: string;
    titel: string;
    kategorie: string;
    beschreibung: string;
  }) => {
    if (!profile || isOwnProfile) return;
    if (viewerUserId <= 0) {
      window.location.href = '/login';
      return;
    }

    const offerId = String(angebot.id || '').trim();
    if (!offerId) return;

    const currentlyWishlisted = wishlistedOfferIdSet.has(offerId);
    setOfferActionBusyId(offerId);
    const res = await toggleProfileOfferWishlist({
      viewerUserId,
      profileUserId: profile.userId,
      offerId,
      offerTitle: angebot.titel,
      offerCategory: angebot.kategorie,
      offerDescription: angebot.beschreibung,
      profileOrt: profile.ort,
      profilePlz: profile.plz,
      enable: !currentlyWishlisted
    });
    setOfferActionBusyId(null);

    if (!res.success) {
      alert(res.error || 'Merkliste konnte nicht aktualisiert werden.');
      return;
    }

  setWishlistedOfferIds((prev: string[]) => {
  // Sicherstellen, dass offerId ein String ist, da der State string[] erwartet
  const targetId = String(offerId);

  if (res.wishlisted) {
    // Falls noch nicht vorhanden, hinzufügen
    return prev.includes(targetId) ? prev : [...prev, targetId];
  }
  
  // Entfernen: Hier definieren wir 'id' explizit als string, um den Fehler zu vermeiden
  return prev.filter((id: string) => id !== targetId);
});

    if (typeof res.wishlistCount === 'number') {
      setProfile((prev) => {
        if (!prev) return prev;
        const rawOffers = Array.isArray(prev.profilData?.angeboteAnzeigen) ? prev.profilData.angeboteAnzeigen : [];
        if (rawOffers.length === 0) return prev;
        const nextOffers = rawOffers.map((item: any) => {
          if (String(item?.id || '') !== offerId) return item;
          return {
            ...item,
            wishlistCount: Math.max(0, Number(res.wishlistCount || 0))
          };
        });
        return {
          ...prev,
          profilData: {
            ...(prev.profilData || {}),
            angeboteAnzeigen: nextOffers
          }
        };
      });
    }
  };


  const handleCreateTeamInline = async () => {
    if (!profile || !isOwnProfile || profile.role !== 'experte') return;
    const memberUserId = Number(newTeamForm.memberUserId);
    if (!Number.isInteger(memberUserId) || memberUserId <= 0) {
      setContentFeedback('', 'Bitte eine gültige Profil-ID zum Verlinken eingeben.');
      return;
    }

    setContentBusy(true);
    setContentFeedback('', '');
    const res = await addExpertTeamMember(profile.userId, {
      name: '',
      memberUserId
    });
    setContentBusy(false);
    if (!res.success) {
      setContentFeedback('', res.error || 'Teammitglied konnte nicht hinzugefuegt werden.');
      return;
    }
    setNewTeamForm({ memberUserId: '', inviteEmail: '' });
    await refreshProfileCollections();
    setContentFeedback('Profil erfolgreich als Teammitglied verlinkt.', '');
  };

  const getTeamRegisterLink = () => {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const emailQuery = newTeamForm.inviteEmail.trim() ? `?email=${encodeURIComponent(newTeamForm.inviteEmail.trim())}` : '';
    return `${base}/registrieren${emailQuery}`;
  };

  const copyTeamRegisterLink = async () => {
    const link = getTeamRegisterLink();
    try {
      await navigator.clipboard.writeText(link);
      setContentFeedback('Registrierungslink in die Zwischenablage kopiert.', '');
    } catch {
      setContentFeedback('', 'Registrierungslink konnte nicht kopiert werden.');
    }
  };

  const shareProfileLink = async () => {
    if (!profile) return;
    const profileUrl = `${window.location.origin}/profil/${profile.userId}`;
    try {
      await navigator.clipboard.writeText(profileUrl);
      if (viewerUserId > 0) {
        await trackInteractionShare({
          sourceType: 'profil',
          sourceId: String(profile.userId),
          ownerUserId: profile.userId,
          sharedByUserId: viewerUserId,
          channel: 'link'
        });
      }
      setContentFeedback('Profil-Link kopiert.', '');
    } catch {
      window.prompt('Profil-Link manuell kopieren:', profileUrl);
    }
  };

  const shareOfferLink = async (offerId: string) => {
    if (!profile) return;
    const safeOfferId = String(offerId || '').trim();
    if (!safeOfferId) return;

    const offerUrl = `${window.location.origin}/anzeige/${profile.userId}/${encodeURIComponent(safeOfferId)}`;
    try {
      await navigator.clipboard.writeText(offerUrl);
      if (viewerUserId > 0) {
        await trackInteractionShare({
          sourceType: 'anzeige',
          sourceId: safeOfferId,
          ownerUserId: profile.userId,
          sharedByUserId: viewerUserId,
          channel: 'link'
        });
      }
      setContentFeedback('Anzeige-Link kopiert.', '');
    } catch {
      window.prompt('Anzeige-Link manuell kopieren:', offerUrl);
    }
  };

  const openOfferDetail = (offerId: string, mode?: 'view' | 'edit') => {
    if (!profile) return;
    const safeOfferId = String(offerId || '').trim();
    if (!safeOfferId) return;
    const query = mode === 'edit' ? '?mode=edit' : '';
    router.push(`/profil/${profile.userId}/detail/angebote/${encodeURIComponent(safeOfferId)}${query}`);
  };

  const openPostDetail = (postId: number | string, mode?: 'view' | 'edit' | 'new') => {
    if (!profile) return;
    const safePostId = String(postId || '').trim();
    if (!safePostId) return;
    const query = mode === 'edit' ? '?mode=edit' : mode === 'new' ? '?mode=new' : '';
    router.push(`/profil/${profile.userId}/detail/beitraege/${encodeURIComponent(safePostId)}${query}`);
  };

  const openCreateOfferPage = () => {
    if (!profile) return;
    router.push(`/profil/${profile.userId}/detail/angebote/new?mode=new`);
  };

  const openCreatePostPage = () => {
    if (!profile) return;
    router.push(`/profil/${profile.userId}/detail/beitraege/new?mode=new`);
  };

  const sendTeamRegisterLinkByMail = () => {
    const email = newTeamForm.inviteEmail.trim();
    if (!email) {
      setContentFeedback('', 'Bitte zuerst eine E-Mail für den Versand eintragen.');
      return;
    }
    const link = getTeamRegisterLink();
    const subject = encodeURIComponent('Einladung zur Registrierung bei Equily');
    const body = encodeURIComponent(`Hallo,\n\nbitte registriere dich hier bei Equily:\n${link}\n\nViele Grüße`);
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
  };

  const handleDeleteTeamInline = async (teamId: number) => {
    if (!profile || !isOwnProfile || profile.role !== 'experte' || !confirm('Teammitglied wirklich entfernen?')) return;
    setContentBusy(true);
    setContentFeedback('', '');
    const res = await removeExpertTeamMember(profile.userId, teamId);
    setContentBusy(false);
    if (!res.success) {
      setContentFeedback('', res.error || 'Teammitglied konnte nicht entfernt werden.');
      return;
    }
    await refreshProfileCollections();
    setContentFeedback('Teammitglied entfernt.', '');
  };

  const handleUploadHorseImage = async (file: File, mode: 'new' | 'edit') => {
    if (!profile || !isOwnProfile || profile.role !== 'experte') return;

    setContentBusy(true);
    setContentFeedback('', '');

    const formData = new FormData();
    formData.append('file', file);
    const uploadRes = await uploadProfileHorseImage(profile.userId, profile.role, formData);

    setContentBusy(false);
    if (!uploadRes.success || !uploadRes.url) {
      setContentFeedback('', uploadRes.error || 'Pferdebild konnte nicht hochgeladen werden.');
      return;
    }

    if (mode === 'new') {
      setNewHorseForm((prev) => ({ ...prev, imageUrl: uploadRes.url as string }));
    } else {
      setEditingHorseForm((prev) => ({ ...prev, imageUrl: uploadRes.url as string }));
    }
    setContentFeedback('Pferdebild erfolgreich hochgeladen.', '');
  };

  const handleCreateHorseInline = async () => {
    if (!profile || !isOwnProfile || profile.role !== 'experte') return;
    setContentBusy(true);
    setContentFeedback('', '');
    const res = await addExpertHorse(profile.userId, {
      name: newHorseForm.name,
      breed: newHorseForm.breed || undefined,
      age: newHorseForm.age ? Number(newHorseForm.age) : undefined,
      notes: newHorseForm.notes || undefined,
      imageUrl: newHorseForm.imageUrl || undefined
    });
    setContentBusy(false);
    if (!res.success) {
      setContentFeedback('', res.error || 'Lehrpferd konnte nicht gespeichert werden.');
      return;
    }
    setNewHorseForm({ name: '', breed: '', age: '', notes: '', imageUrl: '' });
    await refreshProfileCollections();
    setContentFeedback('Lehrpferd gespeichert.', '');
  };

  const handleUpdateHorseInline = async () => {
    if (!profile || !isOwnProfile || profile.role !== 'experte' || !editingHorseId) return;
    setContentBusy(true);
    setContentFeedback('', '');
    const res = await updateExpertHorse(profile.userId, editingHorseId, {
      name: editingHorseForm.name,
      breed: editingHorseForm.breed,
      age: editingHorseForm.age ? Number(editingHorseForm.age) : undefined,
      notes: editingHorseForm.notes,
      imageUrl: editingHorseForm.imageUrl
    });
    setContentBusy(false);
    if (!res.success) {
      setContentFeedback('', res.error || 'Lehrpferd konnte nicht aktualisiert werden.');
      return;
    }
    setEditingHorseId(null);
    setEditingHorseForm({ name: '', breed: '', age: '', notes: '', imageUrl: '' });
    await refreshProfileCollections();
    setContentFeedback('Lehrpferd aktualisiert.', '');
  };

  const handleDeleteHorseInline = async (horseId: number) => {
    if (!profile || !isOwnProfile || profile.role !== 'experte' || !confirm('Lehrpferd wirklich entfernen?')) return;
    setContentBusy(true);
    setContentFeedback('', '');
    const res = await removeExpertHorse(profile.userId, horseId);
    setContentBusy(false);
    if (!res.success) {
      setContentFeedback('', res.error || 'Lehrpferd konnte nicht entfernt werden.');
      return;
    }
    await refreshProfileCollections();
    setContentFeedback('Lehrpferd entfernt.', '');
  };

  const openEditSection = (target: 'beitraege' | 'anzeigen' | 'team' | 'lehrpferde') => {
    if (target === 'beitraege') {
      window.location.href = '/netzwerk';
      return;
    }
    if (target === 'anzeigen') {
      window.location.href = '/inserieren';
      return;
    }
    if (target === 'team') {
      window.location.href = '/dashboard/experte/team';
      return;
    }
    window.location.href = '/dashboard/experte/pferde';
  };

  const handleRateProfile = async () => {
    if (!profile || viewerUserId <= 0 || isOwnProfile || ratingBusy) return;
    if (ratingValue <= 2 && ratingComment.trim().length < 10) {
      alert('Bitte bei 1-2 Sternen einen kurzen Grund angeben (mindestens 10 Zeichen).');
      return;
    }
    if (hasPublicExpertAds && !ratingOfferId) {
      alert('Bitte zuerst das wahrgenommene Angebot auswählen.');
      return;
    }

    const selectedOffer = visibleAngebotCards.find((item) => item.id === ratingOfferId);

    setRatingBusy(true);
    const res = await rateUser({
      raterUserId: viewerUserId,
      ratedUserId: profile.userId,
      rating: ratingValue,
      comment: ratingComment,
      offerId: hasPublicExpertAds ? ratingOfferId : undefined,
      offerTitle: hasPublicExpertAds ? (selectedOffer?.titel || selectedOffer?.kategorie || 'Angebot') : undefined
    });
    setRatingBusy(false);

    if (!res.success) {
      alert(res.error || 'Bewertung konnte nicht gespeichert werden.');
      return;
    }

    setRatingComment('');
    await loadMeta(profile.userId, viewerUserId);
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
    return <div className="min-h-screen bg-[#F8FAFC] p-10 text-sm font-bold text-slate-500">Profil wird geladen...</div>;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-10 space-y-2">
        <p className="text-sm font-bold text-slate-500">Profil nicht gefunden.</p>
        {loadError && <p className="text-xs font-bold text-red-600">{loadError}</p>}
      </div>
    );
  }

  if (!isOwnProfile && !isPublicProfile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-6 md:p-10">
        <div className="max-w-4xl mx-auto bg-white rounded-[2rem] border border-slate-100 p-10 shadow-sm text-center space-y-4">
          <ShieldCheck className="mx-auto text-slate-400" size={28} />
          <h1 className="text-xl font-black uppercase italic text-slate-900">Dieses Profil ist privat</h1>
          <p className="text-sm text-slate-500">Dieses Profil ist derzeit nicht öffentlich sichtbar.</p>
          <Link href="/suche" className="inline-flex px-4 py-2 rounded-xl bg-slate-100 text-xs font-black uppercase tracking-widest text-slate-700">
            Zurück zur Suche
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
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
        {viewerUserId > 0 && (
          <button onClick={handleLogout} className="mt-auto p-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">Abmelden</button>
        )}
      </aside>

      <LoggedInHeader
        userId={viewerUserId > 0 ? viewerUserId : null}
        role={viewerRole}
        userName={viewerName}
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenProfile={openProfile}
      />

      <div className="p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <section className="bg-white rounded-[2rem] border border-slate-100 p-6 md:p-8 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
            <div className="space-y-4">
              <div className="aspect-square rounded-3xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center relative group">
                {profileImagePreviewUrl && (profileImagePreviewUrl.length > 0) ? (
                  <div
                    ref={profileImageFrameRef}
                    className="w-full h-full relative"
                  >
                    <img 
                      src={profileImagePreviewUrl} 
                      alt="Profilbild" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error('Image failed to load:', profileImagePreviewUrl);
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                      onLoad={() => {
                        console.log('Image loaded successfully:', profileImagePreviewUrl);
                      }}
                      onLoadStart={() => {
                        console.log('Image loading started:', profileImagePreviewUrl);
                      }}
                    />
                    {isOwnProfile && imageEditMode && (
                      <>
                        <div className="absolute inset-3 rounded-2xl border-2 border-emerald-400/90 shadow-[inset_0_0_0_9999px_rgba(15,23,42,0.22)] pointer-events-none" />
                        <p className="absolute left-2 right-2 bottom-2 text-center text-[9px] font-black uppercase tracking-widest text-white bg-black/50 rounded-lg px-2 py-1 pointer-events-none">
                          Rahmen zeigt den öffentlichen Ausschnitt
                        </p>
                      </>
                    )}

                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-center">
                    <div className="space-y-2">
                      <User size={64} className="text-slate-300 mx-auto" />
                      <p className="text-[10px] text-slate-400 font-medium">Kein Profilbild</p>
                    </div>
                  </div>
                )}
              </div>
              {isOwnProfile && imageEditMode && (
                <div className="mt-3 space-y-3">
                  <MediaDropzone
                    title="Profilbild hochladen"
                    description="Ziehe ein Bild hierher oder wähle eine Datei aus."
                    accept="image/*"
                    multiple={false}
                    disabled={uploadingProfileImage}
                    buttonLabel="Profilbild auswählen"
                    busyLabel="Lade Profilbild..."
                    onFiles={handleUploadProfileImage}
                    className="rounded-2xl border border-slate-200 bg-white p-3"
                  />
                </div>
              )}
              {isOwnProfile && editMode && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {uploadingProfileImage ? 'Wird hochgeladen...' : 'Bild hier einfügen'}
                  </p>
                  <MediaDropzone
                    title="Profilbild hochladen"
                    description="Datei auswählen"
                    accept="image/*"
                    multiple={false}
                    disabled={uploadingProfileImage}
                    buttonLabel="Profilbild auswählen"
                    busyLabel="Lade Profilbild..."
                    onFiles={handleUploadProfileImage}
                    className="rounded-2xl border border-slate-200 bg-white p-3"
                  />
                </div>
              )}
              {galerieItems.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {galerieItems.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setLightboxItem(item)}
                      className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative hover:opacity-80 transition-opacity"
                    >
                      {item.type === 'image' ? (
                        <img src={normalizeMediaUrl(String(item.url).trim())} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="relative w-full h-full">
                          <video src={normalizeMediaUrl(String(item.url).trim())} className="w-full h-full object-cover" muted preload="metadata" playsInline />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent flex items-center justify-center">
                            <span className="w-7 h-7 rounded-full bg-black/60 border border-white/50 text-white flex items-center justify-center">
                              <Play size={12} fill="currentColor" />
                            </span>
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
                <div>
                  {isOwnProfile && editMode ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Name"
                        className="w-full md:max-w-xl px-4 py-3 rounded-xl border border-slate-200 bg-white text-xl md:text-2xl font-black italic uppercase leading-[0.95] text-slate-900"
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:max-w-xl">
                        <input
                          type="text"
                          value={editForm.plz}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, plz: e.target.value }))}
                          placeholder="PLZ"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold"
                        />
                        <input
                          type="text"
                          value={editForm.ort}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, ort: e.target.value }))}
                          placeholder="Ort"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold"
                        />
                      </div>
                    </div>
                  ) : (
                    <h1 className="text-3xl md:text-4xl font-black italic uppercase leading-[0.95] text-slate-900">{profile.name}</h1>
                  )}
                  <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {isOwnProfile ? 'Bearbeitungsansicht' : 'Besucheransicht'} · {profile.role === 'experte' ? 'Expertenprofil' : 'Nutzerprofil'}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase ${profile.verifiziert ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {profile.verifiziert ? 'Verifiziert' : 'Wartet auf Prüfung'}
                    </span>
                    <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-100">
                      Bewertung {safeToFixed(stats.ratingAvg, 1)} ({stats.ratingCount})
                    </span>
                  </div>
                  {(has(profile.plz) || has(profile.ort)) && (
                    <p className="mt-3 text-[11px] font-bold text-slate-500 flex items-center gap-2">
                      <MapPin size={14} className="text-emerald-600" /> {profile.plz} {profile.ort}
                    </p>
                  )}
                  {websiteHref && (
                    <p className="mt-2 text-[11px] font-bold text-slate-500 break-all">
                      <a href={websiteHref} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">
                        {websiteRaw}
                      </a>
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={shareProfileLink}
                    className="px-4 py-3 rounded-xl text-[10px] font-black uppercase bg-white text-slate-700 border border-slate-200 inline-flex items-center gap-2"
                  >
                    <Share2 size={13} /> Link teilen
                  </button>
                  {isOwnProfile ? (
                    <>
                      {!editMode ? (
                        <button
                          type="button"
                          onClick={() => setEditMode(true)}
                          className="px-6 py-3 rounded-xl text-[10px] font-black uppercase bg-[#6E745A] text-white hover:brightness-95 transition"
                        >
                          Profil bearbeiten
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={handleSaveProfile}
                            disabled={editBusy}
                            className="px-6 py-3 rounded-xl text-[10px] font-black uppercase bg-emerald-600 text-white disabled:opacity-60"
                          >
                            {editBusy ? 'Speichert...' : 'Speichern'}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={editBusy}
                            className="px-6 py-3 rounded-xl text-[10px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-200 disabled:opacity-60"
                          >
                            Zur Ansicht
                          </button>
                        </>
                      )}
                    </>
                  ) : viewerUserId <= 0 ? (
                    <Link href="/login" className="px-6 py-3 rounded-xl text-[10px] font-black uppercase bg-slate-900 text-white">
                      Zum Vernetzen einloggen
                    </Link>
                  ) : connection?.status === 'accepted' ? (
                    <button type="button" disabled className="px-6 py-3 rounded-xl text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 border border-emerald-200">
                      Vernetzt
                    </button>
                  ) : connection?.status === 'pending' && Number(connection.requester_user_id) === viewerUserId ? (
                    <button type="button" disabled className="px-6 py-3 rounded-xl text-[10px] font-black uppercase bg-amber-100 text-amber-700 border border-amber-200">
                      Anfrage gesendet
                    </button>
                  ) : connection?.status === 'pending' && Number(connection.requester_user_id) === profile.userId ? (
                    <button
                      type="button"
                      onClick={handleAcceptConnection}
                      disabled={connectionBusy}
                      className="px-6 py-3 rounded-xl text-[10px] font-black uppercase bg-emerald-600 text-white disabled:opacity-60"
                    >
                      {connectionBusy ? 'Lädt...' : 'Anfrage annehmen'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnect}
                      disabled={connectionBusy}
                      className="px-6 py-3 rounded-xl text-[10px] font-black uppercase bg-slate-900 text-white disabled:opacity-60"
                    >
                      {connectionBusy ? 'Lädt...' : 'Folgen / Vernetzen'}
                    </button>
                  )}
                  {!isOwnProfile && viewerUserId > 0 && (
                    <button
                      type="button"
                      onClick={openReportDialog}
                      className="px-6 py-3 rounded-xl text-[10px] font-black uppercase bg-white text-red-600 border border-red-200"
                    >
                      Profil melden
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Follower</p>
                  <p className="text-sm font-black text-slate-900 mt-1">{stats.followerCount}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Gefolgt</p>
                  <p className="text-sm font-black text-slate-900 mt-1">{stats.followingCount}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Gruppenhost</p>
                  <p className="text-sm font-black text-slate-900 mt-1">{stats.groupHostCount}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Gruppenmitglied</p>
                  <p className="text-sm font-black text-slate-900 mt-1">{stats.groupMemberCount}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Bewertung</p>
                  <p className="text-sm font-black text-amber-900 mt-1">{safeToFixed(stats.ratingAvg, 1)} ({stats.ratingCount})</p>
                </div>
              </div>

              {isOwnProfile && editMode && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Profil-Inhalt</p>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                    rows={5}
                    placeholder="Allgemeine Informationen bearbeiten"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
                  />
                  {profile.role !== 'experte' && (
                    <textarea
                      value={editForm.mainText}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, mainText: e.target.value }))}
                      rows={4}
                      placeholder="Suchtext bearbeiten"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
                    />
                  )}
                  <input
                    type="url"
                    value={editForm.website}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, website: e.target.value }))}
                    placeholder="Eigene Website (https://...)"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
                  />
                  {profile.role === 'experte' && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Kategorien</p>
                      <div className="flex flex-wrap gap-2">
                        {EXPERT_PROFILE_CATEGORIES.map((label) => {
                          const active = editCategories.includes(label);
                          return (
                            <button
                              key={`edit-cat-${label}`}
                              type="button"
                              onClick={() => setEditCategories((prev) => prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label])}
                              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border ${active ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Qualifikationen & Zertifikate</p>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{editCertificates.length} gewählt</span>
                    </div>

                    <div className="flex flex-col md:flex-row gap-2">
                      <input
                        type="text"
                        value={newQualificationInput}
                        onChange={(e) => setNewQualificationInput(e.target.value)}
                        placeholder="Eigene Qualifikation hinzufügen"
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
                      />
                      <button
                        type="button"
                        onClick={addCustomQualification}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white"
                      >
                        <Plus size={14} /> Hinzufügen
                      </button>
                    </div>

                    {editCertificates.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {editCertificates.map((item) => {
                          const verified = verifiedQualificationSet.has(item);
                          return (
                            <span
                              key={`selected-cert-${item}`}
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase border ${verified ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                            >
                              {verified && <CheckCircle2 size={12} />}
                              {item}
                              <button type="button" onClick={() => removeQualification(item)} className="ml-1 text-slate-400 hover:text-slate-700">
                                <X size={12} />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <div className="space-y-2">
                      {qualificationGroups.map((group) => (
                        <div key={group.groupName} className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setOpenQualificationSection((prev) => (prev === group.groupName ? null : group.groupName))}
                            className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left ${openQualificationSection === group.groupName ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700'}`}
                          >
                            <span className="text-[11px] font-black uppercase tracking-widest">{group.groupName}</span>
                            {openQualificationSection === group.groupName ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>

                          {openQualificationSection === group.groupName && (
                            <div className="p-4 bg-white">
                              <div className="flex flex-wrap gap-2">
                                {group.tokens.map((token) => {
                                  const active = editCertificates.includes(token);
                                  const verified = verifiedQualificationSet.has(token);
                                  return (
                                    <button
                                      key={`${group.groupName}-${token}`}
                                      type="button"
                                      onClick={() => toggleQualification(token)}
                                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase border ${active ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-500'}`}
                                    >
                                      {verified && <CheckCircle2 size={12} />}
                                      {token}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <p className="text-[10px] font-medium text-slate-400">
                      Verifiziert wird die Liste im Adminbereich. Hier pflegst du nur deine Angaben und Nachweise.
                    </p>
                  </div>
                </div>
              )}

              {profile && !(isOwnProfile && editMode) && (generalInfoText || expertCategoryBadges.length > 0 || (Array.isArray(profile.zertifikate) && profile.zertifikate.length > 0) || verifiedQualificationSet.size > 0) && (
                <div className="space-y-3">
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Allgemeine Informationen</h2>
                  {generalInfoText ? (
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{generalInfoText}</p>
                  ) : (
                    <p className="text-sm text-slate-400">Noch keine Beschreibung hinterlegt.</p>
                  )}

                  {expertCategoryBadges.length > 0 && (
                    <div className="pt-2 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Kategorien</p>
                      <div className="flex flex-wrap gap-2">
                        {expertCategoryBadges.map((item) => (
                          <span
                            key={item.label}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border ${item.selected ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                          >
                            {item.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {Array.isArray(profile.zertifikate) && profile.zertifikate.length > 0 && (
                    <div className="pt-2 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Qualifikationen</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.zertifikate.map((item) => {
                          const verified = verifiedQualificationSet.has(item);
                          return (
                            <span
                              key={`public-cert-${item}`}
                              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase border ${verified ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                            >
                              {verified && <CheckCircle2 size={12} />}
                              {item}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {verifiedQualificationSet.size > 0 && (
                    <div className="pt-2 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Verifizierte Nachweise</p>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(verifiedQualificationSet).map((item) => (
                          <span key={`verified-cert-${item}`} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase border bg-emerald-50 border-emerald-200 text-emerald-700">
                            <CheckCircle2 size={12} />
                            {item}
                          </span>
                        ))}
                      </div>
                      <p className="text-[10px] font-medium text-slate-400">Die Freigabe erfolgt durch die Admin-Verifizierung.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {reportDialogOpen && !isOwnProfile && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <button type="button" aria-label="Dialog schließen" onClick={() => setReportDialogOpen(false)} className="absolute inset-0 bg-slate-900/40" />
            <div className="relative w-full max-w-lg bg-white rounded-[2rem] border border-slate-200 shadow-2xl p-6 space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Melden</p>
                <h3 className="mt-2 text-xl font-black italic uppercase text-slate-900">Profil melden</h3>
              </div>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                rows={4}
                placeholder="Grund angeben"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
              />
              {reportError && <p className="text-sm font-bold text-red-600">{reportError}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setReportDialogOpen(false)} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-200 text-slate-600">
                  Abbrechen
                </button>
                <button type="button" onClick={confirmProfileReport} disabled={reportBusy} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-red-600 text-white disabled:opacity-60">
                  {reportBusy ? 'Sende...' : 'Melden'}
                </button>
              </div>
            </div>
          </div>
        )}

        {galerieItems.length > 0 && (
          <section className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Galerie</p>
                <h2 className="mt-2 text-xl font-black italic uppercase tracking-tight text-slate-900">Einblicke ins Profil</h2>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{galerieItems.length} Datei{galerieItems.length !== 1 ? 'en' : ''}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {galerieItems.map((item, idx) => (
                <button
                  key={`gallery-card-${idx}`}
                  type="button"
                  onClick={() => setLightboxItem(item)}
                  className="group relative aspect-square overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-100 text-left"
                >
                  {item.type === 'image' ? (
                    <img src={normalizeMediaUrl(String(item.url).trim())} alt={`Galerie ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  ) : (
                    <div className="relative w-full h-full">
                      <video src={normalizeMediaUrl(String(item.url).trim())} className="w-full h-full object-cover" muted preload="metadata" playsInline />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent flex items-center justify-center">
                        <span className="w-12 h-12 rounded-full bg-black/65 border border-white/40 text-white flex items-center justify-center">
                          <Play size={18} fill="currentColor" />
                        </span>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="bg-white rounded-[1.5rem] border border-slate-100 p-3 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button type="button" onClick={() => setActiveTab('beitraege')} className={`px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition ${activeTab === 'beitraege' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
              Beiträge
            </button>
            {profile.role === 'experte' ? (
              <button type="button" onClick={() => setActiveTab('anzeigen')} className={`px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition ${activeTab === 'anzeigen' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                Angebote
              </button>
            ) : (
              <button type="button" onClick={() => setActiveTab('anzeigen')} className={`px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition ${activeTab === 'anzeigen' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                Suche
              </button>
            )}
            {profile.role === 'experte' && (hasTeam || (isOwnProfile && editMode)) && (
              <button type="button" onClick={() => setActiveTab('team')} className={`px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition ${activeTab === 'team' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                Team
              </button>
            )}
            {profile.role === 'experte' && (hasSchulpferde || (isOwnProfile && editMode)) && (
              <button type="button" onClick={() => setActiveTab('schulpferde')} className={`px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition ${activeTab === 'schulpferde' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
                Lehrpferde
              </button>
            )}
          </div>
        </section>

        {isOwnProfile && editMode && (contentMessage || contentError) && (
          <section className={`rounded-2xl border p-4 ${contentError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
            {contentError || contentMessage}
          </section>
        )}

        {activeTab === 'anzeigen' && (
          <section className="space-y-6">
            {profile.role === 'nutzer' && (
              <section className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Users size={14} /> Suche</h2>
                  {isOwnProfile && editMode && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSearchVisibilityFilter('public')}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border ${searchVisibilityFilter === 'public' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
                      >
                        Öffentlich sichtbar
                      </button>
                      <button
                        type="button"
                        onClick={() => setSearchVisibilityFilter('draft')}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border ${searchVisibilityFilter === 'draft' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
                      >
                        Entwürfe
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('anzeigen');
                          setEditMode(true);
                          window.setTimeout(() => {
                            document.getElementById('suche-formular')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 0);
                        }}
                        className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-emerald-200 bg-emerald-50 text-emerald-700"
                      >
                        Suche erstellen
                      </button>
                    </div>
                  )}
                </div>
                {isOwnProfile && editMode && editingSearchId && (
                  <div id="suche-formular" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Suche bearbeiten</p>
                    <input
                      value={editingSearchForm.titel}
                      onChange={(e) => setEditingSearchForm((prev) => ({ ...prev, titel: e.target.value }))}
                      placeholder="Titel"
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
                    />
                    <input
                      value={editingSearchForm.kategorie}
                      onChange={(e) => setEditingSearchForm((prev) => ({ ...prev, kategorie: e.target.value }))}
                      placeholder="Kategorie"
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
                    />
                    <textarea
                      value={editingSearchForm.beschreibung}
                      onChange={(e) => setEditingSearchForm((prev) => ({ ...prev, beschreibung: e.target.value }))}
                      rows={4}
                      placeholder="Beschreibung"
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleUpdateSearchInline}
                        disabled={contentBusy}
                        className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-slate-900 text-white disabled:opacity-60"
                      >
                        Suche speichern
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSearchId(null);
                          setEditingSearchForm({ titel: '', kategorie: '', beschreibung: '' });
                        }}
                        className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-white border border-slate-200 text-slate-700"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                )}
                {isOwnProfile && editMode && !editingSearchId && (
                  <div id="suche-formular" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Neue Suche</p>
                    <p className="text-xs text-slate-500">Entwurf wird automatisch gespeichert{hasSearchDraft ? ' (ungespeicherter Entwurf aktiv).' : '.'}</p>
                    <input
                      value={newSearchForm.titel}
                      onChange={(e) => setNewSearchForm((prev) => ({ ...prev, titel: e.target.value }))}
                      placeholder="Titel"
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
                    />
                    <input
                      value={newSearchForm.kategorie}
                      onChange={(e) => setNewSearchForm((prev) => ({ ...prev, kategorie: e.target.value }))}
                      placeholder="Kategorie"
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
                    />
                    <textarea
                      value={newSearchForm.beschreibung}
                      onChange={(e) => setNewSearchForm((prev) => ({ ...prev, beschreibung: e.target.value }))}
                      rows={4}
                      placeholder="Beschreibung"
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleCreateSearchInline}
                      disabled={contentBusy}
                      className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-slate-900 text-white disabled:opacity-60"
                    >
                      Suche speichern
                    </button>
                  </div>
                )}
                {visibleSearchCards.length === 0 ? (
                  <p className="text-sm text-slate-500">{isOwnProfile && searchVisibilityFilter === 'draft' ? 'Keine Entwürfe vorhanden.' : 'Noch keine öffentlich geschaltete Suche vorhanden.'}</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {visibleSearchCards.map((gesuch) => (
                      <article
                        id={`gesuch-${gesuch.id}`}
                        key={gesuch.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 cursor-pointer hover:border-emerald-300 hover:bg-white transition-colors"
                        onClick={() => {
                          if (!isOwnProfile) return;
                          setEditingSearchId(gesuch.id);
                          setEditingSearchForm({ titel: gesuch.titel, kategorie: gesuch.kategorie, beschreibung: gesuch.beschreibung });
                          setEditMode(true);
                          window.setTimeout(() => {
                            document.getElementById('suche-formular')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 0);
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          {has(gesuch.kategorie) && <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">{gesuch.kategorie}</p>}
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${gesuch.visibility === 'public' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{gesuch.visibility === 'public' ? 'Online' : 'Entwurf'}</span>
                        </div>
                        {has(gesuch.titel) && <h3 className="text-base font-black uppercase italic text-slate-900">{gesuch.titel}</h3>}
                        {has(gesuch.beschreibung) && <p className="text-sm text-slate-600 whitespace-pre-wrap">{gesuch.beschreibung}</p>}
                        <div className="flex items-center gap-4 pt-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          <span className="inline-flex items-center gap-1"><Eye size={13} /> {gesuch.viewsCount}</span>
                        </div>
                        {isOwnProfile && editMode && (
                          <div className="flex gap-2 pt-1">
                            <button type="button" onClick={(event) => { event.stopPropagation(); setEditingSearchId(gesuch.id); setEditingSearchForm({ titel: gesuch.titel, kategorie: gesuch.kategorie, beschreibung: gesuch.beschreibung }); }} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-white text-slate-900">Bearbeiten</button>
                            <button type="button" onClick={(event) => { event.stopPropagation(); handleDeleteSearchInline(gesuch.id); }} disabled={contentBusy} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-red-50 border border-red-200 text-red-700 disabled:opacity-60">Löschen</button>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
            {profile.role === 'experte' && (
              <section className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Users size={14} /> Angebote</h2>
                  {isOwnProfile && (editMode || viewingDrafts) && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setOfferVisibilityFilter('public')}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border ${offerVisibilityFilter === 'public' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
                      >
                        Öffentlich sichtbar
                      </button>
                      <button
                        type="button"
                        onClick={() => setOfferVisibilityFilter('draft')}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border ${offerVisibilityFilter === 'draft' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
                      >
                        Entwürfe
                      </button>
                      {editMode && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('anzeigen');
                            setEditMode(true);
                            window.setTimeout(() => {
                              document.getElementById('anzeige-formular')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 0);
                          }}
                          className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-emerald-200 bg-emerald-50 text-emerald-700"
                        >
                          Anzeige hinzufügen
                        </button>
                      )}
                      {viewingDrafts && (
                        <button
                          type="button"
                          onClick={() => setViewingDrafts(false)}
                          className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-200 bg-white text-slate-600"
                        >
                          Schließen
                        </button>
                      )}
                    </div>
                  )}
                  {isOwnProfile && !editMode && !viewingDrafts && (
                    <button
                      type="button"
                      onClick={() => {
                        setViewingDrafts(true);
                        setOfferVisibilityFilter('draft');
                      }}
                      className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    >
                      Entwürfe ansehen
                    </button>
                  )}
                </div>
                {isOwnProfile && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Anzeige verwalten</p>
                    <p className="text-xs text-slate-500">
                      Neue Anzeigen und Bearbeitungen öffnen jetzt eine eigene Detailseite mit allen Feldern, Medien und der Nachrichtenfunktion.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={openCreateOfferPage}
                        className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-slate-900 text-white"
                      >
                        Anzeige hinzufügen
                      </button>
                    </div>
                  </div>
                )}
                {visibleAngebotCards.length === 0 ? (
                  <p className="text-sm text-slate-500">{isOwnProfile && offerVisibilityFilter === 'draft' ? 'Keine Entwürfe vorhanden.' : 'Noch keine öffentlich geschaltete Anzeige vorhanden.'}</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {visibleAngebotCards.map((angebot) => (
                      <article
                        id={`angebot-${angebot.id}`}
                        key={angebot.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 cursor-pointer hover:border-emerald-300 hover:bg-white transition-colors"
                        onClick={() => openOfferDetail(angebot.id)}
                      >
                        {angebot.titleImageUrl && (
                          <img src={String(angebot.titleImageUrl).trim()} alt={angebot.titel || 'Anzeige'} className="w-full h-36 rounded-xl object-cover border border-slate-200" />
                        )}
                        <div className="flex items-center justify-between gap-2">
                          {has(angebot.kategorie) && <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">{angebot.kategorie}</p>}
                          {angebot.visibility === 'public' && (
                            <span className="px-2 py-1 rounded-lg text-[9px] font-black uppercase bg-emerald-100 text-emerald-700">Online</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openOfferDetail(angebot.id);
                          }}
                          className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-emerald-200 bg-white text-emerald-700"
                        >
                          Detailseite öffnen
                        </button>
                        {has(angebot.titel) && (
                          <h3 className="text-base font-black uppercase italic text-slate-900">
                            {angebot.visibility === 'draft' ? 'Entwurf: ' : ''}{angebot.titel}
                          </h3>
                        )}
                        {has(angebot.beschreibung) && <p className="text-sm text-slate-600 whitespace-pre-wrap">{angebot.beschreibung}</p>}
                        {has(angebot.preview) && <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{angebot.preview}</p>}
                        {has(angebot.conditionsText) && <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{angebot.conditionsText}</p>}
                        {isOwnProfile && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openOfferDetail(angebot.id, 'edit');
                              }}
                              className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-200 bg-white text-slate-700"
                            >
                              Bearbeiten
                            </button>
                          </div>
                        )}
                        <div className="flex items-center gap-4 pt-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          <span className="inline-flex items-center gap-1"><Eye size={13} /> {angebot.viewsCount}</span>
                          <span className="inline-flex items-center gap-1"><Heart size={13} /> {angebot.wishlistCount}</span>
                        </div>
                        {!isOwnProfile && viewerUserId > 0 && (
                          <div className="pt-1 flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleToggleOfferWishlist(angebot);
                              }}
                              disabled={offerActionBusyId === angebot.id}
                              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border inline-flex items-center gap-1 disabled:opacity-60 ${wishlistedOfferIdSet.has(angebot.id) ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-700'}`}
                            >
                              <Heart size={13} fill={wishlistedOfferIdSet.has(angebot.id) ? 'currentColor' : 'none'} />
                              {wishlistedOfferIdSet.has(angebot.id) ? 'Gemerkt' : 'Merken'}
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                shareOfferLink(angebot.id);
                              }}
                              className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-200 bg-white text-slate-700 inline-flex items-center gap-1"
                            >
                              <Share2 size={13} /> Link teilen
                            </button>
                          </div>
                        )}
                        {(isOwnProfile || viewerUserId <= 0) && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                shareOfferLink(angebot.id);
                              }}
                              className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-200 bg-white text-slate-700 inline-flex items-center gap-1"
                            >
                              <Share2 size={13} /> Link teilen
                            </button>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {profile.role === 'nutzer' && (has(profile.sucheText) || profile.kategorien.length > 0) && (
              <section className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm space-y-4">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Gesuch & Interessen</h2>
                {has(profile.sucheText) && <p className="text-sm text-slate-600 whitespace-pre-wrap">{profile.sucheText}</p>}
                {profile.kategorien.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {profile.kategorien.map((item) => (
                      <span key={item} className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-[10px] font-black uppercase text-emerald-700">{item}</span>
                    ))}
                  </div>
                )}
              </section>
            )}
          </section>
        )}

        {activeTab === 'team' && profile.role === 'experte' && (
          <section className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Users size={14} /> Team</h2>
            </div>
            {isOwnProfile && editMode && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Teamprofil verlinken</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="relative group">
                    <input value={newTeamForm.memberUserId} onChange={(e) => setNewTeamForm((prev) => ({ ...prev, memberUserId: e.target.value }))} placeholder="Vorhandene Profil-ID" className="rounded-xl border border-slate-200 bg-white p-3 text-sm w-full" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1" title="Die Profil-ID findest du in der URL oder im Profil-Dashboard">
                      <Info size={16} />
                      <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                        <div className="font-semibold mb-1">Profil-ID finden:</div>
                        <div>1. Gehe zu deinem Profil</div>
                        <div>2. Die ID findest du in der Browser-URL</div>
                        <div>   (z.B. /profil/12345)</div>
                        <div className="mt-1 text-slate-300 text-[10px]">oder im Dashboard unter Einstellungen</div>
                        <div className="absolute top-full right-3 -translate-y-1/2 border-4 border-transparent border-t-slate-900"></div>
                      </div>
                    </button>
                  </div>
                  <input value={newTeamForm.inviteEmail} onChange={(e) => setNewTeamForm((prev) => ({ ...prev, inviteEmail: e.target.value }))} placeholder="E-Mail für Registrierungslink (optional)" className="rounded-xl border border-slate-200 bg-white p-3 text-sm" />
                </div>
                <p className="text-xs text-slate-500">Nur vorhandene Profile können direkt verlinkt werden. Für neue Mitglieder sende einen Registrierungslink.</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={handleCreateTeamInline} disabled={contentBusy} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-slate-900 text-white disabled:opacity-60">
                    Profil verlinken
                  </button>
                  <button type="button" onClick={copyTeamRegisterLink} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-white border border-slate-200 text-slate-700">
                    Registrierungslink kopieren
                  </button>
                  <button type="button" onClick={sendTeamRegisterLinkByMail} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-white border border-slate-200 text-slate-700">
                    Registrierungslink schicken
                  </button>
                </div>
              </div>
            )}
            {teamCards.length === 0 ? (
              <p className="text-sm text-slate-500">Keine Team-Informationen vorhanden{isOwnProfile && editMode ? ' - füge jetzt Teammitglieder hinzu.' : '.'}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teamCards.map((member) => (
                  <article key={member.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex gap-4 items-start">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center shrink-0">
                      {member.bild_url ? (
                        <img src={String(member.bild_url).trim()} alt={member.name || 'Teammitglied'} className="w-full h-full object-cover" />
                      ) : (
                        <User size={24} className="text-slate-300" />
                      )}
                    </div>
                    <div className="space-y-1 min-w-0">
                      {has(member.rolle) && <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">{member.rolle}</p>}
                      {has(member.name) && <p className="text-base font-black uppercase italic text-slate-900">{member.name}</p>}
                      {has(member.beschreibung) && <p className="text-sm text-slate-600 whitespace-pre-wrap">{member.beschreibung}</p>}
                      {isOwnProfile && editMode && Number.isInteger(Number(member.id)) && (
                        <div className="flex gap-2 pt-1">
                          <button type="button" onClick={() => handleDeleteTeamInline(Number(member.id))} disabled={contentBusy} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-red-50 border border-red-200 text-red-700 disabled:opacity-60">Verlinkung entfernen</button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'schulpferde' && profile.role === 'experte' && (
          <section className="bg-slate-900 rounded-[2rem] border border-slate-800 p-8 shadow-sm text-white space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-xs font-black uppercase tracking-widest text-emerald-300 flex items-center gap-2"><Home size={16} /> Lehrpferde</h2>
            </div>
            {isOwnProfile && editMode && (
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Neues Lehrpferd</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input value={newHorseForm.name} onChange={(e) => setNewHorseForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Name" className="rounded-xl border border-white/20 bg-white/5 p-3 text-sm text-white placeholder:text-slate-300" />
                  <input value={newHorseForm.breed} onChange={(e) => setNewHorseForm((prev) => ({ ...prev, breed: e.target.value }))} placeholder="Rasse" className="rounded-xl border border-white/20 bg-white/5 p-3 text-sm text-white placeholder:text-slate-300" />
                  <input value={newHorseForm.age} onChange={(e) => setNewHorseForm((prev) => ({ ...prev, age: e.target.value }))} placeholder="Alter" className="rounded-xl border border-white/20 bg-white/5 p-3 text-sm text-white placeholder:text-slate-300" />
                </div>
                  <div className="space-y-3 text-sm text-white">
                  <MediaDropzone
                    title="Pferdebild hochladen"
                    description="Ziehe ein Bild hinein oder klicke, um eine Datei auszuwählen."
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    buttonLabel="Datei auswählen"
                    busyLabel="Lädt..."
                    onFiles={async (files) => {
                      const file = files[0];
                      if (!file) return;
                      await handleUploadHorseImage(file, 'new');
                    }}
                  />
                  {newHorseForm.imageUrl && (
                    <div className="mt-2 text-xs text-emerald-300 break-all">Aktuelles Bild: {newHorseForm.imageUrl}</div>
                  )}
                </div>
                <textarea value={newHorseForm.notes} onChange={(e) => setNewHorseForm((prev) => ({ ...prev, notes: e.target.value }))} rows={3} placeholder="Beschreibung" className="w-full rounded-xl border border-white/20 bg-white/5 p-3 text-sm text-white placeholder:text-slate-300" />
                <button type="button" onClick={handleCreateHorseInline} disabled={contentBusy} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-white text-slate-900 disabled:opacity-60">
                  Lehrpferd speichern
                </button>
              </div>
            )}
            {horseCards.length === 0 ? (
              <p className="text-sm text-slate-300">Keine Lehrpferde hinterlegt{isOwnProfile && editMode ? ' - hinterlege jetzt dein erstes Lehrpferd.' : '.'}</p>
            ) : (
              <div className="space-y-4">
                {horseCards.map((horse) => (
                  <article key={horse.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                    {isOwnProfile && editMode && editingHorseId === Number(horse.id) ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <input value={editingHorseForm.name} onChange={(e) => setEditingHorseForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Name" className="rounded-xl border border-white/20 bg-white/5 p-3 text-sm text-white placeholder:text-slate-300" />
                          <input value={editingHorseForm.breed} onChange={(e) => setEditingHorseForm((prev) => ({ ...prev, breed: e.target.value }))} placeholder="Rasse" className="rounded-xl border border-white/20 bg-white/5 p-3 text-sm text-white placeholder:text-slate-300" />
                          <input value={editingHorseForm.age} onChange={(e) => setEditingHorseForm((prev) => ({ ...prev, age: e.target.value }))} placeholder="Alter" className="rounded-xl border border-white/20 bg-white/5 p-3 text-sm text-white placeholder:text-slate-300" />
                        </div>
                        <div className="space-y-3 text-sm text-white">
                          <MediaDropzone
                            title="Pferdebild hochladen"
                            description="Ziehe das Bild hinein oder wähle eine Datei aus."
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            buttonLabel="Datei auswählen"
                            busyLabel="Lädt..."
                            onFiles={async (files) => {
                              const file = files[0];
                              if (!file) return;
                              await handleUploadHorseImage(file, 'edit');
                            }}
                          />
                          {editingHorseForm.imageUrl && (
                            <div className="mt-2 text-xs text-emerald-300 break-all">Aktuelles Bild: {editingHorseForm.imageUrl}</div>
                          )}
                        </div>
                        <textarea value={editingHorseForm.notes} onChange={(e) => setEditingHorseForm((prev) => ({ ...prev, notes: e.target.value }))} rows={3} placeholder="Beschreibung" className="w-full rounded-xl border border-white/20 bg-white/5 p-3 text-sm text-white placeholder:text-slate-300" />
                        <div className="flex gap-2">
                          <button type="button" onClick={handleUpdateHorseInline} disabled={contentBusy} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-white text-slate-900 disabled:opacity-60">Speichern</button>
                          <button type="button" onClick={() => { setEditingHorseId(null); setEditingHorseForm({ name: '', breed: '', age: '', notes: '', imageUrl: '' }); }} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-white/10 border border-white/20 text-white">Abbrechen</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {has(horse.name) && <p className="text-sm"><span className="text-slate-400">Name:</span> {horse.name}</p>}
                          {has(horse.rasse) && <p className="text-sm"><span className="text-slate-400">Rasse:</span> {horse.rasse}</p>}
                          {has(horse.alter) && <p className="text-sm"><span className="text-slate-400">Alter:</span> {horse.alter}</p>}
                        </div>
                        {has(horse.beschreibung) && <p className="text-sm text-slate-200 whitespace-pre-wrap">{horse.beschreibung}</p>}
                        {horse.bilder.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {horse.bilder.map((url: string, idx: number) => (
                              <img key={`${horse.id}-${idx}`} src={String(url).trim()} alt={horse.name || 'Pferd'} className="w-full h-28 rounded-xl object-cover border border-white/10" />
                            ))}
                          </div>
                        )}
                        {isOwnProfile && editMode && Number.isInteger(Number(horse.id)) && (
                          <div className="flex gap-2">
                            <button type="button" onClick={() => { setEditingHorseId(Number(horse.id)); setEditingHorseForm({ name: horse.name, breed: horse.rasse, age: horse.alter, notes: horse.beschreibung, imageUrl: horse.bilder[0] || '' }); }} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-white text-slate-900">Bearbeiten</button>
                            <button type="button" onClick={() => handleDeleteHorseInline(Number(horse.id))} disabled={contentBusy} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-red-200 text-red-900 disabled:opacity-60">Löschen</button>
                          </div>
                        )}
                      </>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'beitraege' && (
          <section className="space-y-6">
            {showRatingsDetails && (
              <section className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Star size={14} className="text-amber-400" /> Bewertungen</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bewertungen entstehen nur auf Basis veröffentlichter Anzeigen</p>
                </div>
              {!isOwnProfile && viewerUserId > 0 && hasPublicExpertAds && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Deine Bewertung zur Anzeige</p>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Wahrgenommenes Angebot</label>
                    <select
                      value={ratingOfferId}
                      onChange={(e) => setRatingOfferId(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700"
                    >
                      <option value="">Bitte Angebot auswählen</option>
                      {visibleAngebotCards
                        .filter((item) => item.visibility === 'public')
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.titel || item.kategorie || 'Angebot'}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={`rate-${value}`}
                        type="button"
                        onClick={() => setRatingValue(value)}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border ${ratingValue === value ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-white border-slate-200 text-slate-600'}`}
                      >
                        {value} Stern{value > 1 ? 'e' : ''}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    rows={3}
                    placeholder="Kommentar zur Anzeige (bei 1-2 Sternen bitte Grund angeben)"
                    className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleRateProfile}
                    disabled={ratingBusy}
                    className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-slate-900 text-white disabled:opacity-60"
                  >
                    {ratingBusy ? 'Speichert...' : 'Bewertung speichern'}
                  </button>
                </div>
              )}

              {profile?.role === 'experte' && !hasPublicExpertAds && (
                <p className="text-sm text-slate-500">Für dieses Profil sind Bewertungen erst sichtbar, wenn öffentliche Anzeigen vorhanden sind.</p>
              )}

              {ratings.length === 0 ? (
                <p className="text-sm text-slate-500">Noch keine Bewertungen vorhanden.</p>
              ) : (
                <div className="space-y-3">
                  {ratings.map((entry, index) => (
                    <article key={`rating-${entry.created_at}-${index}`} className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <p className="text-sm font-black text-slate-900">{entry.vorname} {entry.nachname}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">{entry.rating}/5 Sterne</p>
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${entry.is_verified_booking ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                            {entry.is_verified_booking ? 'Verifiziert' : 'Nicht verifiziert'}
                          </span>
                        </div>
                      </div>
                      {has(entry.offer_title) && (
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mt-2">Angebot: {entry.offer_title}</p>
                      )}
                      {has(entry.comment) && <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{entry.comment}</p>}
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">{new Date(entry.created_at).toLocaleString('de-DE')}</p>
                    </article>
                  ))}
                </div>
              )}
              </section>
            )}

            <section className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Star size={14} className="text-amber-400" /> Beiträge</h2>
                <div className="flex flex-wrap gap-2">
                  {isOwnProfile && editMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditMode(true);
                        window.setTimeout(() => {
                          document.getElementById('beitrag-formular')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 0);
                      }}
                      className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-200 bg-emerald-50 text-emerald-700"
                    >
                      Beitrag hinzufügen
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowRatingsDetails((prev) => !prev)}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${showRatingsDetails ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-white border-slate-200 text-slate-600'}`}
                  >
                    Bewertungen {showRatingsDetails ? 'ausblenden' : `anzeigen (${ratings.length})`}
                  </button>
                </div>
              </div>
              {isOwnProfile && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Beitrag verwalten</p>
                  <p className="text-xs text-slate-500">
                    Neue Beiträge und Bearbeitungen oeffnen jetzt eine eigene Detailseite mit Medien, Text und Nachrichtenfunktion.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={openCreatePostPage}
                      className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-slate-900 text-white"
                    >
                      Beitrag hinzufügen
                    </button>
                  </div>
                </div>
              )}
              {posts.length === 0 ? (
                <p className="text-sm text-slate-500">Dieses Profil hat noch keine Beiträge geteilt.</p>
              ) : (
                <div className="space-y-3">
                  {posts.map((post) => (
                    <article key={post.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                      <p className="text-sm font-black uppercase italic text-slate-800">{post.title}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{new Date(post.created_at).toLocaleString('de-DE')}</p>
                      <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{post.content}</p>
                      {Array.isArray(post.media_items) && post.media_items.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                          {post.media_items.map((item, mediaIndex) => (
                            <button
                              key={`${post.id}-media-${mediaIndex}`}
                              type="button"
                              onClick={() => setLightboxItem(item)}
                              className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white"
                            >
                              {item.type === 'image' ? (
                                <img src={normalizeMediaUrl(String(item.url).trim())} alt="Beitragsbild" className="w-full h-full object-cover" />
                              ) : (
                                <div className="relative w-full h-full">
                                  <video src={normalizeMediaUrl(String(item.url).trim())} className="w-full h-full object-cover" muted preload="metadata" playsInline />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent flex items-center justify-center">
                                    <span className="w-10 h-10 rounded-full bg-black/60 border border-white/40 text-white flex items-center justify-center">
                                      <Play size={16} fill="currentColor" />
                                    </span>
                                  </div>
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      {isOwnProfile && (
                        <div className="flex gap-2 pt-2">
                          <button type="button" onClick={() => openPostDetail(post.id, 'edit')} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-white border border-slate-200 text-slate-700">Bearbeiten</button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </section>
        )}
      {lightboxItem && (
        <div
          className="fixed inset-0 z-[90] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxItem(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-black">
            {lightboxItem.type === 'image' ? (
              <img src={String(lightboxItem.url).trim()} alt="" className="max-h-[90vh] max-w-full object-contain" />
            ) : (
              <video src={lightboxItem.url} controls autoPlay className="max-h-[90vh] max-w-full" />
            )}
          </div>
          <button
            type="button"
            onClick={() => setLightboxItem(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white text-xl font-black flex items-center justify-center hover:bg-white/30"
          >
            ×
          </button>
        </div>
      )}
      </div>
      </div>
    </div>
  );
}
