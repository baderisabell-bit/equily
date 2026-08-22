"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import {
  bookExpertCalendarSlot,
  getAvailableCalendarSlotsForStudent,
  getPrivateSettingsData,
  getUserPromotionSettings,
  getStoredProfileData,
  getUserSubscriptionSettings,
  getUserBookings,
  purchaseVisibilityPromotion,
  getOwnAdvertisingSubmissions,
  requestOwnSubscriptionCancellation,
  submitOwnAdvertising,
  saveGalerieItems,
  deleteOwnAccount,
  uploadOwnAdvertisingMedia,
  upsertUserSubscriptionSettings,
  updatePrivateSettingsData,
  uploadGalerieMedia,
} from "../actions";
import { getPendingSwipeConfirmationsForStudent } from "../actions-bridge";
import LoggedInHeader from "../components/logged-in-header";
import MediaDropzone from "../components/media-dropzone";
import { clearOptionalStorageData, getStorageConsentChoice, setStorageConsentChoice, type StorageConsentChoice } from "../lib/storage-consent";

type Booking = {
  id: number;
  booking_type: string | null;
  provider_name: string | null;
  booking_date: string | null;
  status: string;
  location: string | null;
  notes: string | null;
  created_at: string;
};

type SwipeConfirmationItem = {
  id: number;
  booking_id: number;
  expires_at: string;
  booking_date: string;
  service_title: string;
  total_cents: number;
  currency: string;
  booking_status: string;
  expert_name: string | null;
  confirm_url: string;
};

type GalerieItem = {
  type: "image" | "video";
  url: string;
};

type SubscriptionData = {
  role: "nutzer" | "experte";
  plan_key: string;
  plan_label?: string;
  payment_method: "sepa" | "paypal";
  monthly_price_cents: number;
  status: string;
  started_at?: string | null;
  next_charge_at?: string | null;
  cancel_requested_at?: string | null;
  cancel_effective_at?: string | null;
  cancel_reason?: string | null;
  cancelled_at?: string | null;
  sepa_account_holder?: string | null;
  sepa_iban?: string | null;
  paypal_email?: string | null;
};

type PromotionOption = {
  scope: "angebote" | "suchen" | "wochenwerbung";
  label: string;
  durationDays: number;
  chargeCents: number;
  allowed: boolean;
  reason: string;
  includedAvailable: boolean;
  usageCount: number;
  activeUntil?: string | null;
  paymentMethod: "sepa" | "paypal";
  planKey: string;
  planLabel: string;
};

type PromotionSettings = {
  role: "nutzer" | "experte";
  plan_key: string;
  plan_label: string;
  payment_method: "sepa" | "paypal";
  options: PromotionOption[];
};

type CalendarSlot = {
  id: number;
  expert_id: number;
  release_month: string | null;
  slot_start: string;
  duration_minutes: number;
  service_title: string;
  unit_price_cents: number;
  location: string | null;
  notes: string | null;
  expert_name: string | null;
};

type AdvertisingSubmission = {
  id: number;
  title: string;
  description: string | null;
  media_url: string;
  target_url: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  reviewed_at: string | null;
  created_at: string;
};

const MAX_GALERIE_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_GALERIE_VIDEO_BYTES = 120 * 1024 * 1024;

const validateGalerieFile = (file: File) => {
  const mime = String(file.type || "").toLowerCase();
  const isImage = mime.startsWith("image/");
  const isVideo = mime.startsWith("video/");
  if (!isImage && !isVideo) {
    return "Nur Bilder und Videos sind erlaubt.";
  }
  if (isImage && file.size > MAX_GALERIE_IMAGE_BYTES) {
    return "Bild zu gross (max. 20 MB).";
  }
  if (isVideo && file.size > MAX_GALERIE_VIDEO_BYTES) {
    return "Video zu gross (max. 120 MB).";
  }
  return null;
};

