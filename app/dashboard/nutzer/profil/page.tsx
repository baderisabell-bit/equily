"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Camera, ChevronLeft, ChevronRight, ImagePlus, MapPin, Play, User } from "lucide-react";
import { safeToFixed } from '../../../lib/num';
import { ANGEBOT_KATEGORIEN } from "../../../suche/kategorien-daten";
import LoggedInHeader from "../../../components/logged-in-header";
import DashboardSidebar from "../../../components/dashboard-sidebar";
import MediaDropzone from "../../../components/media-dropzone";
import {
  addWishlistItem,
  createNetworkPost,
  getNetworkGroups,
  getProfileAnalytics,
  getProfilePosts,
  getPublicProfileMeta,
  getStoredProfileData,
  saveGalerieItems,
  saveUserProfileData,
  uploadCertificates,
  uploadIdentityVerification,
  uploadGalerieMedia,
  uploadNetworkMedia,
  uploadProfileHorseImage,
  toggleNetworkPostLike,
  toggleNetworkPostSave,
} from "../../../actions";

type GalerieItem = {
  type: "image" | "video";
  url: string;
};

type PferdItem = {
  name: string;
  rasse: string;
  alter: string;
  beschreibung: string;
  bilder: string[];
};

type GesuchItem = {
  kategorie: string;
  titel: string;
  inhalt: string;
};

type ProfilePost = {
  id: number;
  title: string;
  content: string;
  hashtags: string[];
  media_items: Array<{ url: string; mediaType: "image" | "video" }>;
  created_at: string;
  comment_count: number;
  save_count: number;
  like_count: number;
  liked_by_viewer: boolean;
  saved_by_viewer: boolean;
  moderation_status: string;
};

type AnalyticsData = {
  profileViewsTotal: number;
  profileViews30d: number;
  uniqueVisitors30d: number;
  chatsTotal: number;
  uniqueChatPartners: number;
  outgoingMessagesTotal: number;
  incomingMessagesTotal: number;
  outgoingMessages30d: number;
  incomingMessages30d: number;
  profilePostsTotal: number;
};

type NetworkGroup = {
  id: number;
  name: string;
  is_member: boolean;
};

type ProfileStats = {
  followerCount: number;
  followingCount: number;
  groupHostCount: number;
  groupMemberCount: number;
  ratingAvg: number;
  ratingCount: number;
};

type PostMediaItem = {
  url: string;
  mediaType: "image" | "video";
};

const MAX_GALERIE_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_GALERIE_VIDEO_BYTES = 120 * 1024 * 1024;
const EMPTY_PFERD: PferdItem = { name: "", rasse: "", alter: "", beschreibung: "", bilder: [] };
const EMPTY_ANALYTICS: AnalyticsData = {
  profileViewsTotal: 0,
  profileViews30d: 0,
  uniqueVisitors30d: 0,
  chatsTotal: 0,
  uniqueChatPartners: 0,
  outgoingMessagesTotal: 0,
  incomingMessagesTotal: 0,
  outgoingMessages30d: 0,
  incomingMessages30d: 0,
  profilePostsTotal: 0,
};
const EMPTY_PROFILE_STATS: ProfileStats = {
  followerCount: 0,
  followingCount: 0,
  groupHostCount: 0,
  groupMemberCount: 0,
  ratingAvg: 0,
  ratingCount: 0,
};

const validateGalerieFile = (file: File) => {
  const mime = String(file.type || "").toLowerCase();
  const isImage = mime.startsWith("image/");
  const isVideo = mime.startsWith("video/");
  if (!isImage && !isVideo) return "Nur Bilder und Videos sind erlaubt.";
  if (isImage && file.size > MAX_GALERIE_IMAGE_BYTES) return "Bild zu gross (max. 20 MB).";
  if (isVideo && file.size > MAX_GALERIE_VIDEO_BYTES) return "Video zu gross (max. 120 MB).";
  return null;
};

const hasHorseContent = (horse: PferdItem) => {
  return Boolean(horse.name || horse.rasse || horse.alter || horse.beschreibung || horse.bilder.length > 0);
};

export default function NutzerProfilAnpassen() {
  const [userId, setUserId] = useState<number | null>(null);
  const [userName, setUserName] = useState("Profil");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingGalerie, setUploadingGalerie] = useState(false);
  const [uploadingHorseIndex, setUploadingHorseIndex] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [plz, setPlz] = useState("");
  const [ort, setOrt] = useState("");
  const [bio, setBio] = useState("");
  const [interessen, setInteressen] = useState<string[]>([]);
  const [gesuche, setGesuche] = useState<GesuchItem[]>([]);
  const [pferde, setPferde] = useState<PferdItem[]>([{ ...EMPTY_PFERD }]);
  const [galerie, setGalerie] = useState<GalerieItem[]>([]);
  const [uploadedCertificates, setUploadedCertificates] = useState<string[]>([]);
  const [uploadedIdDocs, setUploadedIdDocs] = useState<string[]>([]);
  const [profilePosts, setProfilePosts] = useState<ProfilePost[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData>(EMPTY_ANALYTICS);
  const [profileStats, setProfileStats] = useState<ProfileStats>(EMPTY_PROFILE_STATS);
  const [networkGroups, setNetworkGroups] = useState<NetworkGroup[]>([]);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postHashtags, setPostHashtags] = useState("");
  const [postMediaItems, setPostMediaItems] = useState<PostMediaItem[]>([]);
  const [creatingPost, setCreatingPost] = useState(false);
  const [uploadingPostMedia, setUploadingPostMedia] = useState(false);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);

  const completion = useMemo(() => {
    const checks = [
      Boolean(vorname.trim()),
      Boolean(nachname.trim()),
      Boolean(plz.trim()),
      Boolean(ort.trim()),
      Boolean(bio.trim()),
      interessen.length > 0,
      pferde.some(hasHorseContent),
      galerie.length > 0,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [bio, galerie.length, interessen.length, nachname, ort, pferde, plz, vorname]);

  useEffect(() => {
    const rawUserId = sessionStorage.getItem("userId");
    if (!rawUserId) {
      window.location.href = "/login";
      return;
    }

    const parsed = parseInt(rawUserId, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      window.location.href = "/login";
      return;
    }

    setUserId(parsed);
    setUserName(sessionStorage.getItem("userName") || "Nutzer");

    const load = async () => {
      setLoading(true);
      const [res, postsRes, analyticsRes, groupsRes, metaRes] = await Promise.all([
        getStoredProfileData(parsed),
        getProfilePosts(parsed, parsed, 12),
        getProfileAnalytics(parsed),
        getNetworkGroups(parsed),
        getPublicProfileMeta({ profileUserId: parsed, viewerUserId: parsed }),
      ]);

      if (res.success && res.data) {
        const profilData = res.data.profil_data || {};
        setVorname(String(profilData.vorname || ""));
        setNachname(String(profilData.nachname || ""));
        setPlz(String(res.data.plz || ""));
        setOrt(String(res.data.ort || ""));
        setBio(String(profilData.profilBeschreibung || res.data.suche_text || ""));
        setInteressen(Array.isArray(res.data.kategorien) ? res.data.kategorien.map((item: any) => String(item || "").trim()).filter(Boolean) : []);
        setUploadedCertificates(Array.isArray(profilData.uploadedCertificates) ? profilData.uploadedCertificates.map((item: any) => String(item || "").trim()).filter(Boolean) : []);
        setUploadedIdDocs(Array.isArray(profilData.uploadedIdDocs) ? profilData.uploadedIdDocs.map((item: any) => String(item || "").trim()).filter(Boolean) : []);

        if (res.data.gesuche && typeof res.data.gesuche === "object") {
          setGesuche(
            Object.entries(res.data.gesuche).map(([kategorie, value]: any) => ({
              kategorie: String(kategorie || "").trim(),
              titel: String(value?.titel || "").trim(),
              inhalt: String(value?.inhalt || "").trim(),
            })).filter((item) => item.kategorie || item.titel || item.inhalt)
          );
        }

        const mappedPferde = Array.isArray(profilData.pferde)
          ? profilData.pferde
              .map((item: any) => ({
                name: String(item?.name || "").trim(),
                rasse: String(item?.rasse || "").trim(),
                alter: String(item?.alter || "").trim(),
                beschreibung: String(item?.beschreibung || "").trim(),
                bilder: Array.isArray(item?.bilder) ? item.bilder.map((url: any) => String(url || "").trim()).filter(Boolean) : [],
              }))
              .filter(hasHorseContent)
          : [];

        if (mappedPferde.length > 0) {
          setPferde(mappedPferde);
        } else {
          const legacyHorse = {
            name: String(profilData.pferdName || "").trim(),
            rasse: String(profilData.pferdRasse || "").trim(),
            alter: String(profilData.pferdAlter || "").trim(),
            beschreibung: String(profilData.pferdBeschreibung || "").trim(),
            bilder: Array.isArray(profilData.pferdBilder) ? profilData.pferdBilder.map((url: any) => String(url || "").trim()).filter(Boolean) : [],
          };
          setPferde(hasHorseContent(legacyHorse) ? [legacyHorse] : [{ ...EMPTY_PFERD }]);
        }

        if (Array.isArray(profilData.galerie)) {
          setGalerie(
            profilData.galerie
              .map((item: any) => ({
                type: String(item?.type || "image") === "video" ? "video" : "image",
                url: String(item?.url || "").trim(),
              }))
              .filter((item: GalerieItem) => item.url.length > 0)
          );
        }
      }

      if (postsRes.success) {
        setProfilePosts(
          (postsRes.posts || []).map((post: any) => ({
            id: Number(post.id),
            title: String(post.title || "").trim(),
            content: String(post.content || "").trim(),
            hashtags: Array.isArray(post.hashtags) ? post.hashtags.map((item: any) => String(item || "").trim()).filter(Boolean) : [],
            media_items: Array.isArray(post.media_items)
              ? post.media_items
                  .map((item: any) => ({
                    url: String(item?.url || "").trim(),
                    mediaType: item?.mediaType === "video" ? "video" : "image",
                  }))
                  .filter((item: PostMediaItem) => item.url)
              : [],
            created_at: String(post.created_at || ""),
            comment_count: Number(post.comment_count || 0),
            save_count: Number(post.save_count || 0),
            like_count: Number(post.like_count || 0),
            liked_by_viewer: Boolean(post.liked_by_viewer),
            saved_by_viewer: Boolean(post.saved_by_viewer),
            moderation_status: String(post.moderation_status || "approved"),
          }))
        );
      }

      if (analyticsRes.success && analyticsRes.data) {
        setAnalytics({ ...EMPTY_ANALYTICS, ...analyticsRes.data });
      }

      if (groupsRes.success) {
        setNetworkGroups(
          (groupsRes.groups || []).map((group: any) => ({
            id: Number(group.id),
            name: String(group.name || "").trim(),
            is_member: Boolean(group.is_member),
          }))
        );
      }

      if (metaRes.success && metaRes.stats) {
        setProfileStats({ ...EMPTY_PROFILE_STATS, ...metaRes.stats });
      }

      setLoading(false);
    };

    load();
  }, []);

  const resetStatus = () => {
    setError("");
    setSuccess("");
  };

  const setStatusWithWarnings = (successText: string, warnings: string[]) => {
    setSuccess(successText);
    if (warnings.length > 0) {
      setError(warnings.slice(0, 2).join(" "));
    }
  };

  const buildProfileSavePayload = (overrides: { uploadedCertificates?: string[]; uploadedIdDocs?: string[] } = {}) => {
    const validePferde = pferde.map((item) => ({
      name: item.name.trim(),
      rasse: item.rasse.trim(),
      alter: item.alter.trim(),
      beschreibung: item.beschreibung.trim(),
      bilder: item.bilder,
    })).filter(hasHorseContent);

    const erstesPferd = validePferde[0] || { ...EMPTY_PFERD };
    const gesuchePayload = gesuche.reduce<Record<string, { titel: string; inhalt: string }>>((acc, item) => {
      if (!item.kategorie) return acc;
      acc[item.kategorie] = { titel: item.titel, inhalt: item.inhalt };
      return acc;
    }, {});

    return {
      profilName: `${vorname} ${nachname}`.trim(),
      profilBeschreibung: bio,
      vorname,
      nachname,
      ort,
      plz,
      kategorien: interessen,
      gesuche: gesuchePayload,
      sucheText: [bio.trim(), ...gesuche.map((item) => `${item.kategorie}: ${item.titel} ${item.inhalt}`.trim()).filter(Boolean)].filter(Boolean).join(" | "),
      pferdName: erstesPferd.name,
      pferdRasse: erstesPferd.rasse,
      pferdAlter: erstesPferd.alter,
      pferdBeschreibung: erstesPferd.beschreibung,
      pferdBilder: erstesPferd.bilder,
      pferde: validePferde,
      galerie,
      uploadedCertificates,
      uploadedIdDocs,
      ...overrides,
    };
  };

  const handleSave = async () => {
    if (!userId) return;
    resetStatus();
    setSaving(true);

    const res = await saveUserProfileData(userId, buildProfileSavePayload());

    setSaving(false);
    if (!res.success) {
      setError(res.error || "Profil konnte nicht gespeichert werden.");
      return;
    }

    const fullName = `${vorname} ${nachname}`.trim();
    setSuccess("Profil gespeichert.");
    if (fullName) {
      setUserName(fullName);
      sessionStorage.setItem("userName", fullName);
    }
  };

  const handleGalerieUpload = async (files: File[]) => {
    if (!userId || files.length === 0) return;

    resetStatus();
    setUploadingGalerie(true);
    const next = [...galerie];
    const fileErrors: string[] = [];
    let uploadedCount = 0;

    for (const file of files.slice(0, Math.max(0, 20 - galerie.length))) {
      const validationError = validateGalerieFile(file);
      if (validationError) {
        fileErrors.push(`${file.name}: ${validationError}`);
        continue;
      }

      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await uploadGalerieMedia(userId, formData);
      if (uploadRes.success && uploadRes.url) {
        next.push({
          type: uploadRes.mediaType === "video" ? "video" : "image",
          url: String(uploadRes.url),
        });
        uploadedCount += 1;
      } else {
        fileErrors.push(`${file.name}: ${uploadRes.error || "Upload fehlgeschlagen."}`);
      }
    }

    if (uploadedCount === 0) {
      setUploadingGalerie(false);
      if (fileErrors.length > 0) {
        setError(fileErrors.slice(0, 2).join(" "));
      }
      return;
    }

    const saveRes = await saveGalerieItems(userId, next);
    setUploadingGalerie(false);

    if (!saveRes.success) {
      setError(saveRes.error || "Galerie konnte nicht gespeichert werden.");
      return;
    }

    setGalerie(next);
    setStatusWithWarnings("Galerie aktualisiert.", fileErrors);
  };

  const handleMoveGalerie = async (index: number, direction: "left" | "right") => {
    if (!userId) return;
    resetStatus();
    const target = direction === "left" ? index - 1 : index + 1;
    if (target < 0 || target >= galerie.length) return;

    const next = [...galerie];
    const current = next[index];
    next[index] = next[target];
    next[target] = current;

    const saveRes = await saveGalerieItems(userId, next);
    if (!saveRes.success) {
      setError(saveRes.error || "Galerie-Reihenfolge konnte nicht gespeichert werden.");
      return;
    }

    setGalerie(next);
    setSuccess("Galerie-Reihenfolge aktualisiert.");
  };

  const handleDeleteGalerie = async (index: number) => {
    if (!userId) return;
    resetStatus();
    const next = galerie.filter((_, itemIndex) => itemIndex !== index);
    const saveRes = await saveGalerieItems(userId, next);
    if (!saveRes.success) {
      setError(saveRes.error || "Galerie konnte nicht aktualisiert werden.");
      return;
    }
    setGalerie(next);
    setSuccess("Galerie aktualisiert.");
  };

  const handleCertificateUpload = async (files: File[]) => {
    if (!userId || files.length === 0) return;

    resetStatus();
    setUploadingDocuments(true);

    const next = [...uploadedCertificates];
    const errors: string[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await uploadCertificates(userId, formData);
      if (uploadRes.success && uploadRes.url) {
        next.push(String(uploadRes.url));
      } else {
        errors.push(`${file.name}: ${uploadRes.error || "Upload fehlgeschlagen."}`);
      }
    }

    if (next.length === uploadedCertificates.length) {
      setUploadingDocuments(false);
      if (errors.length > 0) setError(errors.slice(0, 2).join(" "));
      return;
    }

    const saveRes = await saveUserProfileData(userId, buildProfileSavePayload({ uploadedCertificates: next }));
    setUploadingDocuments(false);
    if (!saveRes.success) {
      setError(saveRes.error || "Zertifikate konnten nicht gespeichert werden.");
      return;
    }

    setUploadedCertificates(next);
    setSuccess("Zertifikate hochgeladen.");
    if (errors.length > 0) setError(errors.slice(0, 2).join(" "));
  };

  const handleIdDocUpload = async (files: File[]) => {
    if (!userId || files.length === 0) return;

    resetStatus();
    setUploadingDocuments(true);

    const next = [...uploadedIdDocs];
    const errors: string[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await uploadIdentityVerification(userId, formData);
      if (uploadRes.success && uploadRes.url) {
        next.push(String(uploadRes.url));
      } else {
        errors.push(`${file.name}: ${uploadRes.error || "Upload fehlgeschlagen."}`);
      }
    }

    if (next.length === uploadedIdDocs.length) {
      setUploadingDocuments(false);
      if (errors.length > 0) setError(errors.slice(0, 2).join(" "));
      return;
    }

    const saveRes = await saveUserProfileData(userId, buildProfileSavePayload({ uploadedIdDocs: next }));
    setUploadingDocuments(false);
    if (!saveRes.success) {
      setError(saveRes.error || "Ausweis konnte nicht gespeichert werden.");
      return;
    }

    setUploadedIdDocs(next);
    setSuccess("Ausweis hochgeladen.");
    if (errors.length > 0) setError(errors.slice(0, 2).join(" "));
  };

  const toggleInteresse = (value: string) => {
    setInteressen((prev) => prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]);
  };

  const updatePferd = (index: number, field: keyof Omit<PferdItem, "bilder">, value: string) => {
    setPferde((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  };

  const addPferd = () => {
    setPferde((prev) => [...prev, { ...EMPTY_PFERD }]);
  };

  const removePferd = (index: number) => {
    setPferde((prev) => prev.length === 1 ? [{ ...EMPTY_PFERD }] : prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleHorseImageUpload = async (index: number, files: File[]) => {
    if (!userId || files.length === 0) return;

    resetStatus();
    setUploadingHorseIndex(index);
    const uploadedUrls: string[] = [];
    const uploadErrors: string[] = [];

    for (const file of files.slice(0, 8)) {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await uploadProfileHorseImage(userId, "nutzer", formData);
      if (uploadRes.success && uploadRes.url) {
        uploadedUrls.push(String(uploadRes.url));
      } else {
        uploadErrors.push(`${file.name}: ${uploadRes.error || "Upload fehlgeschlagen."}`);
      }
    }

    setUploadingHorseIndex(null);
    if (uploadedUrls.length > 0) {
      setPferde((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, bilder: [...item.bilder, ...uploadedUrls] } : item));
      setStatusWithWarnings(`${uploadedUrls.length} Pferdebild(er) hinzugefuegt.`, uploadErrors);
    } else if (uploadErrors.length > 0) {
      setError(uploadErrors.slice(0, 2).join(" "));
    }
  };

  const removeHorseImage = (horseIndex: number, imageIndex: number) => {
    setPferde((prev) => prev.map((item, itemIndex) => itemIndex === horseIndex ? { ...item, bilder: item.bilder.filter((_, idx) => idx !== imageIndex) } : item));
  };

  const openProfile = () => {
    if (userId) {
      window.location.href = `/profil/${userId}`;
      return;
    }
    window.location.href = "/login";
  };

  const handleLogout = () => {
    sessionStorage.clear();
    window.location.href = "/";
  };

  const handleAddToWishlist = async () => {
    if (!userId) return;
    resetStatus();
    const res = await addWishlistItem(userId, {
      typ: "person",
      profilTyp: "nutzer",
      sourceId: `nutzer-${userId}`,
      name: `${vorname} ${nachname}`.trim() || userName,
      ort,
      plz,
      kategorieText: interessen.join(", "),
      content: "Nutzerprofil",
    });

    if (!res.success) {
      setError(res.error || "Merkliste konnte nicht gespeichert werden.");
      return;
    }

    setSuccess(res.inserted ? "Profil zur Merkliste hinzugefuegt." : "Profil ist bereits in deiner Merkliste.");
  };

  const handlePostMediaUpload = async (files: File[]) => {
    if (!userId || files.length === 0) return;

    resetStatus();
    setUploadingPostMedia(true);
    const nextItems = [...postMediaItems];
    const uploadErrors: string[] = [];

    for (const file of files.slice(0, Math.max(0, 8 - postMediaItems.length))) {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await uploadNetworkMedia(userId, formData);
      if (uploadRes.success && uploadRes.url) {
        nextItems.push({
          url: String(uploadRes.url),
          mediaType: uploadRes.mediaType === "video" ? "video" : "image",
        });
      } else {
        uploadErrors.push(`${file.name}: ${uploadRes.error || "Upload fehlgeschlagen."}`);
      }
    }

    setUploadingPostMedia(false);
    setPostMediaItems(nextItems);
    if (uploadErrors.length > 0) {
      setError(uploadErrors.slice(0, 2).join(" "));
    }
  };

  const removePostMediaItem = (index: number) => {
    setPostMediaItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const refreshPostSections = async () => {
    if (!userId) return;
    const [postsRes, analyticsRes] = await Promise.all([
      getProfilePosts(userId, userId, 12),
      getProfileAnalytics(userId),
    ]);

    if (postsRes.success) {
      setProfilePosts(
        (postsRes.posts || []).map((post: any) => ({
          id: Number(post.id),
          title: String(post.title || "").trim(),
          content: String(post.content || "").trim(),
          hashtags: Array.isArray(post.hashtags) ? post.hashtags.map((item: any) => String(item || "").trim()).filter(Boolean) : [],
          media_items: Array.isArray(post.media_items)
            ? post.media_items
                .map((item: any) => ({
                  url: String(item?.url || "").trim(),
                  mediaType: item?.mediaType === "video" ? "video" : "image",
                }))
                .filter((item: PostMediaItem) => item.url)
            : [],
          created_at: String(post.created_at || ""),
          comment_count: Number(post.comment_count || 0),
          save_count: Number(post.save_count || 0),
          like_count: Number(post.like_count || 0),
          liked_by_viewer: Boolean(post.liked_by_viewer),
          saved_by_viewer: Boolean(post.saved_by_viewer),
          moderation_status: String(post.moderation_status || "approved"),
        }))
      );
    }

    if (analyticsRes.success && analyticsRes.data) {
      setAnalytics({ ...EMPTY_ANALYTICS, ...analyticsRes.data });
    }
  };

  const handleCreatePost = async () => {
    if (!userId) return;
    resetStatus();
    setCreatingPost(true);

    const res = await createNetworkPost({
      userId,
      title: postTitle,
      content: postContent,
      hashtags: postHashtags,
      mediaItems: postMediaItems,
      groupId: null,
      postTarget: "profile",
    });

    setCreatingPost(false);
    if (!res.success) {
      setError(res.error || "Beitrag konnte nicht erstellt werden.");
      return;
    }

    setPostTitle("");
    setPostContent("");
    setPostHashtags("");
    setPostMediaItems([]);
    await refreshPostSections();
    setSuccess(res.moderationStatus === "pending" ? "Gruppenbeitrag wurde zur Freigabe eingereicht." : "Profil-Beitrag wurde veröffentlicht.");
  };

  const handleTogglePostLike = async (postId: number) => {
    if (!userId) return;
    resetStatus();
    const res = await toggleNetworkPostLike({ userId, postId });
    if (!res.success) {
      setError(res.error || "Like konnte nicht aktualisiert werden.");
      return;
    }
    await refreshPostSections();
  };

  const handleTogglePostSave = async (postId: number) => {
    if (!userId) return;
    resetStatus();
    const res = await toggleNetworkPostSave({ userId, postId });
    if (!res.success) {
      setError(res.error || "Speichern konnte nicht aktualisiert werden.");
      return;
    }
    await refreshPostSections();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-10">
        <p className="text-sm font-black uppercase tracking-widest text-slate-400">Profil wird geladen...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpenProfile={openProfile} role="nutzer" />

      <LoggedInHeader
        userId={userId}
        role="nutzer"
        userName={userName}
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenProfile={openProfile}
      />

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Status: Nutzerprofil</p>
              <h1 className="mt-2 text-3xl font-black italic uppercase">Profil bearbeiten</h1>
            </div>
            <div className="flex items-center gap-3">
              <Link href={userId ? `/profil/${userId}` : "/login"} className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
                Profil ansehen
              </Link>
              <button type="button" onClick={handleSave} disabled={saving} className="px-6 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-60">
                {saving ? "Speichert..." : "Änderungen speichern"}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Profil-Fortschritt</p>
              <p className="text-sm font-black text-emerald-600">{completion}%</p>
            </div>
            <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${completion}%` }} />
            </div>
          </div>

          {error && <p className="text-sm font-bold text-red-600">{error}</p>}
          {success && <p className="text-sm font-bold text-emerald-700">{success}</p>}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.9fr] gap-6">
          <div className="space-y-6">
            <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Persönliche Infos</p>
                <h2 className="mt-2 text-xl font-black italic uppercase">Basisdaten</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input value={vorname} onChange={(event) => setVorname(event.target.value)} placeholder="Vorname" className="p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold" />
                <input value={nachname} onChange={(event) => setNachname(event.target.value)} placeholder="Nachname" className="p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold" />
                <input value={plz} onChange={(event) => setPlz(event.target.value)} placeholder="PLZ" className="p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold" />
                <input value={ort} onChange={(event) => setOrt(event.target.value)} placeholder="Ort" className="p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold" />
              </div>

              <textarea value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Über mich / Was ich suche" className="w-full p-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 min-h-[140px] font-medium" />
            </section>

            <section className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 shadow-sm text-white space-y-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Pferde</p>
                <h2 className="mt-2 text-xl font-black italic uppercase">Meine Pferde</h2>
              </div>

              <div className="space-y-4">
                {pferde.map((pferd, index) => (
                  <article key={`pferd-${index}`} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Pferd {index + 1}</p>
                      {pferde.length > 1 && (
                        <button type="button" onClick={() => removePferd(index)} className="text-[10px] font-black uppercase tracking-widest text-red-300 hover:text-red-200">
                          Entfernen
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input value={pferd.name} onChange={(event) => updatePferd(index, "name", event.target.value)} placeholder="Name" className="p-3 rounded-xl border border-white/10 bg-white/5 font-bold outline-none" />
                      <input value={pferd.rasse} onChange={(event) => updatePferd(index, "rasse", event.target.value)} placeholder="Rasse" className="p-3 rounded-xl border border-white/10 bg-white/5 font-bold outline-none" />
                      <input value={pferd.alter} onChange={(event) => updatePferd(index, "alter", event.target.value)} placeholder="Alter" className="p-3 rounded-xl border border-white/10 bg-white/5 font-bold outline-none" />
                    </div>

                    <textarea value={pferd.beschreibung} onChange={(event) => updatePferd(index, "beschreibung", event.target.value)} placeholder="Beschreibung, Trainingsstand, Besonderheiten" rows={3} className="w-full p-4 rounded-xl border border-white/10 bg-white/5 font-medium outline-none resize-none" />

                    {pferd.bilder.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {pferd.bilder.map((url, imageIndex) => (
                          <div key={`${url}-${imageIndex}`} className="relative group rounded-xl overflow-hidden border border-white/10 bg-white/10">
                            <img src={url} alt={`Pferd ${index + 1}`} className="w-full h-28 object-cover" />
                            <button type="button" onClick={() => removeHorseImage(index, imageIndex)} className="absolute inset-x-0 bottom-0 h-8 bg-red-600/90 text-white text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                              Löschen
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <MediaDropzone
                      title="Pferdebilder hinzufügen"
                      description="Bilder hier ablegen oder per Klick auswählen."
                      accept="image/*"
                      multiple
                      disabled={uploadingHorseIndex === index || !userId}
                      buttonLabel={uploadingHorseIndex === index ? "Lädt..." : "Dateien auswählen"}
                      busyLabel="Lädt..."
                      onFiles={(files) => handleHorseImageUpload(index, files)}
                    />
                  </article>
                ))}
              </div>

              <button type="button" onClick={addPferd} className="px-5 py-3 rounded-xl bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100">
                Weiteres Pferd hinzufügen
              </button>
            </section>

            {gesuche.length > 0 && (
              <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Meine Suchanzeigen</p>
                  <h2 className="mt-2 text-xl font-black italic uppercase">Aktuelle Gesuche</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {gesuche.map((gesuch) => (
                    <article key={`${gesuch.kategorie}-${gesuch.titel}`} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">{gesuch.kategorie}</p>
                      <h3 className="text-base font-black italic uppercase text-slate-900">{gesuch.titel || "Ohne Titel"}</h3>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">{gesuch.inhalt || "Kein Inhalt hinterlegt."}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="space-y-6">
            <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-[2rem] border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                  <User size={34} className="text-slate-300" />
                </div>
                <h2 className="mt-4 text-xl font-black italic uppercase text-slate-900">{vorname || userName}</h2>
                <p className="mt-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <MapPin size={14} className="text-emerald-600" />
                  {[plz, ort].filter(Boolean).join(" ") || "Ort fehlt"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Follower</p>
                  <p className="mt-1 text-xl font-black text-slate-900">{profileStats.followerCount}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Folgt</p>
                  <p className="mt-1 text-xl font-black text-slate-900">{profileStats.followingCount}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gruppenhost</p>
                  <p className="mt-1 text-xl font-black text-slate-900">{profileStats.groupHostCount}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gruppen</p>
                  <p className="mt-1 text-xl font-black text-slate-900">{profileStats.groupMemberCount}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Bewertung</p>
                <p className="mt-1 text-xl font-black text-amber-900">{safeToFixed(profileStats.ratingAvg, 1)} ({profileStats.ratingCount})</p>
              </div>

              <button type="button" onClick={handleAddToWishlist} className="w-full px-4 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600">
                Profil merken
              </button>
            </section>

            <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Interessen</p>
                <h2 className="mt-2 text-xl font-black italic uppercase">Meine Themen</h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {ANGEBOT_KATEGORIEN.map((item) => {
                  const aktiv = interessen.includes(item.label);
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => toggleInteresse(item.label)}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${aktiv ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"}`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Profil</p>
                <h2 className="mt-2 text-xl font-black italic uppercase">Galerie</h2>
              </div>

              {galerie.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {galerie.map((item, idx) => (
                    <div key={`${item.url}-${idx}`} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group">
                      {item.type === "image" ? (
                        <img src={item.url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="relative w-full h-full">
                          <video src={item.url} className="w-full h-full object-cover" muted preload="metadata" playsInline />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent flex items-center justify-center">
                            <span className="w-7 h-7 rounded-full bg-black/60 border border-white/50 text-white flex items-center justify-center">
                              <Play size={12} fill="currentColor" />
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="absolute left-1 top-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleMoveGalerie(idx, "left")}
                          disabled={idx === 0}
                          className="w-6 h-6 rounded-md bg-white/90 text-slate-700 border border-slate-200 flex items-center justify-center disabled:opacity-40"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveGalerie(idx, "right")}
                          disabled={idx === galerie.length - 1}
                          className="w-6 h-6 rounded-md bg-white/90 text-slate-700 border border-slate-200 flex items-center justify-center disabled:opacity-40"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteGalerie(idx)}
                        className="absolute inset-x-0 bottom-0 h-7 bg-red-600/90 text-white text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Löschen
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Noch keine Galerie-Dateien vorhanden.</p>
              )}

              <MediaDropzone
                title="Bilder / Videos hinzufügen"
                description="Ziehe Medien in das Feld oder klicke, um Dateien zu suchen."
                accept="image/*,video/*"
                multiple
                disabled={uploadingGalerie || !userId}
                buttonLabel={uploadingGalerie ? "Lade hoch..." : "Dateien auswählen"}
                busyLabel="Lade hoch..."
                onFiles={handleGalerieUpload}
              />
            </section>

            <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Verifizierung</p>
                <h2 className="mt-2 text-xl font-black italic uppercase">Ausweis & Zertifikate</h2>
                <p className="mt-2 text-sm text-slate-600">Diese Dateien werden im Adminbereich angezeigt und dort freigegeben.</p>
              </div>

              {uploadedIdDocs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ausweisdateien</p>
                  <div className="flex flex-wrap gap-2">
                    {uploadedIdDocs.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-700 underline underline-offset-2">
                        {url.split('/').pop() || 'Ausweis'}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <MediaDropzone
                title="Ausweis hochladen"
                description="Foto, Scan oder PDF. Die Datei ist danach im Adminbereich sichtbar."
                accept="image/*,.pdf"
                multiple
                disabled={uploadingDocuments || !userId}
                buttonLabel={uploadingDocuments ? "Lädt..." : "Ausweis auswählen"}
                busyLabel="Lädt..."
                onFiles={handleIdDocUpload}
              />

              {uploadedCertificates.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Zertifikatsdateien</p>
                  <div className="flex flex-wrap gap-2">
                    {uploadedCertificates.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-700 underline underline-offset-2">
                        {url.split('/').pop() || 'Zertifikat'}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <MediaDropzone
                title="Zertifikate hochladen"
                description="Urkunden und Nachweise zur Admin-Prüfung."
                accept="image/*,.pdf"
                multiple
                disabled={uploadingDocuments || !userId}
                buttonLabel={uploadingDocuments ? "Lädt..." : "Zertifikate auswählen"}
                busyLabel="Lädt..."
                onFiles={handleCertificateUpload}
              />
            </section>

            <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Profil Analyse</p>
                <h2 className="mt-2 text-xl font-black italic uppercase">Aktivität</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Profilaufrufe gesamt</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{analytics.profileViewsTotal}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Profilaufrufe 30 Tage</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{analytics.profileViews30d}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Eindeutige Besucher</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{analytics.uniqueVisitors30d}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chat-Partner</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{analytics.uniqueChatPartners}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chats gesamt</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{analytics.chatsTotal}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Profil-Beiträge</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{analytics.profilePostsTotal}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Eingehende Nachrichten 30 Tage</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{analytics.incomingMessages30d}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ausgehende Nachrichten 30 Tage</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{analytics.outgoingMessages30d}</p>
                </div>
              </div>
            </section>
          </div>
        </div>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Beiträge</p>
            <h2 className="mt-2 text-xl font-black italic uppercase">Profil und Gruppen</h2>
          </div>

          <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-bold text-slate-500">Hier erstellst du nur Profilbeiträge. Gruppenbeiträge werden direkt in der jeweiligen Gruppe erstellt.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={postTitle} onChange={(event) => setPostTitle(event.target.value)} placeholder="Titel" className="p-3 rounded-xl border border-slate-200 bg-white font-bold" />
              <input value={postHashtags} onChange={(event) => setPostHashtags(event.target.value)} placeholder="#dressur #gesuch" className="p-3 rounded-xl border border-slate-200 bg-white font-bold" />
            </div>

            <textarea value={postContent} onChange={(event) => setPostContent(event.target.value)} rows={5} placeholder="Was möchtest du teilen?" className="w-full p-4 rounded-[1.5rem] border border-slate-200 bg-white font-medium resize-none" />

            <div className="flex flex-wrap items-center gap-3">
              <MediaDropzone
                title="Bilder oder Videos"
                description="Ziehe Medien hier hinein oder wähle Dateien aus deinem System aus."
                accept="image/*,video/*"
                multiple
                disabled={uploadingPostMedia || !userId}
                buttonLabel={uploadingPostMedia ? "Lädt..." : "Dateien auswählen"}
                busyLabel="Lädt..."
                onFiles={handlePostMediaUpload}
              />
              <button type="button" onClick={handleCreatePost} disabled={creatingPost || uploadingPostMedia} className="px-5 py-3 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-60">
                {creatingPost ? "Veröffentlicht..." : "Beitrag erstellen"}
              </button>
            </div>

            {postMediaItems.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {postMediaItems.map((item, index) => (
                  <div key={`${item.url}-${index}`} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-[10px] font-black uppercase text-slate-600">
                    <span>{item.mediaType === "video" ? "Video" : "Bild"} {index + 1}</span>
                    <button type="button" onClick={() => removePostMediaItem(index)} className="text-red-500">x</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Beiträge unter meinem Profil</h3>
            {profilePosts.length === 0 ? (
              <p className="text-sm font-bold text-slate-400">Noch keine Profil-Beiträge vorhanden.</p>
            ) : (
              <div className="space-y-3">
                {profilePosts.map((post) => (
                  <article key={post.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-base font-black uppercase italic text-slate-900">{post.title}</p>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{new Date(post.created_at).toLocaleString("de-DE")}</p>
                      </div>
                      {post.moderation_status !== "approved" && (
                        <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black uppercase">Wartet auf Freigabe</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{post.content}</p>

                    {post.media_items.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {post.media_items.map((item, index) => (
                          <span key={`${item.url}-${index}`} className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-[10px] font-black uppercase text-slate-600">
                            {item.mediaType === "video" ? "Video" : "Bild"} {index + 1}
                          </span>
                        ))}
                      </div>
                    )}

                    {post.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {post.hashtags.map((tag) => (
                          <span key={`${post.id}-${tag}`} className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[10px] font-black uppercase text-emerald-700">{tag}</span>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <span>{post.comment_count} Kommentare</span>
                      <span>{post.like_count} Likes</span>
                      <span>{post.save_count} Merkliste</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button type="button" onClick={() => handleTogglePostLike(post.id)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-200 bg-white text-slate-700">
                        {post.liked_by_viewer ? "Geliked" : "Liken"}
                      </button>
                      <button type="button" onClick={() => handleTogglePostSave(post.id)} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-200 bg-white text-slate-700">
                        {post.saved_by_viewer ? "Gespeichert" : "Speichern"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