const formatEuro = (cents: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format((cents || 0) / 100);

export default function EinstellungenPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [userName, setUserName] = useState('Profil');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [role, setRole] = useState<"nutzer" | "experte" | "unknown">("unknown");
  const [consentChoice, setConsentChoice] = useState<StorageConsentChoice | null>(null);
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  const [formData, setFormData] = useState({
    vorname: "",
    nachname: "",
    email: "",
    unternehmensname: "",
    birthDate: "",
    privatStrasse: "",
    privatPlz: "",
    privatOrt: ""
  });

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [swipeItems, setSwipeItems] = useState<SwipeConfirmationItem[]>([]);
  const [galerie, setGalerie] = useState<GalerieItem[]>([]);
  const [uploadingGalerie, setUploadingGalerie] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [subscriptionSaving, setSubscriptionSaving] = useState(false);
  const [subscriptionCancelBusy, setSubscriptionCancelBusy] = useState(false);
  const [subscriptionCancelReason, setSubscriptionCancelReason] = useState("");
  const [promotionSettings, setPromotionSettings] = useState<PromotionSettings | null>(null);
  const [promotionScopeSaving, setPromotionScopeSaving] = useState<string | null>(null);
  const [calendarSlots, setCalendarSlots] = useState<CalendarSlot[]>([]);
  const [calendarBookingId, setCalendarBookingId] = useState<number | null>(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("");
  const [deletePasswordInput, setDeletePasswordInput] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteCooldownActive, setDeleteCooldownActive] = useState(false);
  const [adTitle, setAdTitle] = useState("");
  const [adDescription, setAdDescription] = useState("");
  const [adTargetUrl, setAdTargetUrl] = useState("");
  const [adMediaUrl, setAdMediaUrl] = useState("");
  const [adUploading, setAdUploading] = useState(false);
  const [adSubmitting, setAdSubmitting] = useState(false);
  const [adItems, setAdItems] = useState<AdvertisingSubmission[]>([]);

  useEffect(() => {
    const currentRole = sessionStorage.getItem("userRole");
    const userIdRaw = sessionStorage.getItem("userId");
    if (!userIdRaw) {
      router.push("/login");
      return;
    }

    const id = parseInt(userIdRaw, 10);
    if (Number.isNaN(id)) {
      router.push("/login");
      return;
    }

    setRole(currentRole === "experte" ? "experte" : "nutzer");
    setUserName(sessionStorage.getItem("userName") || (currentRole === "experte" ? "Experte" : "Nutzer"));
    setUserId(id);
    setConsentChoice(getStorageConsentChoice());

    const load = async () => {
      setLoading(true);
      const [profileRes, bookingsRes, swipeRes, storedProfileRes, subscriptionRes, promotionRes, calendarRes] = await Promise.all([
        getPrivateSettingsData(id),
        getUserBookings(id),
        getPendingSwipeConfirmationsForStudent(id),
        getStoredProfileData(id),
        getUserSubscriptionSettings(id),
        getUserPromotionSettings(id),
        getAvailableCalendarSlotsForStudent(id),
      ]);

      if (!profileRes.success || !profileRes.data) {
        setError(profileRes.error || "Private Daten konnten nicht geladen werden.");
        setLoading(false);
        return;
      }

      setFormData({
        vorname: profileRes.data.vorname || "",
        nachname: profileRes.data.nachname || "",
        email: profileRes.data.email || "",
        unternehmensname: profileRes.data.unternehmensname || "",
        birthDate: profileRes.data.birth_date || "",
        privatStrasse: profileRes.data.privat_strasse || "",
        privatPlz: profileRes.data.privat_plz || "",
        privatOrt: profileRes.data.privat_ort || ""
      });

      if (bookingsRes.success && Array.isArray(bookingsRes.items)) {
        setBookings(bookingsRes.items as Booking[]);
      }

      if (swipeRes.success && Array.isArray(swipeRes.items)) {
        setSwipeItems(swipeRes.items as SwipeConfirmationItem[]);
      }

      if (storedProfileRes.success && storedProfileRes.data?.profil_data && Array.isArray(storedProfileRes.data.profil_data.galerie)) {
        setGalerie(
          storedProfileRes.data.profil_data.galerie
            .map((item: any) => ({
              type: (String(item?.type || "image") === "video" ? "video" : "image") as "image" | "video",
              url: String(item?.url || "").trim(),
            }))
            .filter((item: GalerieItem) => item.url.length > 0)
        );
      }

      if (storedProfileRes.success && storedProfileRes.data?.role) {
        const resolvedRole = String(storedProfileRes.data.role).trim().toLowerCase() === 'experte' ? 'experte' : 'nutzer';
        setRole(resolvedRole);
        sessionStorage.setItem('userRole', resolvedRole);
      }

      if (subscriptionRes.success && subscriptionRes.data) {
        setSubscription(subscriptionRes.data as SubscriptionData);
      }

      if (promotionRes.success && promotionRes.data) {
        setPromotionSettings(promotionRes.data as PromotionSettings);
      }

      if (calendarRes.success && Array.isArray(calendarRes.items)) {
        setCalendarSlots(calendarRes.items as CalendarSlot[]);
      }

      setLoading(false);
    };

    load();
  }, [router]);

  useEffect(() => {
    if (!userId || role !== "experte") {
      setAdItems([]);
      return;
    }

    getOwnAdvertisingSubmissions(userId).then((res) => {
      if (!res.success) return;
      setAdItems((res.items || []) as AdvertisingSubmission[]);
    });
  }, [role, userId]);

  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
      const aDate = new Date(a.booking_date || a.created_at).getTime();
      const bDate = new Date(b.booking_date || b.created_at).getTime();
      return bDate - aDate;
    });
  }, [bookings]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSuccess("");
    setError("");
  };

  const handleSave = async () => {
    if (!userId) return;

    setSaving(true);
    setError("");
    setSuccess("");

    const res = await updatePrivateSettingsData({
      userId,
      vorname: formData.vorname,
      nachname: formData.nachname,
      email: formData.email,
      unternehmensname: formData.unternehmensname,
      birthDate: formData.birthDate,
      privatStrasse: formData.privatStrasse,
      privatPlz: formData.privatPlz,
      privatOrt: formData.privatOrt,
      passwordConfirmation: passwordConfirmation || undefined
    });

    setSaving(false);

    if (!res.success) {
      setError(res.error || "Speichern fehlgeschlagen.");
      return;
    }

    sessionStorage.setItem("userName", `${formData.vorname} ${formData.nachname}`.trim());
    setPasswordConfirmation("");
    setSuccess("Private Daten erfolgreich aktualisiert.");
  };

  const updateConsentChoice = (choice: StorageConsentChoice) => {
    setStorageConsentChoice(choice);
    if (choice === 'necessary') {
      clearOptionalStorageData();
    }
    setConsentChoice(choice);
    setSuccess(choice === 'accepted' ? 'Optionale Komfortspeicher wurden aktiviert.' : 'Nur notwendige Speicher bleiben aktiv. Optionale Komfortdaten wurden entfernt.');
    setError("");
  };

  const handleGalerieUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !userId) return;

    setError("");
    setSuccess("");
    setUploadingGalerie(true);
    const newItems: GalerieItem[] = [...galerie];
    let uploadedCount = 0;

    const fileErrors: string[] = [];
    for (const file of Array.from(files).slice(0, Math.max(0, 20 - galerie.length))) {
      const validationError = validateGalerieFile(file);
      if (validationError) {
        fileErrors.push(`${file.name}: ${validationError}`);
        continue;
      }
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await uploadGalerieMedia(userId, fd);
      if (uploadRes.success && uploadRes.url) {
        newItems.push({
          type: uploadRes.mediaType === "video" ? "video" : "image",
          url: String(uploadRes.url),
        });
        uploadedCount += 1;
      } else if (!uploadRes.success) {
        fileErrors.push(`${file.name}: ${uploadRes.error || "Upload fehlgeschlagen."}`);
      }
    }

    if (uploadedCount === 0) {
      setUploadingGalerie(false);
      if (fileErrors.length > 0) {
        setError(fileErrors.slice(0, 2).join(" "));
      }
      event.target.value = "";
      return;
    }

    const saveRes = await saveGalerieItems(userId, newItems);
    setUploadingGalerie(false);

    if (!saveRes.success) {
      setError(saveRes.error || "Galerie konnte nicht gespeichert werden.");
      return;
    }

    setGalerie(newItems);
    setSuccess("Galerie aktualisiert.");
    if (fileErrors.length > 0) {
      setError(fileErrors.slice(0, 2).join(" "));
    }
    event.target.value = "";
  };

  const handleGalerieMove = async (index: number, direction: "left" | "right") => {
    if (!userId) return;
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

  const handleGalerieDelete = async (index: number) => {
    if (!userId) return;
    const next = galerie.filter((_, i) => i !== index);
    const saveRes = await saveGalerieItems(userId, next);
    if (!saveRes.success) {
      setError(saveRes.error || "Galerie konnte nicht aktualisiert werden.");
      return;
    }
    setGalerie(next);
    setSuccess("Galerie aktualisiert.");
  };

  const switchSubscriptionPayment = async (paymentMethod: "sepa" | "paypal") => {
    if (!userId || !subscription) return;
    setSubscriptionSaving(true);
    setError("");

    const res = await upsertUserSubscriptionSettings({
      userId,
      role: subscription.role,
      paymentMethod,
      sepaAccountHolder: subscription.sepa_account_holder || '',
      sepaIban: subscription.sepa_iban || '',
      paypalEmail: subscription.paypal_email || formData.email,
    });

    setSubscriptionSaving(false);
    if (!res.success) {
      setError(res.error || 'Abo konnte nicht aktualisiert werden.');
      return;
    }

    const reloadRes = await getUserSubscriptionSettings(userId);
    if (reloadRes.success && reloadRes.data) {
      setSubscription(reloadRes.data as SubscriptionData);
    }
    setSuccess('Abo-Zahlungsart aktualisiert.');
  };

  const requestSubscriptionCancellation = async () => {
    if (!userId || !subscription) return;
    const confirmed = window.confirm("Abo wirklich kündigen? Die Kündigung wird zum nächsten Abrechnungsdatum wirksam, wenn sie mindestens 3 Tage vorher eingeht.");
    if (!confirmed) return;

    setSubscriptionCancelBusy(true);
    setError("");
    setSuccess("");

    const res = await requestOwnSubscriptionCancellation({
      userId,
      reason: subscriptionCancelReason,
    });

    setSubscriptionCancelBusy(false);

    if (!res.success) {
      setError(res.error || "Kündigung konnte nicht gespeichert werden.");
      return;
    }

    const reloadRes = await getUserSubscriptionSettings(userId);
    if (reloadRes.success && reloadRes.data) {
      setSubscription(reloadRes.data as SubscriptionData);
    }

    if ((res as any).alreadyRequested) {
      setSuccess(`Kündigung ist bereits vorgemerkt. Wirksam zum ${formatDate((res as any).effectiveAt || null)}.`);
      return;
    }

    setSuccess(`Kündigung vorgemerkt. Wirksam zum ${formatDate((res as any).effectiveAt || null)}.`);
  };

  const handlePromotionPurchase = async (scope: PromotionOption["scope"], label: string) => {
    if (!userId) return;
    setPromotionScopeSaving(scope);
    setError("");

    const res = await purchaseVisibilityPromotion({ userId, scope });
    setPromotionScopeSaving(null);

    if (!res.success) {
      setError(res.error || 'Marketingaktion konnte nicht gebucht werden.');
      return;
    }

    const promotionRes = await getUserPromotionSettings(userId);
    if (promotionRes.success && promotionRes.data) {
      setPromotionSettings(promotionRes.data as PromotionSettings);
    }

    const priceText = res.included
      ? 'inklusive in deinem Tarif.'
      : `${formatEuro(res.chargeCents || 0)} über ${res.paymentMethod === 'paypal' ? 'PayPal' : 'SEPA'} vorgemerkt.`;
    setSuccess(`${label} gebucht. Aktiv bis ${formatDate(res.endsAt || null)} - ${priceText}`);
  };

  const handleBookCalendarSlot = async (slotId: number) => {
    if (!userId) return;
    setCalendarBookingId(slotId);
    setError("");

    const res = await bookExpertCalendarSlot({ studentId: userId, slotId });
    setCalendarBookingId(null);

    if (!res.success) {
      setError(res.error || "Termin konnte nicht gebucht werden.");
      return;
    }

    const [calendarRes, bookingsRes] = await Promise.all([
      getAvailableCalendarSlotsForStudent(userId),
      getUserBookings(userId),
    ]);
    if (calendarRes.success && Array.isArray(calendarRes.items)) {
      setCalendarSlots(calendarRes.items as CalendarSlot[]);
    }
    if (bookingsRes.success && Array.isArray(bookingsRes.items)) {
      setBookings(bookingsRes.items as Booking[]);
    }
    setSuccess(`Termin gebucht. Eingetragen für ${formatDate(res.slotStart || null)}.`);
  };

  const handleDeleteAccount = async () => {
    if (!userId || deletingAccount || deleteCooldownActive) return;

    setError("");
    setSuccess("");

    const confirmed = window.confirm("Möchtest du dein Profil wirklich dauerhaft löschen? Dieser Schritt kann nicht rückgängig gemacht werden.");
    if (!confirmed) return;

    setDeleteCooldownActive(true);
    setTimeout(() => setDeleteCooldownActive(false), 3000);

    setDeletingAccount(true);
    const res = await deleteOwnAccount({ userId, confirmation: deleteConfirmationInput, currentPassword: deletePasswordInput });
    setDeletingAccount(false);

    if (!res.success) {
      setError(res.error || "Konto konnte nicht gelöscht werden.");
      return;
    }

    sessionStorage.clear();
    window.location.href = "/";
  };

  const handleAdMediaFiles = async (files: File[]) => {
    if (!userId || files.length === 0) return;

    setAdUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", files[0]);
    const res = await uploadOwnAdvertisingMedia(userId, fd);
    setAdUploading(false);

    if (!res.success || !res.url) {
      setError(res.error || "Werbebild konnte nicht hochgeladen werden.");
      return;
    }

    setAdMediaUrl(String(res.url));
    setSuccess("Werbebild hochgeladen.");
  };

  const handleSubmitAdvertising = async () => {
    if (!userId || adSubmitting) return;

    setAdSubmitting(true);
    setError("");
    setSuccess("");
    const res = await submitOwnAdvertising({
      userId,
      title: adTitle,
      description: adDescription,
      mediaUrl: adMediaUrl,
      targetUrl: adTargetUrl,
    });
    setAdSubmitting(false);

    if (!res.success) {
      setError(res.error || "Werbung konnte nicht eingereicht werden.");
      return;
    }

    setAdTitle("");
    setAdDescription("");
    setAdTargetUrl("");
    setAdMediaUrl("");
    setSuccess("Werbung wurde zur Prüfung eingereicht.");

    const listRes = await getOwnAdvertisingSubmissions(userId);
    if (listRes.success) {
      setAdItems((listRes.items || []) as AdvertisingSubmission[]);
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

  const currentRole = (typeof window !== "undefined" ? sessionStorage.getItem("userRole") : null) || role;
  const normalizedRole = String(currentRole || role).trim().toLowerCase();
  const isExpertRole = Boolean(normalizedRole) && !["nutzer", "user", "kunde"].includes(normalizedRole);
  const profileHref = userId && userId > 0 ? `/profil/${userId}` : "/login";

  const handleLogout = () => {
    sessionStorage.clear();
    window.location.href = "/";
  };

  const formatDate = (value: string | null) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleString("de-DE");
  };

  const scrollToSection = (sectionId: string) => {
    const target = document.getElementById(sectionId);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const profileLink = userId && userId > 0 ? `/profil/${userId}` : "/login";
  const dashboardLink = currentRole === "experte" ? "/dashboard/experte" : "/dashboard/nutzer";

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-10">
        <p className="text-sm font-black uppercase tracking-widest text-slate-400">Einstellungen werden geladen...</p>
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
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/merkliste'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Merkliste</button>
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/nachrichten'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Nachrichten</button>
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/einstellungen'; }} className="block text-left text-lg font-black italic uppercase text-emerald-600">Einstellungen</button>
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/kontakt'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Kontakt & FAQ</button>
        </nav>
        <button onClick={handleLogout} className="mt-auto p-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">Abmelden</button>
      </aside>

      <LoggedInHeader
        userId={userId}
        role={role === "experte" ? "experte" : "nutzer"}
        userName={userName}
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenProfile={openProfile}
        brandText="Equily"
      />

      <main className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-8">
        <aside className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm h-fit xl:sticky xl:top-8 space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Navigation</p>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2">
            <p className="px-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Einstellungen</p>
            <button type="button" onClick={() => scrollToSection("section-private-data")} className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">Private personenbezogene Daten</button>
            <button type="button" onClick={() => scrollToSection("section-password-access")} className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">Passwort & Zugang</button>
            <button type="button" onClick={() => scrollToSection("section-delete-profile")} className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">Profil dauerhaft löschen</button>
            <button type="button" onClick={() => scrollToSection("section-cookies")} className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">Cookies</button>
            <button type="button" onClick={() => scrollToSection("section-gallery")} className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">Profil Galerie</button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2">
            <p className="px-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Verwaltung</p>
            <button type="button" onClick={() => scrollToSection("section-marketing")} className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">Marketing & Sichtbarkeit</button>
            {isExpertRole && (
              <button type="button" onClick={() => scrollToSection("section-ads")} className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">Werbung</button>
            )}
          </div>

          <div className="px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-[10px] font-black uppercase tracking-widest text-emerald-700 text-center">
            Einstellungen aktiv
          </div>
        </aside>

        <div className="space-y-8">
          <div className="grid grid-cols-1 2xl:grid-cols-[1fr_1fr] gap-8">
        <section id="section-private-data" className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Einstellungen</p>
            <h1 className="mt-2 text-3xl font-black italic uppercase tracking-tight text-slate-900">Private personenbezogene Daten</h1>
            <p className="mt-2 text-sm font-medium text-slate-600">
                Diese Angaben werden nur kontobezogen gespeichert und sind nicht öffentlich in deinem Profil sichtbar.
            </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                Private Daten werden nicht öffentlich angezeigt und nicht an andere Nutzer weitergegeben.
              </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              id="settings-vorname"
              name="settings-vorname"
              type="text"
              value={formData.vorname}
              onChange={(e) => handleChange("vorname", e.target.value)}
              placeholder="Vorname"
              className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:border-emerald-300"
            />
            <input
              id="settings-nachname"
              name="settings-nachname"
              type="text"
              value={formData.nachname}
              onChange={(e) => handleChange("nachname", e.target.value)}
              placeholder="Nachname"
              className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:border-emerald-300"
            />
          </div>

          <input
            id="settings-unternehmensname"
            name="settings-unternehmensname"
            type="text"
            value={formData.unternehmensname}
            onChange={(e) => handleChange("unternehmensname", e.target.value)}
            placeholder="Unternehmensname (optional)"
            className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:border-emerald-300"
          />

          <div>
            <label htmlFor="settings-birthDate" className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">Geburtsdatum</label>
            <input
              id="settings-birthDate"
              name="settings-birthDate"
              type="date"
              value={formData.birthDate}
              onChange={(e) => handleChange("birthDate", e.target.value)}
              className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:border-emerald-300"
            />
            <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Nicht öffentlich. Wird für Geburtstagsnewsletter verwendet.
            </p>
          </div>

          <input
            id="settings-email"
            name="settings-email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="E-Mail"
            className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:border-emerald-300"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              id="settings-privatStrasse"
              name="settings-privatStrasse"
              type="text"
              value={formData.privatStrasse}
              onChange={(e) => handleChange("privatStrasse", e.target.value)}
              placeholder="Private Straße"
              className="md:col-span-2 w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:border-emerald-300"
            />
            <input
              type="text"
              value={formData.privatPlz}
              onChange={(e) => handleChange("privatPlz", e.target.value)}
              placeholder="PLZ"
              className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:border-emerald-300"
            />
          </div>

          <input
            type="text"
            value={formData.privatOrt}
            onChange={(e) => handleChange("privatOrt", e.target.value)}
            placeholder="Ort"
            className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:border-emerald-300"
          />

          <div className="border-t border-slate-200 pt-6">
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">
              Änderungen speichern - Passwort erforderlich
            </label>
            <input
              type="password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              placeholder="Passwort zur Bestätigung"
              className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:border-emerald-300"
            />
            <p className="mt-2 text-[11px] font-medium text-slate-600">
              Gib dein Passwort ein, um die Änderungen zu bestätigen.
            </p>
          </div>

          {error && (
            <p className="text-[11px] font-bold uppercase tracking-widest text-red-600">{error}</p>
          )}
          {success && (
            <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">{success}</p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full md:w-auto px-8 py-4 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-500 disabled:opacity-60"
          >
            {saving ? "Speichere..." : "Private Daten speichern"}
          </button>

          <div id="section-password-access" className="pt-6 border-t border-slate-100 space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Sicherheit</p>
              <h2 className="mt-2 text-xl font-black italic uppercase tracking-tight text-slate-900">Passwort & Zugang</h2>
              <p className="mt-2 text-sm font-medium text-slate-600">
                Das Zurücksetzen deines Passworts erreichst du ausschließlich hier in den Einstellungen.
              </p>
              <div className="mt-3">
                <Link href="/passwort-vergessen" className="inline-flex px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
                  Passwort jetzt zurücksetzen
                </Link>
              </div>
            </div>

            {subscription !== null && false && <div id="section-subscription" className="pt-6 border-t border-slate-100">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Abo & Zahlung</p>
                <h2 className="mt-2 text-xl font-black italic uppercase tracking-tight text-slate-900">Tarifverwaltung & Abrechnung</h2>
                <p className="mt-2 text-sm font-medium text-slate-600">
                  Verwalte dein Abo, eine Zahlungsart mit SEPA (günstiger) oder PayPal und sieh deine Rechnungen ein.
                </p>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  Kündigungen müssen spätestens 3 Tage vor Abo-Ende eingehen. Abbuchung erfolgt immer am gleichen Kalendertag wie beim Abschluss.
                </p>
              </div>

              {subscription ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                      Aktives Abo
                    </p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
                      Plan: {subscription!.plan_label || subscription!.plan_key} · Status: {subscription!.status}
                    </p>
                  </div>
                  <p className="text-xl font-black italic uppercase text-emerald-900">{formatEuro(subscription!.monthly_price_cents)} / Monat</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Zahlungsart: {subscription!.payment_method === 'sepa' ? 'SEPA Lastschrift (günstiger)' : 'PayPal (mit Zahlungsgebühren)'}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Nächste Abbuchung: {formatDate(subscription!.next_charge_at || null)}
                  </p>
                  {subscription!.cancel_requested_at && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                      Kündigung vorgemerkt am {formatDate(subscription!.cancel_requested_at || null)} · Wirksam zum {formatDate(subscription!.cancel_effective_at || null)}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => switchSubscriptionPayment('sepa')}
                      disabled={subscriptionSaving || subscription!.payment_method === 'sepa'}
                      className="px-4 py-2 rounded-xl border border-emerald-300 text-[10px] font-black uppercase tracking-widest text-emerald-700 disabled:opacity-50 hover:bg-emerald-100"
                    >
                      Auf SEPA wechseln
                    </button>
                    <button
                      type="button"
                      onClick={() => switchSubscriptionPayment('paypal')}
                      disabled={subscriptionSaving || subscription!.payment_method === 'paypal'}
                      className="px-4 py-2 rounded-xl border border-emerald-300 text-[10px] font-black uppercase tracking-widest text-emerald-700 disabled:opacity-50 hover:bg-emerald-100"
                    >
                      Auf PayPal wechseln
                    </button>
                    <Link href="/widerrufsformular" className="px-4 py-2 rounded-xl border border-amber-300 bg-white text-[10px] font-black uppercase tracking-widest text-amber-700 hover:bg-amber-50">
                      Abo kündigen
                    </Link>
                  </div>
                  {subscription!.monthly_price_cents > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Kündigung</p>
                      <input
                        type="text"
                        value={subscriptionCancelReason}
                        onChange={(e) => setSubscriptionCancelReason(e.target.value)}
                        placeholder="Optionaler Kündigungsgrund"
                        className="w-full p-3 rounded-xl border border-amber-200 bg-white text-sm font-medium outline-none"
                      />
                      <button
                        type="button"
                        onClick={requestSubscriptionCancellation}
                        disabled={subscriptionCancelBusy || subscription!.status === 'cancel_pending'}
                        className="px-4 py-2 rounded-xl border border-amber-400 bg-white text-[10px] font-black uppercase tracking-widest text-amber-700 disabled:opacity-60"
                      >
                        {subscriptionCancelBusy ? 'Kündige...' : subscription!.status === 'cancel_pending' ? 'Kündigung vorgemerkt' : 'Abo kündigen'}
                      </button>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Frist: mindestens 3 Tage vor dem nächsten Abbuchungstermin.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Kein Abo aktiv</p>
                  <p className="text-sm text-slate-700">
                    Mit einem Abo kannst du deine Suchen oder Angebote hochschieben und erhältst zusätzliche Vorteile.
                  </p>
                </div>
              )}
            </div>}

            <div id="section-cookies" className="pt-6 border-t border-slate-100">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Cookies & Speicher</p>
                <h2 className="mt-2 text-xl font-black italic uppercase tracking-tight text-slate-900">Deine Auswahl verwalten</h2>
                <p className="mt-2 text-sm font-medium text-slate-600">
                  Notwendige Speicher bleiben aktiv, damit Login und Portal funktionieren. Optionale Speicher betreffen nur Komfortfunktionen.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => updateConsentChoice('necessary')}
                  className={`px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest ${consentChoice === 'necessary' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'}`}
                >
                  Nur notwendige
                </button>
                <button
                  type="button"
                  onClick={() => updateConsentChoice('accepted')}
                  className={`px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest ${consentChoice === 'accepted' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'}`}
                >
                  Alle akzeptieren
                </button>
              </div>

              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Aktueller Status: {consentChoice === 'accepted' ? 'Alle Speicher erlaubt' : consentChoice === 'necessary' ? 'Nur notwendige Speicher' : 'Noch keine Auswahl gespeichert'}
              </p>

              <div className="flex flex-wrap gap-3">
                <Link href="/cookies" className="px-4 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
                  Cookies & Speicher
                </Link>
                <Link href="/agb" className="px-4 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
                  AGB
                </Link>
                <Link href="/datenschutz" className="px-4 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
                  Datenschutz
                </Link>
                <Link href="/impressum" className="px-4 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
                  Impressum
                </Link>
              </div>
            </div>

            <div id="section-marketing" className="pt-6 border-t border-slate-100">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Marketing & Sichtbarkeit</p>
                <h2 className="mt-2 text-xl font-black italic uppercase tracking-tight text-slate-900">Pushes und Startseitenwerbung</h2>
                <p className="mt-2 text-sm font-medium text-slate-600">
                  Hier buchst du dein Hochpushen in der Suche und Startseitenwerbung. Die Startseitenwerbung läuft 1 Monat über das Experten Premium-Abo.
                </p>
              </div>

              {promotionSettings ? (
                <div className="mt-4 space-y-3">
                  {promotionSettings.options.map((option) => {
                    const isSaving = promotionScopeSaving === option.scope;
                    const hasActive = Boolean(option.activeUntil && new Date(option.activeUntil).getTime() > Date.now());

                    return (
                      <div key={option.scope} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{option.scope === 'wochenwerbung' ? 'Startseite · 1 Monat' : 'Suchfeed'}</p>
                            <h3 className="mt-1 text-lg font-black italic uppercase text-slate-900">{option.label}</h3>
                            <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                              Laufzeit: {option.durationDays} Tage · Tarif: {option.planLabel}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black italic uppercase text-slate-900">
                              {option.includedAvailable ? 'Inklusive' : formatEuro(option.chargeCents)}
                            </p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              {option.paymentMethod === 'paypal' ? 'PayPal' : 'SEPA'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {hasActive && option.activeUntil ? (
                            <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700">
                              Aktiv bis {formatDate(option.activeUntil)}
                            </span>
                          ) : (
                            <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-200 text-slate-600">
                              Noch nicht aktiv
                            </span>
                          )}
                          <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 text-slate-600">
                            Bereits gebucht: {option.usageCount}
                          </span>
                        </div>

                        {!option.allowed && option.reason ? (
                          <p className="text-[11px] font-bold text-amber-700">{option.reason}</p>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => handlePromotionPurchase(option.scope, option.label)}
                          disabled={!option.allowed || isSaving}
                          className="px-4 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                        >
                          {isSaving ? 'Wird gebucht...' : hasActive ? 'Verlängern' : 'Jetzt buchen'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Marketingdaten werden geladen.</p>
                </div>
              )}
            </div>

            <div id="section-gallery" className="pt-6 border-t border-slate-100 space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Profil</p>
                <h2 className="mt-2 text-xl font-black italic uppercase tracking-tight text-slate-900">Galerie</h2>
                <p className="mt-2 text-sm font-medium text-slate-600">
                  Bilder und Videos für den Vorschaustreifen auf deinem Profil.
                </p>
              </div>

              {galerie.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {galerie.map((item, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group">
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
                          onClick={() => handleGalerieMove(idx, "left")}
                          disabled={idx === 0}
                          className="w-6 h-6 rounded-md bg-white/90 text-slate-700 border border-slate-200 flex items-center justify-center disabled:opacity-40"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGalerieMove(idx, "right")}
                          disabled={idx === galerie.length - 1}
                          className="w-6 h-6 rounded-md bg-white/90 text-slate-700 border border-slate-200 flex items-center justify-center disabled:opacity-40"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleGalerieDelete(idx)}
                        className="absolute inset-x-0 bottom-0 h-7 bg-red-600/90 text-white text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Löschen
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-medium text-slate-500">Noch keine Galerie-Dateien vorhanden.</p>
              )}

              <label className="inline-flex items-center px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300 cursor-pointer bg-white">
                {uploadingGalerie ? "Lade hoch..." : "Bilder / Videos hinzufügen"}
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  disabled={uploadingGalerie || !userId}
                  onChange={handleGalerieUpload}
                />
              </label>
            </div>

            {role === "experte" && (
              <div id="section-ads" className="pt-6 border-t border-slate-100 space-y-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Werbung</p>
                  <h2 className="mt-2 text-xl font-black italic uppercase tracking-tight text-slate-900">Eigene Werbung hochladen</h2>
                  <p className="mt-2 text-sm font-medium text-slate-600">
                    Werbung wird nach Upload von dir geprüft. Voraussetzung: Experten Pro Abo.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={adTitle}
                    onChange={(e) => setAdTitle(e.target.value)}
                    placeholder="Werbetitel"
                    className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:border-emerald-300"
                  />
                  <input
                    type="url"
                    value={adTargetUrl}
                    onChange={(e) => setAdTargetUrl(e.target.value)}
                    placeholder="Ziel-URL (https://...)"
                    className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:border-emerald-300"
                  />
                </div>

                <textarea
                  value={adDescription}
                  onChange={(e) => setAdDescription(e.target.value)}
                  rows={3}
                  placeholder="Kurzbeschreibung der Werbung"
                  className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-medium outline-none focus:border-emerald-300"
                />

                <MediaDropzone
                  title="Werbebild hochladen"
                  description="Ziehe ein Bild hierher oder wähle eine Datei aus."
                  accept="image/*"
                  disabled={adUploading || !userId}
                  buttonLabel="Bild auswählen"
                  busyLabel="Lade Werbebild..."
                  onFiles={handleAdMediaFiles}
                />
                {adMediaUrl && (
                  <span className="inline-flex px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-emerald-50 border border-emerald-200 text-emerald-700">
                    Bild bereit
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleSubmitAdvertising}
                  disabled={adSubmitting || adUploading}
                  className="px-6 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                >
                  {adSubmitting ? "Wird eingereicht..." : "Zur Prüfung einreichen"}
                </button>

                {adItems.length > 0 && (
                  <div className="space-y-2">
                    {adItems.map((item) => (
                      <div key={`ad-sub-${item.id}`} className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-black uppercase text-slate-900">{item.title}</p>
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${item.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : item.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {item.status === 'approved' ? 'Freigegeben' : item.status === 'rejected' ? 'Abgelehnt' : 'In Prüfung'}
                          </span>
                        </div>
                        {item.description && <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{item.description}</p>}
                        {item.admin_note && <p className="text-[11px] font-bold text-slate-700 mt-1">Admin-Hinweis: {item.admin_note}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div id="section-delete-profile" className="pt-6 border-t border-slate-200 space-y-4">
              <div>
                <h2 className="mt-2 text-xl font-black italic uppercase tracking-tight text-slate-900">Profil dauerhaft löschen</h2>
                <p className="mt-2 text-sm font-medium text-slate-600">
                  Gib zur Bestätigung <span className="font-black">LOESCHEN</span> ein. Danach wird dein Konto endgültig entfernt.
                </p>
              </div>

              <input
                type="text"
                value={deleteConfirmationInput}
                onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                placeholder="LOESCHEN"
                className="w-full md:w-72 p-4 rounded-xl border border-slate-200 bg-white font-black uppercase outline-none focus:border-slate-400"
              />

              <input
                type="password"
                value={deletePasswordInput}
                onChange={(e) => setDeletePasswordInput(e.target.value)}
                placeholder="Aktuelles Passwort"
                className="w-full md:w-72 p-4 rounded-xl border border-slate-200 bg-white font-bold outline-none focus:border-slate-400"
              />

              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount || deleteCooldownActive}
                className="w-full md:w-auto px-8 py-4 rounded-xl bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-700 disabled:opacity-60"
              >
                {deletingAccount ? "Lösche Profil..." : deleteCooldownActive ? "Bitte kurz warten..." : "Profil dauerhaft löschen"}
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Buchungen</p>
            <h2 className="mt-2 text-2xl font-black italic uppercase tracking-tight text-slate-900">Eigene Buchungen</h2>
          </div>

          {calendarSlots.length > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 space-y-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Kalenderfreigaben</p>
                <h3 className="mt-2 text-lg font-black italic uppercase text-slate-900">Freigegebene Termine zum Selbstbuchen</h3>
              </div>
              <div className="space-y-3">
                {calendarSlots.map((slot) => (
                  <div key={slot.id} className="rounded-2xl border border-emerald-200 bg-white p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-900">{slot.service_title}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">
                        {slot.expert_name || 'Experte'} · {new Date(slot.slot_start).toLocaleString('de-DE')} · {slot.duration_minutes} Min. · {formatEuro(slot.unit_price_cents)}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                        {slot.location || 'Ort folgt nach Absprache'}
                      </p>
                      {slot.notes && <p className="text-sm text-slate-600 mt-2">{slot.notes}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBookCalendarSlot(slot.id)}
                      disabled={calendarBookingId === slot.id}
                      className="px-4 py-3 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                    >
                      {calendarBookingId === slot.id ? 'Wird gebucht...' : 'Termin buchen'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sortedBookings.length === 0 ? (
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50">
              <p className="text-sm font-bold text-slate-500">Du hast aktuell noch keine Buchungen.</p>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Sobald Buchungen angelegt werden, erscheinen sie hier automatisch.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedBookings.map((booking) => (
                <div key={booking.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-black uppercase italic text-slate-900">
                      {booking.booking_type || "Buchung"}
                    </p>
                    <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 text-slate-600">
                      {booking.status || "offen"}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-700">{booking.provider_name || "Anbieter unbekannt"}</p>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                    Termin: {formatDate(booking.booking_date)}
                  </p>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                    Ort: {booking.location || "-"}
                  </p>
                  {booking.notes && <p className="text-sm text-slate-600">{booking.notes}</p>}

                  {swipeItems.filter((item) => item.expert_name ? (booking.provider_name || '').toLowerCase().includes(String(item.expert_name || '').toLowerCase()) : true).length > 0 && (
                    <div className="pt-3 border-t border-slate-200 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Leistung bestätigen</p>
                      {swipeItems
                        .filter((item) => item.expert_name ? (booking.provider_name || '').toLowerCase().includes(String(item.expert_name || '').toLowerCase()) : true)
                        .map((item) => (
                          <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                            <div>
                              <p className="text-xs font-black text-slate-800">{item.service_title}</p>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                Termin: {formatDate(item.booking_date)} · Link bis {formatDate(item.expires_at)}
                              </p>
                            </div>
                            <Link
                              href={item.confirm_url}
                              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500"
                            >
                              Swipe bestätigen
                            </Link>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
          </div>
        </div>
      </main>
    </div>
  );
}
