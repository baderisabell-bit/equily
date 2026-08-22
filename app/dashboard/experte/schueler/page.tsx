"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import LoggedInHeader from "../../../components/logged-in-header";
import DashboardSidebar from "../../../components/dashboard-sidebar";
import { safeToFixed } from '../../../lib/num';
import {
  getMyStudents,
  addStudent,
  createInvitedStudentAccount,
  createManualStudentAccount,
  removeStudent,
  searchStudentUsers,
  getBillingInfo,
  updateBillingInfo,
  getStudentBookings,
  createStudentBooking,
  updateStudentBookingStatus,
  getInvoiceSettings,
  saveInvoiceSettings,
  getInvoiceData,
  getInvoiceArchiveData,
  incrementInvoiceCounter,
  getUserSubscriptionSettings,
  getStudentServicePlan,
  saveStudentServicePlan,
  getAboCancellations,
  setAboCancellationCountForMonth,
  createBookingSwipeConfirmation,
  updateStudentBookingPayment,
  getExpertCalendarSlotsForExpert,
  releaseExpertCalendarSlot,
  cancelExpertCalendarSlot,
} from "../../../actions";

// ─────────────────────────────────────── Types ──────────────────────────────
type Student = {
  id: number;
  student_id: number;
  email: string | null;
  display_name: string | null;
  ort: string | null;
  plz: string | null;
  added_at: string | null;
  active: boolean;
  billing_name: string | null;
  billing_email: string | null;
  payment_method: string | null;
  billing_cycle_day: number | null;
  is_manual_customer: boolean;
};

type Booking = {
  id: number;
  booking_date: string | null;
  service_title: string | null;
  duration_minutes: number | null;
  quantity: number | null;
  unit_price_euro: number | null;
  total_euro: number | null;
  protection_fee_cents?: number | null;
  customer_total_cents?: number | null;
  expert_payout_cents?: number | null;
  source_offer_id?: string | null;
  offer_conditions_text?: string | null;
  status: string;
  paid_at?: string | null;
  paid_method?: string | null;
  notes: string | null;
};

type BillingInfo = {
  billing_name: string | null;
  billing_email: string | null;
  billing_phone: string | null;
  billing_strasse: string | null;
  iban: string | null;
  payment_method: string | null;
  billing_cycle_day: number | null;
  notes: string | null;
};

type InvoiceSettings = {
  steuernummer: string | null;
  ust_idnr: string | null;
  kontoname: string | null;
  iban: string | null;
  bic: string | null;
  bankname: string | null;
  tel: string | null;
  logo_url: string | null;
  is_kleinunternehmer: boolean;
  mwst_satz: number | null;
  invoice_prefix: string | null;
  invoice_counter: number | null;
  template_id: number | null;
  brand_color: string | null;
};

type InvoiceArchiveItem = {
  student_id: number;
  customer_name: string;
  customer_email: string | null;
  invoice_month: string;
  invoice_year: number;
  invoice_month_number: number;
  booking_count: number;
  subtotal_cents: number;
  protection_fee_cents: number;
  customer_total_cents: number;
  expert_payout_cents: number;
  first_booking_date: string | null;
  last_booking_date: string | null;
  last_created_at: string | null;
  service_titles: string[];
};

type ServicePlan = {
  plan_type: "abo" | "einzelstunde";
  service_title: string;
  duration_minutes: number;
  unit_price_cents: number;
  monthly_price_cents: number | null;
  sessions_per_month: number;
  cancellation_hours: number;
  cancellation_enabled: boolean;
  max_cancellations_per_month: number;
  require_confirmation_each_booking: boolean;
};

type ExpertCalendarSlot = {
  id: number;
  release_month: string | null;
  slot_start: string;
  duration_minutes: number;
  service_title: string;
  unit_price_cents: number;
  location: string | null;
  notes: string | null;
  status: string;
  booked_booking_id: number | null;
};

type MainTab = "uebersicht" | "hinzufuegen" | "rechnungseinstellungen";
type AddSubTab = "suche" | "einladen" | "manuell";

const INVOICE_TEMPLATES = [
  { id: 1, name: "Klassisch", hint: "Serif, Linien, traditioneller Beleg" },
  { id: 2, name: "Modern", hint: "Farbfläche, starke Akzente, Card-Look" },
  { id: 3, name: "Minimal", hint: "Monochrom, Sidebar, technische Anmutung" },
] as const;

// ─────────────────────────────────────── Utility ────────────────────────────
const eur = (cents: number | null | undefined) => {
  if (cents === null || cents === undefined) return "–";
  return `${safeToFixed(cents / 100, 2).replace(".", ",")} €`;
};

const formatDate = (val: string | null | undefined) => {
  if (!val) return "–";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "–";
  return d.toLocaleDateString("de-DE");
};

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const toDateTimeLocalValue = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const REQUEST_TIMEOUT_MS = 15000;

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} Timeout`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
export default function SchuelerPage() {
  const router = useRouter();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [userId, setUserId] = useState<number | null>(null);
  const [userName, setUserName] = useState("Experte");
  const [role, setRole] = useState<"experte" | "nutzer" | "unknown">("unknown");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasPremiumAccess, setHasPremiumAccess] = useState(false);
  const [subscriptionPlanLabel, setSubscriptionPlanLabel] = useState("Free");

  // ── Data ──────────────────────────────────────────────────────────────────
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentTab, setStudentTab] = useState<"buchungen" | "abrechnung" | "plan" | "rechnung">("buchungen");

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const [mainTab, setMainTab] = useState<MainTab>("uebersicht");
  const [addSubTab, setAddSubTab] = useState<AddSubTab>("suche");

  // ── Per-student data ──────────────────────────────────────────────────────
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [servicePlan, setServicePlan] = useState<Partial<ServicePlan>>({});
  const [invoiceMonth, setInvoiceMonth] = useState(currentMonth());
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [invoiceSettings, setInvoiceSettings] = useState<Partial<InvoiceSettings>>({});
  const [invoiceSectionTab, setInvoiceSectionTab] = useState<"daten" | "archiv">("daten");
  const [invoiceArchiveItems, setInvoiceArchiveItems] = useState<InvoiceArchiveItem[]>([]);
  const [invoiceArchiveLoading, setInvoiceArchiveLoading] = useState(false);
  const [invoiceArchiveError, setInvoiceArchiveError] = useState("");
  const [invoiceArchiveSearch, setInvoiceArchiveSearch] = useState("");
  const [invoiceArchiveYear, setInvoiceArchiveYear] = useState("all");
  const [invoiceArchiveMonth, setInvoiceArchiveMonth] = useState("all");
  const [invoiceArchiveSort, setInvoiceArchiveSort] = useState<"recent" | "oldest" | "name-asc" | "name-desc">("recent");
  const [quickInvoiceStudentId, setQuickInvoiceStudentId] = useState<number | null>(null);
  const [quickInvoiceMonth, setQuickInvoiceMonth] = useState(currentMonth());

  // ── Messages ──────────────────────────────────────────────────────────────
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // ── Add-student forms ─────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const [inviteForm, setInviteForm] = useState({ vorname: "", nachname: "", email: "", billingCycleDay: "" });
  const [manualForm, setManualForm] = useState({ fullName: "", billingEmail: "", billingPhone: "", billingAddress: "", billingCycleDay: "" });

  // ── New booking form ──────────────────────────────────────────────────────
  const [bookingForm, setBookingForm] = useState({
    bookingDate: new Date().toISOString().split("T")[0],
    serviceTitle: "",
    durationMinutes: "60",
    quantity: "1",
    unitPriceEuro: "",
    notes: "",
  });
  const [calendarSlots, setCalendarSlots] = useState<ExpertCalendarSlot[]>([]);
  const [calendarEnabled, setCalendarEnabled] = useState(false);
  const [calendarPlanLabel, setCalendarPlanLabel] = useState("");
  const [calendarSlotForm, setCalendarSlotForm] = useState({
    slotStart: toDateTimeLocalValue(new Date(Date.now() + 24 * 60 * 60 * 1000)),
    durationMinutes: "60",
    serviceTitle: "",
    unitPriceEuro: "",
    location: "",
    notes: "",
  });

  // ── Loading states ────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [calendarSaving, setCalendarSaving] = useState(false);
  const [showPremiumDetails, setShowPremiumDetails] = useState(false);
  const [invoiceCancellationCount, setInvoiceCancellationCount] = useState(0);
  const [bookingPaymentMethod, setBookingPaymentMethod] = useState<Record<number, "bar" | "ueberweisung" | "paypal">>({});

  // ═══════════════════════════ Init ═════════════════════════════════════════
  useEffect(() => {
    const rawId = sessionStorage.getItem("userId");
    const storedRole = sessionStorage.getItem("userRole");
    const storedName = sessionStorage.getItem("userName");

    if (!rawId) { router.push("/login"); return; }
    const id = parseInt(rawId, 10);
    if (Number.isNaN(id)) { router.push("/login"); return; }

    const normalized = String(storedRole || "").trim().toLowerCase();
    const isExpert = Boolean(normalized) && !["nutzer", "user", "kunde"].includes(normalized);
    if (!isExpert) { router.push("/dashboard/nutzer"); return; }

    setUserId(id);
    setRole("experte");
    setUserName(storedName || "Experte");

    (async () => {
      setLoading(true);
      try {
        const [stuRes, invRes, subRes] = await withTimeout(
          Promise.all([
            getMyStudents(id),
            getInvoiceSettings(id),
            getUserSubscriptionSettings(id),
          ]),
          REQUEST_TIMEOUT_MS,
          "Initialdaten laden"
        );

        const planKey = String((subRes as any)?.data?.plan_key || "").trim().toLowerCase();
        const planLabel = String((subRes as any)?.data?.plan_label || "Free").trim();
        setSubscriptionPlanLabel(planLabel || "Free");
        setHasPremiumAccess(planKey === "experte_pro");

        if (stuRes.success) {
          const nextStudents = (stuRes as any).students || [];
          setStudents(nextStudents);
          if (nextStudents.length > 0 && !quickInvoiceStudentId) {
            setQuickInvoiceStudentId(nextStudents[0].student_id);
          }
        }
        if (invRes.success) setInvoiceSettings((invRes as any).settings || {});
      } catch {
        notify("err", "Vorschau-Daten konnten nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router, quickInvoiceStudentId]);

  // ═══════════════════════════ Helpers ══════════════════════════════════════
  const notify = (type: "ok" | "err", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const refreshInvoiceCancellationCount = useCallback(async (
    expertId: number,
    studentId: number,
    monthValue: string,
    plan: Partial<ServicePlan> | null | undefined
  ) => {
    if (!plan || plan.plan_type !== "abo" || plan.cancellation_enabled === false) {
      setInvoiceCancellationCount(0);
      return;
    }
    const res = await getAboCancellations(expertId, studentId, monthValue);
    if (!res.success) {
      setInvoiceCancellationCount(0);
      return;
    }
    const cancellations = Array.isArray((res as any).cancellations) ? (res as any).cancellations : [];
    const withinWindowCount = cancellations.filter((item: any) => item?.is_within_window !== false).length;
    setInvoiceCancellationCount(withinWindowCount);
  }, []);

  const reloadStudents = useCallback(async () => {
    if (!userId) return;
    const res = await getMyStudents(userId);
    if (res.success) {
      const nextStudents = (res as any).students || [];
      setStudents(nextStudents);
      if (nextStudents.length > 0 && !quickInvoiceStudentId) {
        setQuickInvoiceStudentId(nextStudents[0].student_id);
      }
    }
  }, [userId, quickInvoiceStudentId]);

  useEffect(() => {
    if (!userId || !selectedStudent) return;
    refreshInvoiceCancellationCount(userId, selectedStudent.student_id, invoiceMonth, servicePlan);
  }, [userId, selectedStudent, invoiceMonth, servicePlan, refreshInvoiceCancellationCount]);

  useEffect(() => {
    if (mainTab !== "rechnungseinstellungen" || !userId) return;

    let cancelled = false;
    setInvoiceArchiveLoading(true);
    setInvoiceArchiveError("");

    withTimeout(getInvoiceArchiveData(userId), REQUEST_TIMEOUT_MS, "Rechnungsarchiv laden")
      .then((res) => {
        if (cancelled) return;

        if (res.success) {
          setInvoiceArchiveItems(Array.isArray((res as any).items) ? (res as any).items : []);
        } else {
          setInvoiceArchiveItems([]);
          setInvoiceArchiveError((res as any).error || "Rechnungsarchiv konnte nicht geladen werden.");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setInvoiceArchiveItems([]);
        setInvoiceArchiveError("Rechnungsarchiv konnte nicht geladen werden.");
      })
      .finally(() => {
        if (cancelled) return;
        setInvoiceArchiveLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mainTab, userId]);

  const invoiceArchiveYearOptions = useMemo(() => {
    return Array.from(new Set(invoiceArchiveItems.map((item) => String(item.invoice_year)))).sort((a, b) => Number(b) - Number(a));
  }, [invoiceArchiveItems]);

  const invoiceArchiveMonthOptions = useMemo(() => {
    return Array.from(new Set(invoiceArchiveItems.map((item) => item.invoice_month))).sort((a, b) => b.localeCompare(a));
  }, [invoiceArchiveItems]);

  const filteredInvoiceArchiveItems = useMemo(() => {
    const search = invoiceArchiveSearch.trim().toLowerCase();
    const filtered = invoiceArchiveItems.filter((item) => {
      if (invoiceArchiveYear !== "all" && String(item.invoice_year) !== invoiceArchiveYear) return false;
      if (invoiceArchiveMonth !== "all" && item.invoice_month !== invoiceArchiveMonth) return false;
      if (!search) return true;

      const haystack = [
        item.customer_name,
        item.customer_email || "",
        item.invoice_month,
        ...item.service_titles,
      ].join(" ").toLowerCase();

      return haystack.includes(search);
    });

    return filtered.sort((a, b) => {
      if (invoiceArchiveSort === "name-asc") return a.customer_name.localeCompare(b.customer_name, "de-DE");
      if (invoiceArchiveSort === "name-desc") return b.customer_name.localeCompare(a.customer_name, "de-DE");

      const aDate = `${a.invoice_month}-01`;
      const bDate = `${b.invoice_month}-01`;

      if (invoiceArchiveSort === "oldest") return aDate.localeCompare(bDate) || a.customer_name.localeCompare(b.customer_name, "de-DE");
      return bDate.localeCompare(aDate) || a.customer_name.localeCompare(b.customer_name, "de-DE");
    });
  }, [invoiceArchiveItems, invoiceArchiveMonth, invoiceArchiveSearch, invoiceArchiveSort, invoiceArchiveYear]);

  const openStudent = async (s: Student) => {
    setSelectedStudent(s);
    setStudentTab("buchungen");
    setLoadingDetail(true);
    if (!userId) {
      setLoadingDetail(false);
      return;
    }
    try {
      const [bkRes, blRes, plRes, calRes] = await withTimeout(
        Promise.all([
          getStudentBookings(userId, s.student_id, 50),
          getBillingInfo(userId, s.student_id),
          getStudentServicePlan(userId, s.student_id),
          getExpertCalendarSlotsForExpert(userId, s.student_id, invoiceMonth),
        ]),
        REQUEST_TIMEOUT_MS,
        "Kundenvorschau laden"
      );
      const nextPlan = (plRes as any).plan || {};
      const nextBookings = (bkRes as any).bookings || [];
      setBookings(nextBookings);
      setBilling((blRes as any).billing || null);
      setServicePlan(nextPlan);
      setBookingPaymentMethod(
        nextBookings.reduce((acc: Record<number, "bar" | "ueberweisung" | "paypal">, booking: any) => {
          const method = String(booking?.paid_method || '').toLowerCase();
          if (method === 'bar' || method === 'ueberweisung' || method === 'paypal') {
            acc[Number(booking.id)] = method;
          }
          return acc;
        }, {})
      );
      setCalendarSlots((calRes as any).items || []);
      setCalendarEnabled(Boolean((calRes as any).calendarEnabled));
      setCalendarPlanLabel(String((calRes as any).planLabel || ""));
      setCalendarSlotForm((prev) => ({
        ...prev,
        serviceTitle: prev.serviceTitle || nextPlan.service_title || "",
        durationMinutes: prev.durationMinutes || String(nextPlan.duration_minutes || 60),
        unitPriceEuro: prev.unitPriceEuro || (nextPlan.unit_price_cents ? String(safeToFixed(Number(nextPlan.unit_price_cents) / 100, 2).replace('.', ',')) : ""),
      }));
      await refreshInvoiceCancellationCount(userId, s.student_id, invoiceMonth, nextPlan);
    } catch {
      notify("err", "Kundendaten konnten nicht geladen werden.");
    } finally {
      setLoadingDetail(false);
    }
  };

  const openProfile = () => {
    if (userId && userId > 0) window.location.href = `/profil/${userId}`;
    else window.location.href = "/login";
  };

  const handleLogout = () => { sessionStorage.clear(); window.location.href = "/"; };

  // ── Sidebar pattern (same as other pages) ─────────────────────────────────
  const currentRole = role;
  const normalizedRole = String(currentRole || role).trim().toLowerCase();
  const isExpertRole = Boolean(normalizedRole) && !["nutzer", "user", "kunde"].includes(normalizedRole);

  // ═══════════════════════════ Actions ══════════════════════════════════════

  // Search existing users
  const doSearch = async () => {
    if (!userId || !searchTerm.trim()) return;
    setSearching(true);
    const res = await searchStudentUsers(userId, searchTerm.trim(), 10);
    setSearchResults((res as any).users || []);
    setSearching(false);
  };

  const doAddExisting = async (studentId: number) => {
    if (!userId) return;
    setSaving(true);
    const res = await addStudent(userId, studentId);
    if (res.success) { notify("ok", "Schüler hinzugefügt."); setSearchResults([]); setSearchTerm(""); await reloadStudents(); }
    else notify("err", (res as any).error || "Fehler");
    setSaving(false);
  };

  const doInvite = async () => {
    if (!userId || !inviteForm.vorname || !inviteForm.nachname || !inviteForm.email) return;
    setSaving(true);
    const res = await createInvitedStudentAccount({
      expertId: userId,
      vorname: inviteForm.vorname,
      nachname: inviteForm.nachname,
      email: inviteForm.email,
      billingCycleDay: inviteForm.billingCycleDay ? parseInt(inviteForm.billingCycleDay, 10) : undefined,
    });
    if (res.success) {
      notify("ok", `Einladung gesendet an ${inviteForm.email}.${(res as any).mailSent ? "" : " (E-Mail konnte nicht gesendet werden)"}`);
      setInviteForm({ vorname: "", nachname: "", email: "", billingCycleDay: "" });
      await reloadStudents();
    } else notify("err", (res as any).error || "Fehler");
    setSaving(false);
  };

  const doManual = async () => {
    if (!userId || !manualForm.fullName) return;
    setSaving(true);
    const res = await createManualStudentAccount({
      expertId: userId,
      fullName: manualForm.fullName,
      billingEmail: manualForm.billingEmail || undefined,
      billingPhone: manualForm.billingPhone || undefined,
      billingAddress: manualForm.billingAddress || undefined,
      billingCycleDay: manualForm.billingCycleDay ? parseInt(manualForm.billingCycleDay, 10) : undefined,
    });
    if (res.success) {
      notify("ok", "Manueller Kunde angelegt.");
      setManualForm({ fullName: "", billingEmail: "", billingPhone: "", billingAddress: "", billingCycleDay: "" });
      await reloadStudents();
    } else notify("err", (res as any).error || "Fehler");
    setSaving(false);
  };

  const doRemoveStudent = async (s: Student) => {
    if (!userId || !confirm(`${s.display_name || s.billing_name || "Kunde"} wirklich entfernen?`)) return;
    setSaving(true);
    const res = await removeStudent(userId, s.student_id);
    if (res.success) { notify("ok", "Schüler entfernt."); setSelectedStudent(null); await reloadStudents(); }
    else notify("err", (res as any).error || "Fehler");
    setSaving(false);
  };

  const doSaveBilling = async () => {
    if (!userId || !selectedStudent || !billing) return;
    setSaving(true);
    const res = await updateBillingInfo(userId, selectedStudent.student_id, {
      billing_name: billing.billing_name || undefined,
      billing_email: billing.billing_email || undefined,
      billing_phone: billing.billing_phone || undefined,
      billing_strasse: billing.billing_strasse || undefined,
      iban: billing.iban || undefined,
      payment_method: billing.payment_method || undefined,
      billing_cycle_day: billing.billing_cycle_day ?? undefined,
      notes: billing.notes || undefined,
    });
    if (res.success) notify("ok", "Rechnungsdaten gespeichert.");
    else notify("err", (res as any).error || "Fehler");
    setSaving(false);
  };

  const doSavePlan = async () => {
    if (!userId || !selectedStudent) return;
    if (!servicePlan.service_title || !servicePlan.unit_price_cents) { notify("err", "Bitte Leistungstitel und Preis angeben."); return; }
    setSaving(true);
    const res = await saveStudentServicePlan(userId, selectedStudent.student_id, {
      plan_type: servicePlan.plan_type || "einzelstunde",
      service_title: servicePlan.service_title || "Reitstunde",
      duration_minutes: servicePlan.duration_minutes || 60,
      unit_price_cents: servicePlan.unit_price_cents || 0,
      monthly_price_cents: servicePlan.monthly_price_cents ?? null,
      sessions_per_month: servicePlan.sessions_per_month || 1,
      cancellation_hours: servicePlan.cancellation_hours || 24,
      cancellation_enabled: servicePlan.cancellation_enabled !== false,
      max_cancellations_per_month: servicePlan.max_cancellations_per_month,
      require_confirmation_each_booking: servicePlan.require_confirmation_each_booking === true,
    });
    if (res.success) notify("ok", "Plan gespeichert.");
    else notify("err", (res as any).error || "Fehler");
    setSaving(false);
  };

  const doSaveMonthlyCancellationCount = async () => {
    if (!userId || !selectedStudent) return;
    if (servicePlan.plan_type !== "abo") {
      notify("err", "Ruecktrittsanzahl ist nur bei Abo moeglich.");
      return;
    }
    setSaving(true);
    const res = await setAboCancellationCountForMonth({
      expertId: userId,
      studentId: selectedStudent.student_id,
      month: invoiceMonth,
      count: invoiceCancellationCount,
    });
    if (!res.success) {
      notify("err", (res as any).error || "Ruecktrittsanzahl konnte nicht gespeichert werden.");
      setSaving(false);
      return;
    }
    setInvoiceCancellationCount(Number((res as any).count || 0));
    await doLoadInvoice();
    notify("ok", "Ruecktritte gespeichert und Rechnung aktualisiert.");
    setSaving(false);
  };

  const doAddBooking = async () => {
    if (!userId || !selectedStudent) return;
    if (!bookingForm.serviceTitle || !bookingForm.unitPriceEuro) { notify("err", "Bitte Leistung und Preis angeben."); return; }
    setSaving(true);
    const res = await createStudentBooking({
      expertId: userId,
      studentId: selectedStudent.student_id,
      bookingDate: bookingForm.bookingDate,
      serviceTitle: bookingForm.serviceTitle,
      durationMinutes: parseInt(bookingForm.durationMinutes, 10) || undefined,
      quantity: parseInt(bookingForm.quantity, 10) || 1,
      unitPriceEuro: parseFloat(bookingForm.unitPriceEuro.replace(",", ".")),
      notes: bookingForm.notes || undefined,
    });
    if (res.success) {
      notify("ok", "Buchung eingetragen.");
      setBookingForm({ bookingDate: new Date().toISOString().split("T")[0], serviceTitle: "", durationMinutes: "60", quantity: "1", unitPriceEuro: "", notes: "" });
      const bkRes = await getStudentBookings(userId, selectedStudent.student_id, 50);
      setBookings((bkRes as any).bookings || []);
    } else notify("err", (res as any).error || "Fehler");
    setSaving(false);
  };

  const doChangeBookingStatus = async (bookingId: number, newStatus: 'offen' | 'bestaetigt' | 'abgerechnet' | 'storniert') => {
    if (!userId || !selectedStudent) return;
    const res = await updateStudentBookingStatus({ expertId: userId, studentId: selectedStudent.student_id, bookingId, status: newStatus });
    if (res.success) {
      const bkRes = await getStudentBookings(userId, selectedStudent.student_id, 50);
      const nextBookings = (bkRes as any).bookings || [];
      setBookings(nextBookings);
    } else notify("err", (res as any).error || "Fehler");
  };

  const doSetBookingPaid = async (bookingId: number, paid: boolean) => {
    if (!userId || !selectedStudent) return;
    const method = bookingPaymentMethod[bookingId] || "bar";
    const res = await updateStudentBookingPayment({
      expertId: userId,
      studentId: selectedStudent.student_id,
      bookingId,
      paid,
      paymentMethod: method,
    });
    if (!res.success) {
      notify("err", (res as any).error || "Zahlungsstatus konnte nicht gespeichert werden.");
      return;
    }
    const bkRes = await getStudentBookings(userId, selectedStudent.student_id, 50);
    const nextBookings = (bkRes as any).bookings || [];
    setBookings(nextBookings);
    notify("ok", paid ? "Als bezahlt markiert." : "Zahlung als offen markiert.");
  };

  const doRequestBookingConfirmation = async (bookingId: number) => {
    if (!userId || !selectedStudent) return;
    const res = await createBookingSwipeConfirmation({
      expertId: userId,
      studentId: selectedStudent.student_id,
      bookingId,
      expiresHours: 72,
    });
    if (!res.success) {
      notify("err", (res as any).error || "Bestaetigungsanfrage konnte nicht erstellt werden.");
      return;
    }
    const url = String((res as any).confirmUrl || "");
    if (url && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // noop
      }
    }
    notify("ok", "Bestaetigungsanfrage erstellt. Link wurde in die Zwischenablage kopiert.");
  };

  const doLoadInvoice = async () => {
    if (!userId || !selectedStudent) return;
    setLoadingDetail(true);
    try {
      const [res, calRes] = await withTimeout(
        Promise.all([
          getInvoiceData(userId, selectedStudent.student_id, invoiceMonth),
          getExpertCalendarSlotsForExpert(userId, selectedStudent.student_id, invoiceMonth),
        ]),
        REQUEST_TIMEOUT_MS,
        "Rechnungsvorschau laden"
      );
      if (res.success) setInvoiceData((res as any));
      else notify("err", (res as any).error || "Rechnungsdaten konnten nicht geladen werden.");
      setCalendarSlots((calRes as any).items || []);
      setCalendarEnabled(Boolean((calRes as any).calendarEnabled));
      setCalendarPlanLabel(String((calRes as any).planLabel || ""));
      await refreshInvoiceCancellationCount(userId, selectedStudent.student_id, invoiceMonth, servicePlan);
    } catch {
      notify("err", "Rechnungsdaten konnten nicht geladen werden.");
    } finally {
      setLoadingDetail(false);
    }
  };

  const doSaveInvoiceSettings = async () => {
    if (!userId) return;
    setSaving(true);
    const res = await saveInvoiceSettings(userId, invoiceSettings as any);
    if (res.success) notify("ok", "Rechnungseinstellungen gespeichert.");
    else notify("err", (res as any).error || "Fehler");
    setSaving(false);
  };

  const doPrintInvoice = async () => {
    if (!userId || !selectedStudent || !invoiceData) return;
    await incrementInvoiceCounter(userId);
    window.print();
  };

  const doReleaseCalendarSlot = async () => {
    if (!userId || !selectedStudent) return;
    if (!calendarSlotForm.slotStart) {
      notify("err", "Bitte zuerst einen Termin wählen.");
      return;
    }
    setCalendarSaving(true);
    const res = await releaseExpertCalendarSlot({
      expertId: userId,
      studentId: selectedStudent.student_id,
      releaseMonth: invoiceMonth,
      slotStart: calendarSlotForm.slotStart,
      durationMinutes: parseInt(calendarSlotForm.durationMinutes, 10) || 60,
      serviceTitle: calendarSlotForm.serviceTitle || servicePlan.service_title || undefined,
      unitPriceEuro: calendarSlotForm.unitPriceEuro ? parseFloat(calendarSlotForm.unitPriceEuro.replace(",", ".")) : (servicePlan.unit_price_cents ? Number(servicePlan.unit_price_cents) / 100 : 0),
      location: calendarSlotForm.location || undefined,
      notes: calendarSlotForm.notes || undefined,
    });
    setCalendarSaving(false);
    if (!res.success) {
      notify("err", (res as any).error || "Termin konnte nicht freigegeben werden.");
      return;
    }
    notify("ok", "Kalendertermin freigegeben.");
    const calRes = await getExpertCalendarSlotsForExpert(userId, selectedStudent.student_id, invoiceMonth);
    setCalendarSlots((calRes as any).items || []);
    setCalendarEnabled(Boolean((calRes as any).calendarEnabled));
    setCalendarPlanLabel(String((calRes as any).planLabel || ""));
    setCalendarSlotForm((prev) => ({
      ...prev,
      slotStart: toDateTimeLocalValue(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      notes: "",
    }));
  };

  const doCancelCalendarSlot = async (slotId: number) => {
    if (!userId || !selectedStudent) return;
    setCalendarSaving(true);
    const res = await cancelExpertCalendarSlot({ expertId: userId, slotId });
    setCalendarSaving(false);
    if (!res.success) {
      notify("err", (res as any).error || "Termin konnte nicht entfernt werden.");
      return;
    }
    notify("ok", "Terminfreigabe entfernt.");
    const calRes = await getExpertCalendarSlotsForExpert(userId, selectedStudent.student_id, invoiceMonth);
    setCalendarSlots((calRes as any).items || []);
    setCalendarEnabled(Boolean((calRes as any).calendarEnabled));
    setCalendarPlanLabel(String((calRes as any).planLabel || ""));
  };

  const doOpenInvoiceForCustomerMonth = async () => {
    if (!userId) return;
    if (!quickInvoiceStudentId) {
      notify("err", "Bitte zuerst einen Kunden auswählen.");
      return;
    }
    const targetStudent = students.find((s) => s.student_id === quickInvoiceStudentId);
    if (!targetStudent) {
      notify("err", "Kunde wurde nicht gefunden.");
      return;
    }
    setLoadingDetail(true);
    try {
      const [res, plRes, calRes] = await withTimeout(
        Promise.all([
          getInvoiceData(userId, quickInvoiceStudentId, quickInvoiceMonth),
          getStudentServicePlan(userId, quickInvoiceStudentId),
          getExpertCalendarSlotsForExpert(userId, quickInvoiceStudentId, quickInvoiceMonth),
        ]),
        REQUEST_TIMEOUT_MS,
        "Kundenrechnung laden"
      );
      if (!res.success) {
        notify("err", (res as any).error || "Rechnungsdaten konnten nicht geladen werden.");
        return;
      }
      const nextPlan = (plRes as any).plan || {};
      setSelectedStudent(targetStudent);
      setStudentTab("rechnung");
      setInvoiceMonth(quickInvoiceMonth);
      setInvoiceData(res as any);
      setServicePlan(nextPlan);
      setBookingPaymentMethod({});
      setCalendarSlots((calRes as any).items || []);
      setCalendarEnabled(Boolean((calRes as any).calendarEnabled));
      setCalendarPlanLabel(String((calRes as any).planLabel || ""));
      setCalendarSlotForm((prev) => ({
        ...prev,
        serviceTitle: nextPlan.service_title || prev.serviceTitle,
        durationMinutes: nextPlan.duration_minutes ? String(nextPlan.duration_minutes) : prev.durationMinutes,
        unitPriceEuro: nextPlan.unit_price_cents ? String(safeToFixed(Number(nextPlan.unit_price_cents) / 100, 2).replace('.', ',')) : prev.unitPriceEuro,
      }));
      await refreshInvoiceCancellationCount(userId, quickInvoiceStudentId, quickInvoiceMonth, nextPlan);
    } catch {
      notify("err", "Rechnungsdaten konnten nicht geladen werden.");
    } finally {
      setLoadingDetail(false);
    }
  };

  const openArchiveInvoice = async (archiveItem: InvoiceArchiveItem) => {
    if (!userId) return;
    const targetStudent = students.find((student) => student.student_id === archiveItem.student_id);
    if (!targetStudent) {
      notify("err", "Kunde wurde nicht gefunden.");
      return;
    }

    setMainTab("uebersicht");
    setSelectedStudent(targetStudent);
    setStudentTab("rechnung");
    setInvoiceMonth(archiveItem.invoice_month);
    setLoadingDetail(true);

    try {
      const [res, plRes, calRes] = await withTimeout(
        Promise.all([
          getInvoiceData(userId, archiveItem.student_id, archiveItem.invoice_month),
          getStudentServicePlan(userId, archiveItem.student_id),
          getExpertCalendarSlotsForExpert(userId, archiveItem.student_id, archiveItem.invoice_month),
        ]),
        REQUEST_TIMEOUT_MS,
        "Archiv-Rechnung laden"
      );

      if (!res.success) {
        notify("err", (res as any).error || "Rechnungsdaten konnten nicht geladen werden.");
        return;
      }

      const nextPlan = (plRes as any).plan || {};
      setInvoiceData(res as any);
      setServicePlan(nextPlan);
      setBookingPaymentMethod({});
      setCalendarSlots((calRes as any).items || []);
      setCalendarEnabled(Boolean((calRes as any).calendarEnabled));
      setCalendarPlanLabel(String((calRes as any).planLabel || ""));
      setCalendarSlotForm((prev) => ({
        ...prev,
        serviceTitle: nextPlan.service_title || prev.serviceTitle,
        durationMinutes: nextPlan.duration_minutes ? String(nextPlan.duration_minutes) : prev.durationMinutes,
        unitPriceEuro: nextPlan.unit_price_cents ? String(safeToFixed(Number(nextPlan.unit_price_cents) / 100, 2).replace('.', ',')) : prev.unitPriceEuro,
      }));
      await refreshInvoiceCancellationCount(userId, archiveItem.student_id, archiveItem.invoice_month, nextPlan);
    } catch {
      notify("err", "Rechnungsdaten konnten nicht geladen werden.");
    } finally {
      setLoadingDetail(false);
    }
  };

  // ═══════════════════════════ Render ═══════════════════════════════════════
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-10">
        <p className="text-sm font-black uppercase tracking-widest text-slate-400">Wird geladen…</p>
      </div>
    );
  }

  const inputCls = "w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm outline-none focus:border-emerald-300 placeholder:font-normal placeholder:text-slate-400";
  const btnPrimary = "px-6 py-3 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors";
  const btnSecondary = "px-6 py-3 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors";
  const activeTemplateIdRaw = Number(invoiceSettings.template_id || 1);
  const activeTemplateId = [1, 2, 3].includes(activeTemplateIdRaw) ? activeTemplateIdRaw : 1;
  const activeBrandColor = (invoiceSettings.brand_color || "#10b981").trim() || "#10b981";
  const activeTemplateName = INVOICE_TEMPLATES.find((tpl) => tpl.id === activeTemplateId)?.name || "Klassisch";
  const templatePreviewHeadline =
    activeTemplateId === 2
      ? "Rechnungsvorlage Modern"
      : activeTemplateId === 3
        ? "Rechnungsvorlage Minimal"
        : "Rechnungsvorlage Klassisch";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpenProfile={openProfile} role={isExpertRole ? "experte" : null} />

      {/* ── Header ── */}
      <LoggedInHeader
        userId={userId}
        role="experte"
        userName={userName}
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenProfile={openProfile}
        brandText="Equily"
      />

      {/* ── Toast ── */}
      {msg && (
        <div className={`fixed top-4 right-4 z-[100] px-6 py-4 rounded-2xl font-black text-sm shadow-xl ${msg.type === "ok" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {msg.text}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-8">

        {/* ── Left nav ── */}
        <aside className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm h-fit xl:sticky xl:top-8 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Navigation</p>
          {(["uebersicht", "hinzufuegen", "rechnungseinstellungen"] as MainTab[]).map((t) => {
            const labels: Record<MainTab, string> = { uebersicht: "Übersicht", hinzufuegen: "Hinzufügen", rechnungseinstellungen: "Rechnungseinstellungen" };
            const active = mainTab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => { setMainTab(t); setSelectedStudent(null); }}
                className={`block w-full text-left px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-colors ${active ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600 hover:border-emerald-300"}`}
              >
                {labels[t]}
              </button>
            );
          })}
          <div className="pt-3 border-t border-slate-100">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Schüler ({students.length})</p>
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {students.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setMainTab("uebersicht"); openStudent(s); }}
                  className={`block w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors truncate ${selectedStudent?.id === s.id ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  {s.display_name || s.billing_name || s.email || `#${s.student_id}`}
                </button>
              ))}
              {students.length === 0 && <p className="text-xs text-slate-400">Noch keine Schüler</p>}
            </div>
          </div>
        </aside>

        {/* ── Right content ── */}
        <div className="space-y-6">

          {/* ══════════ ÜBERSICHT ══════════ */}
          {mainTab === "uebersicht" && !selectedStudent && (
            <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Dashboard</p>
              <h1 className="mt-2 text-3xl font-black italic uppercase tracking-tight text-slate-900">Schüler &amp; Kunden</h1>
              <p className="mt-2 text-sm text-slate-500">Verwalte deine Schüler, Buchungen und Rechnungen.</p>

              {students.length === 0 ? (
                <div className="mt-8 text-center py-16">
                  <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Noch keine Schüler</p>
                  <button type="button" onClick={() => setMainTab("hinzufuegen")} className={`mt-4 ${btnPrimary}`}>Ersten Schüler hinzufügen</button>
                </div>
              ) : (
                <>
                  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Druckoption pro Kunde & Monat</p>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-3 items-end">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Kunde</label>
                        <select
                          value={quickInvoiceStudentId ?? ""}
                          onChange={(e) => setQuickInvoiceStudentId(e.target.value ? parseInt(e.target.value, 10) : null)}
                          className={inputCls}
                        >
                          <option value="">– Kunde wählen –</option>
                          {students.map((s) => (
                            <option key={`quick-invoice-${s.student_id}`} value={s.student_id}>
                              {s.display_name || s.billing_name || s.email || `Kunde #${s.student_id}`}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Monat</label>
                        <input
                          type="month"
                          value={quickInvoiceMonth}
                          onChange={(e) => setQuickInvoiceMonth(e.target.value)}
                          className={inputCls}
                        />
                      </div>
                      <button type="button" onClick={doOpenInvoiceForCustomerMonth} className={btnPrimary}>
                        Zur Druckansicht
                      </button>
                    </div>
                  </div>

                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                    {students.map((s) => (
                      <div
                        key={s.id}
                        className="border border-slate-200 rounded-2xl p-5 hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer group"
                        onClick={() => openStudent(s)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-black italic uppercase text-slate-800 truncate group-hover:text-emerald-700">
                              {s.display_name || s.billing_name || `Kunde #${s.student_id}`}
                            </p>
                            {s.email && <p className="text-xs text-slate-400 truncate mt-0.5">{s.email}</p>}
                            {s.ort && <p className="text-xs text-slate-400 mt-0.5">{s.plz} {s.ort}</p>}
                          </div>
                          <div className="ml-3 flex flex-col items-end gap-1 shrink-0">
                            {s.is_manual_customer && (
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[9px] font-black uppercase rounded-full border border-amber-200">Offline</span>
                            )}
                            {s.payment_method && (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black uppercase rounded-full">{s.payment_method}</span>
                            )}
                          </div>
                        </div>
                        {s.billing_cycle_day && (
                          <p className="text-[10px] text-slate-400 mt-2 font-bold">Abrechnungstag: {s.billing_cycle_day}.</p>
                        )}
                        <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-widest">Hinzugefügt: {formatDate(s.added_at)}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}

          {/* ══════════ STUDENT DETAIL ══════════ */}
          {mainTab === "uebersicht" && selectedStudent && (
            <div className="space-y-6">
              {/* Header card */}
              <section className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-wrap items-start justify-between gap-4">
                <div>
                  <button type="button" onClick={() => setSelectedStudent(null)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 mb-3 block">← Zurück zur Übersicht</button>
                  <h2 className="text-2xl font-black italic uppercase text-slate-900">
                    {selectedStudent.display_name || selectedStudent.billing_name || `Kunde #${selectedStudent.student_id}`}
                  </h2>
                  {selectedStudent.email && <p className="text-sm text-slate-500 mt-1">{selectedStudent.email}</p>}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {selectedStudent.is_manual_customer && <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[9px] font-black uppercase rounded-full border border-amber-200">Offline-Kunde</span>}
                    {selectedStudent.ort && <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black uppercase rounded-full">{selectedStudent.plz} {selectedStudent.ort}</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => doRemoveStudent(selectedStudent)}
                  disabled={saving}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                >
                  Entfernen
                </button>
              </section>

              {/* Sub-tabs */}
              <div className="flex gap-2 flex-wrap">
                {(["buchungen", "abrechnung", "plan", "rechnung"] as const).map((t) => {
                  const labels = { buchungen: "Buchungen", abrechnung: "Abrechnung", plan: "Leistungsplan", rechnung: "Rechnung" };
                  const active = studentTab === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setStudentTab(t)}
                      className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-colors ${active ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"}`}
                    >
                      {labels[t]}
                    </button>
                  );
                })}
              </div>

              {loadingDetail && (
                <div className="bg-white border border-slate-200 rounded-[2rem] p-8 text-center shadow-sm">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Wird geladen…</p>
                </div>
              )}

              {/* ── Buchungen tab ── */}
              {!loadingDetail && studentTab === "buchungen" && (
                <div className="space-y-6">
                  {/* Add booking */}
                  <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Neue Buchung eintragen</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Datum</label>
                        <input type="date" value={bookingForm.bookingDate} onChange={(e) => setBookingForm(f => ({ ...f, bookingDate: e.target.value }))} className={inputCls} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Leistung</label>
                        <input type="text" placeholder="z.B. Reitstunde" value={bookingForm.serviceTitle} onChange={(e) => setBookingForm(f => ({ ...f, serviceTitle: e.target.value }))} className={inputCls} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Dauer (Min.)</label>
                        <input type="number" min="1" placeholder="60" value={bookingForm.durationMinutes} onChange={(e) => setBookingForm(f => ({ ...f, durationMinutes: e.target.value }))} className={inputCls} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Anzahl</label>
                        <input type="number" min="1" placeholder="1" value={bookingForm.quantity} onChange={(e) => setBookingForm(f => ({ ...f, quantity: e.target.value }))} className={inputCls} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Einzelpreis (€)</label>
                        <input type="text" placeholder="45,00" value={bookingForm.unitPriceEuro} onChange={(e) => setBookingForm(f => ({ ...f, unitPriceEuro: e.target.value }))} className={inputCls} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Notiz</label>
                        <input type="text" placeholder="Optional" value={bookingForm.notes} onChange={(e) => setBookingForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} />
                      </div>
                    </div>
                    <button type="button" onClick={doAddBooking} disabled={saving} className={btnPrimary}>
                      Buchung speichern
                    </button>
                  </section>

                  {/* Booking list */}
                  <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-5">Buchungshistorie ({bookings.length})</h3>
                    {bookings.length === 0 ? (
                      <p className="text-sm text-slate-400">Noch keine Buchungen.</p>
                    ) : (
                      <div className="space-y-3">
                        {bookings.map((b) => (
                          <div key={b.id} className="border border-slate-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                              <p className="font-black text-slate-800 text-sm">{b.service_title || "Leistung"}</p>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5">{formatDate(b.booking_date)} · {b.duration_minutes ? `${b.duration_minutes} Min.` : ""} {b.quantity && b.quantity > 1 ? `× ${b.quantity}` : ""}</p>
                              {b.notes && <p className="text-xs text-slate-500 mt-1 italic">{b.notes}</p>}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${b.status === "bezahlt" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : b.status === "storniert" ? "bg-red-50 text-red-500 border border-red-200" : "bg-amber-50 text-amber-600 border border-amber-200"}`}>
                                {b.status}
                              </span>
                              <span className="font-black text-slate-700 text-sm">{b.total_euro != null ? `${safeToFixed(Number(b.total_euro), 2).replace('.', ',')} €` : b.unit_price_euro != null ? `${safeToFixed(Number(b.unit_price_euro), 2).replace('.', ',')} €` : "–"}</span>
                              <select
                                value={['offen','bestaetigt','abgerechnet','storniert'].includes(b.status) ? b.status : 'offen'}
                                onChange={(e) => doChangeBookingStatus(b.id, e.target.value as 'offen' | 'bestaetigt' | 'abgerechnet' | 'storniert')}
                                className="text-[10px] font-black uppercase rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 outline-none cursor-pointer"
                              >
                                <option value="offen">Offen</option>
                                <option value="bestaetigt">Bestätigt</option>
                                <option value="abgerechnet">Abgerechnet</option>
                                <option value="storniert">Storniert</option>
                              </select>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 items-center">
                              <select
                                value={bookingPaymentMethod[b.id] || (b.paid_method as "bar" | "ueberweisung" | "paypal" | undefined) || "bar"}
                                onChange={(e) => setBookingPaymentMethod((prev) => ({ ...prev, [b.id]: e.target.value as "bar" | "ueberweisung" | "paypal" }))}
                                className="text-[10px] font-black uppercase rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 outline-none cursor-pointer"
                              >
                                <option value="bar">Bar</option>
                                <option value="ueberweisung">Ueberweisung</option>
                                <option value="paypal">PayPal</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => doSetBookingPaid(b.id, !(b.paid_at || b.status === 'abgerechnet'))}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-black uppercase tracking-widest bg-white hover:bg-slate-50"
                              >
                                {b.paid_at || b.status === 'abgerechnet' ? "Als offen markieren" : "Als bezahlt markieren"}
                              </button>
                              {!selectedStudent?.is_manual_customer && servicePlan.require_confirmation_each_booking === true && (
                                <button
                                  type="button"
                                  onClick={() => doRequestBookingConfirmation(b.id)}
                                  className="px-3 py-1.5 rounded-lg border border-emerald-200 text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                >
                                  Bestaetigung anfragen
                                </button>
                              )}
                              {b.paid_at && (
                                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                                  Bezahlt am {formatDate(b.paid_at)} {b.paid_method ? `(${b.paid_method})` : ""}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}

              {/* ── Abrechnung tab ── */}
              {!loadingDetail && studentTab === "abrechnung" && billing !== undefined && (
                <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Rechnungsdaten &amp; Zahlungsinfos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Name (Rechnung)</label>
                      <input type="text" placeholder="Vor- und Nachname" value={billing?.billing_name || ""} onChange={(e) => setBilling(b => ({ ...b!, billing_name: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">E-Mail (Rechnung)</label>
                      <input type="email" placeholder="email@beispiel.de" value={billing?.billing_email || ""} onChange={(e) => setBilling(b => ({ ...b!, billing_email: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Telefon</label>
                      <input type="tel" placeholder="+49 …" value={billing?.billing_phone || ""} onChange={(e) => setBilling(b => ({ ...b!, billing_phone: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Straße/Hausnummer</label>
                      <input type="text" placeholder="Musterstraße 1" value={billing?.billing_strasse || ""} onChange={(e) => setBilling(b => ({ ...b!, billing_strasse: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">IBAN (des Kunden)</label>
                      <input type="text" placeholder="DE00 0000 …" value={billing?.iban || ""} onChange={(e) => setBilling(b => ({ ...b!, iban: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Zahlungsart</label>
                      <select value={billing?.payment_method || ""} onChange={(e) => setBilling(b => ({ ...b!, payment_method: e.target.value }))} className={inputCls}>
                        <option value="">– wählen –</option>
                        <option value="bar">Bar</option>
                        <option value="überweisung">Überweisung</option>
                        <option value="lastschrift">Lastschrift</option>
                        <option value="paypal">PayPal</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Abrechnungstag (1–28)</label>
                      <input type="number" min="1" max="28" placeholder="1" value={billing?.billing_cycle_day ?? ""} onChange={(e) => setBilling(b => ({ ...b!, billing_cycle_day: e.target.value ? parseInt(e.target.value, 10) : null }))} className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Notiz</label>
                    <textarea rows={3} placeholder="Interne Notiz zu diesem Kunden" value={billing?.notes || ""} onChange={(e) => setBilling(b => ({ ...b!, notes: e.target.value }))} className={`${inputCls} resize-none`} />
                  </div>
                  <button type="button" onClick={doSaveBilling} disabled={saving} className={btnPrimary}>Speichern</button>
                </section>
              )}

              {/* ── Plan tab ── */}
              {!loadingDetail && studentTab === "plan" && (
                <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Leistungsplan / Abo-Einstellungen</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Plantyp</label>
                      <select value={servicePlan.plan_type || "einzelstunde"} onChange={(e) => setServicePlan(p => ({ ...p, plan_type: e.target.value as "abo" | "einzelstunde" }))} className={inputCls}>
                        <option value="einzelstunde">Einzelstunde</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Leistungstitel</label>
                      <input type="text" placeholder="z.B. Reitstunde" value={servicePlan.service_title || ""} onChange={(e) => setServicePlan(p => ({ ...p, service_title: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Dauer (Min.)</label>
                      <input type="number" min="1" placeholder="60" value={servicePlan.duration_minutes || ""} onChange={(e) => setServicePlan(p => ({ ...p, duration_minutes: parseInt(e.target.value, 10) || undefined }))} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Einzelpreis (Cent, z.B. 4500 = 45,00€)</label>
                      <input type="number" min="0" placeholder="4500" value={servicePlan.unit_price_cents || ""} onChange={(e) => setServicePlan(p => ({ ...p, unit_price_cents: parseInt(e.target.value, 10) || 0 }))} className={inputCls} />
                    </div>
                    {servicePlan.plan_type === "abo" && (
                      <>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Monatspreis (Cent, optional)</label>
                          <input type="number" min="0" placeholder="16000" value={servicePlan.monthly_price_cents ?? ""} onChange={(e) => setServicePlan(p => ({ ...p, monthly_price_cents: e.target.value ? parseInt(e.target.value, 10) : null }))} className={inputCls} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Stunden/Monat</label>
                          <input type="number" min="1" placeholder="4" value={servicePlan.sessions_per_month || ""} onChange={(e) => setServicePlan(p => ({ ...p, sessions_per_month: parseInt(e.target.value, 10) || 1 }))} className={inputCls} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Stornofrist (Stunden)</label>
                          <input type="number" min="0" placeholder="24" value={servicePlan.cancellation_hours || ""} onChange={(e) => setServicePlan(p => ({ ...p, cancellation_hours: parseInt(e.target.value, 10) || 0 }))} className={inputCls} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Ruecktritt moeglich?</label>
                          <select
                            value={servicePlan.cancellation_enabled === false ? "nein" : "ja"}
                            onChange={(e) => setServicePlan((p) => ({ ...p, cancellation_enabled: e.target.value === "ja" }))}
                            className={inputCls}
                          >
                            <option value="ja">Ja</option>
                            <option value="nein">Nein</option>
                          </select>
                        </div>
                        {servicePlan.cancellation_enabled !== false && (
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Freie Ruecktritte / Monat</label>
                            <select
                              value={servicePlan.max_cancellations_per_month ?? Number(servicePlan.sessions_per_month || 0)}
                              onChange={(e) => setServicePlan((p) => ({ ...p, max_cancellations_per_month: parseInt(e.target.value, 10) || 0 }))}
                              className={inputCls}
                            >
                              {Array.from({ length: Math.max(0, Number(servicePlan.sessions_per_month || 0)) + 1 }, (_, i) => i).map((value) => (
                                <option key={`max-cancel-${value}`} value={value}>{value}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </>
                    )}
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Bestaetigung bei jeder Leistung</label>
                      <select
                        value={servicePlan.require_confirmation_each_booking === true ? "ja" : "nein"}
                        onChange={(e) => setServicePlan((p) => ({ ...p, require_confirmation_each_booking: e.target.value === "ja" }))}
                        className={inputCls}
                      >
                        <option value="nein">Nein</option>
                        <option value="ja">Ja, Kunde bestaetigt mobil</option>
                      </select>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500 font-medium">
                    <p className="font-black uppercase text-[10px] tracking-widest text-slate-400 mb-1">Preisübersicht</p>
                    <p>Einzelpreis: {servicePlan.unit_price_cents ? eur(servicePlan.unit_price_cents) : "–"}</p>
                    {servicePlan.plan_type === "abo" && <p>Monatspreis: {servicePlan.monthly_price_cents ? eur(servicePlan.monthly_price_cents) : "wird aus Einzelpreis × Stunden berechnet"}</p>}
                  </div>
                  <button type="button" onClick={doSavePlan} disabled={saving} className={btnPrimary}>Plan speichern</button>
                </section>
              )}

              {/* ── Rechnung tab ── */}
              {!loadingDetail && studentTab === "rechnung" && (
                <div className="space-y-6">
                  <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Rechnung erstellen</h3>
                    <div className="flex flex-wrap gap-4 items-end">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Monat (YYYY-MM)</label>
                        <input type="month" value={invoiceMonth} onChange={(e) => setInvoiceMonth(e.target.value)} className="p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm outline-none focus:border-emerald-300" />
                      </div>
                      <button type="button" onClick={doLoadInvoice} className={btnPrimary}>Vorschau laden</button>
                    </div>
                    {servicePlan.plan_type === "abo" && servicePlan.cancellation_enabled !== false && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Ruecktritte im Monat</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Waehle, wie viele Leistungen in {invoiceMonth} kostenfrei zurueckgetreten wurden. Die Rechnung wird danach neu berechnet.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-3 items-end">
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Anzahl Ruecktritte</label>
                            <select
                              value={invoiceCancellationCount}
                              onChange={(e) => setInvoiceCancellationCount(parseInt(e.target.value, 10) || 0)}
                              className={inputCls}
                            >
                              {Array.from({ length: Math.max(0, Number((servicePlan.max_cancellations_per_month || 0) > 0 ? servicePlan.max_cancellations_per_month : servicePlan.sessions_per_month || 0)) + 1 }, (_, i) => i).map((value) => (
                                <option key={`invoice-cancel-${value}`} value={value}>{value}</option>
                              ))}
                            </select>
                          </div>
                          <button type="button" onClick={doSaveMonthlyCancellationCount} disabled={saving} className={btnSecondary}>
                            Ruecktritte uebernehmen
                          </button>
                        </div>
                      </div>
                    )}
                  </section>

                  <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Kalenderfreigabe</h3>
                        <p className="mt-2 text-sm text-slate-500">Gib hier Termine frei, die der Kunde anschliessend selbst in seinen Buchungen reservieren kann.</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-[10px] font-black uppercase tracking-widest ${calendarEnabled ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {calendarEnabled ? 'Kalender aktiv' : 'Nur mit Experten-Abo'}
                        </p>
                        {calendarPlanLabel && <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{calendarPlanLabel}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Termin</label>
                        <input type="datetime-local" value={calendarSlotForm.slotStart} onChange={(e) => setCalendarSlotForm((prev) => ({ ...prev, slotStart: e.target.value }))} className={inputCls} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Dauer (Min.)</label>
                        <input type="number" min="15" step="15" value={calendarSlotForm.durationMinutes} onChange={(e) => setCalendarSlotForm((prev) => ({ ...prev, durationMinutes: e.target.value }))} className={inputCls} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Preis (€)</label>
                        <input type="text" placeholder="45,00" value={calendarSlotForm.unitPriceEuro} onChange={(e) => setCalendarSlotForm((prev) => ({ ...prev, unitPriceEuro: e.target.value }))} className={inputCls} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Leistung</label>
                        <input type="text" placeholder="z.B. Reitstunde" value={calendarSlotForm.serviceTitle} onChange={(e) => setCalendarSlotForm((prev) => ({ ...prev, serviceTitle: e.target.value }))} className={inputCls} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Ort</label>
                        <input type="text" placeholder="Reithalle, Stall, online ..." value={calendarSlotForm.location} onChange={(e) => setCalendarSlotForm((prev) => ({ ...prev, location: e.target.value }))} className={inputCls} />
                      </div>
                      <div className="md:col-span-2 xl:col-span-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Notiz</label>
                        <input type="text" placeholder="Optionaler Hinweis für den Kunden" value={calendarSlotForm.notes} onChange={(e) => setCalendarSlotForm((prev) => ({ ...prev, notes: e.target.value }))} className={inputCls} />
                      </div>
                    </div>

                    <button type="button" onClick={doReleaseCalendarSlot} disabled={calendarSaving || !calendarEnabled} className={btnPrimary}>
                      {calendarSaving ? 'Wird freigegeben...' : 'Termin freigeben'}
                    </button>

                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Freigegebene Termine</p>
                      {calendarSlots.length === 0 ? (
                        <p className="text-sm text-slate-400">Für diesen Monat wurden noch keine buchbaren Termine freigegeben.</p>
                      ) : (
                        calendarSlots.map((slot) => (
                          <div key={slot.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                            <div>
                              <p className="text-sm font-black text-slate-800">{slot.service_title}</p>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">
                                {new Date(slot.slot_start).toLocaleString('de-DE')} · {slot.duration_minutes} Min. · {eur(slot.unit_price_cents)}
                              </p>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                                Status: {slot.status}{slot.location ? ` · ${slot.location}` : ''}
                              </p>
                              {slot.notes && <p className="text-xs text-slate-500 mt-2">{slot.notes}</p>}
                            </div>
                            {slot.status === 'open' ? (
                              <button type="button" onClick={() => doCancelCalendarSlot(slot.id)} disabled={calendarSaving} className={btnSecondary}>
                                Freigabe entfernen
                              </button>
                            ) : (
                              <span className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-50 border border-emerald-200 text-emerald-700">
                                Bereits gebucht
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  {/* Invoice preview */}
                  {invoiceData && invoiceData.success && (
                    <section className="rounded-[2rem] border border-slate-200 bg-slate-100/70 p-4 md:p-6 print:bg-white print:border-0 print:p-0">
                      <article
                        className={`mx-auto w-full max-w-[210mm] min-h-[297mm] overflow-hidden bg-white border shadow-[0_16px_50px_rgba(15,23,42,0.12)] print:shadow-none print:border-0 ${activeTemplateId === 1 ? "font-serif border-slate-300" : "border-slate-200"} ${activeTemplateId === 3 ? "relative" : ""}`}
                        style={activeTemplateId === 2 ? { borderColor: activeBrandColor } : undefined}
                      >
                        {activeTemplateId === 3 && <div className="absolute inset-y-0 left-0 w-3" style={{ backgroundColor: activeBrandColor }} />}

                        <header
                          className={`px-8 pt-8 pb-6 ${activeTemplateId === 2 ? "text-white" : "text-slate-900"} ${activeTemplateId === 1 ? "border-b-2 border-slate-800" : "border-b border-slate-200"}`}
                          style={activeTemplateId === 2 ? { background: `linear-gradient(120deg, ${activeBrandColor} 0%, #0f172a 100%)` } : undefined}
                        >
                          <div className={`flex justify-between items-start gap-6 ${activeTemplateId === 3 ? "pl-3" : ""}`}>
                            <div>
                              {invoiceSettings.logo_url && <img src={invoiceSettings.logo_url} alt="Logo" className="h-12 mb-4" />}
                              <p className="font-black text-xl italic uppercase">{invoiceData.expert?.display_name || userName}</p>
                              <p className={`text-xs mt-0.5 whitespace-pre-line ${activeTemplateId === 2 ? "text-white/90" : "text-slate-500"}`}>{invoiceData.expert?.adresse || ""}</p>
                              {invoiceSettings.tel && <p className={`text-xs ${activeTemplateId === 2 ? "text-white/90" : "text-slate-500"}`}>Tel: {invoiceSettings.tel}</p>}
                              {invoiceSettings.steuernummer && <p className={`text-xs ${activeTemplateId === 2 ? "text-white/90" : "text-slate-500"}`}>St.-Nr.: {invoiceSettings.steuernummer}</p>}
                              {invoiceSettings.ust_idnr && <p className={`text-xs ${activeTemplateId === 2 ? "text-white/90" : "text-slate-500"}`}>USt-IdNr.: {invoiceSettings.ust_idnr}</p>}
                            </div>
                            <div className="text-right">
                              <p className={`text-[10px] font-black uppercase tracking-widest ${activeTemplateId === 2 ? "text-white/80" : "text-slate-400"}`}>Rechnung · {activeTemplateName}</p>
                              <p className="text-2xl font-black italic uppercase mt-1" style={{ color: activeTemplateId === 1 ? "#0f172a" : activeTemplateId === 2 ? "#ffffff" : activeBrandColor }}>
                                {invoiceSettings.invoice_prefix || "R"}-{String(invoiceData.invoiceNumber || "001").padStart(4, "0")}
                              </p>
                              <p className={`text-xs mt-1 ${activeTemplateId === 2 ? "text-white/80" : "text-slate-400"}`}>{new Date().toLocaleDateString("de-DE")}</p>
                            </div>
                          </div>
                        </header>

                        <main className={`px-8 py-6 ${activeTemplateId === 3 ? "pl-11" : ""}`}>
                          <div className={`mb-8 ${activeTemplateId === 2 ? "rounded-xl bg-slate-50 p-4 border border-slate-200" : ""} ${activeTemplateId === 3 ? "border border-slate-300 p-4 bg-slate-50/60" : ""}`}>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rechnungsempfänger</p>
                            <p className="font-black text-slate-800 mt-1">{invoiceData.student?.billing_name || invoiceData.student?.display_name || "–"}</p>
                            <p className="text-sm text-slate-500">{invoiceData.student?.billing_email || invoiceData.student?.email || ""}</p>
                            <p className="text-sm text-slate-500 whitespace-pre-line">{invoiceData.student?.billing_strasse ? `${invoiceData.student.billing_strasse}\n${invoiceData.student.billing_plz || ""} ${invoiceData.student.billing_city || ""}` : ""}</p>
                          </div>

                          <div
                            className={`mb-2 grid grid-cols-[1fr_80px_100px_100px] gap-2 text-[9px] font-black uppercase tracking-widest pb-2 px-2 py-1 rounded-t-lg ${activeTemplateId === 2 ? "text-white border-transparent" : "text-slate-500 border-b border-slate-200"} ${activeTemplateId === 3 ? "bg-slate-900 text-slate-100" : ""}`}
                            style={activeTemplateId === 2 ? { backgroundColor: activeBrandColor } : undefined}
                          >
                            <span>Leistung</span><span className="text-right">Menge</span><span className="text-right">Einzel</span><span className="text-right">Gesamt</span>
                          </div>
                          {(invoiceData.bookings || []).map((b: Booking) => (
                            <div key={b.id} className={`grid grid-cols-[1fr_80px_100px_100px] gap-2 py-2 text-sm ${activeTemplateId === 1 ? "border-b border-slate-200" : activeTemplateId === 2 ? "border-b border-slate-100" : "border-b border-dashed border-slate-300"}`}>
                              <div>
                                <p className="font-bold text-slate-800">{b.service_title}</p>
                                <p className="text-[10px] text-slate-400">{formatDate(b.booking_date)}{b.duration_minutes ? ` · ${b.duration_minutes} Min.` : ""}</p>
                                {b.offer_conditions_text && (
                                  <p className="text-[10px] text-slate-500 mt-1 whitespace-pre-wrap">{b.offer_conditions_text}</p>
                                )}
                              </div>
                              <p className="text-right font-bold text-slate-600">{b.quantity ?? 1}</p>
                              <p className="text-right font-bold text-slate-600">{b.unit_price_euro != null ? `${safeToFixed(Number(b.unit_price_euro), 2).replace('.', ',')} €` : "–"}</p>
                              <p className="text-right font-black text-slate-800">{b.total_euro != null ? `${safeToFixed(Number(b.total_euro), 2).replace('.', ',')} €` : "–"}</p>
                            </div>
                          ))}

                          <div className={`mt-4 space-y-1.5 ${activeTemplateId === 2 ? "rounded-xl border p-4" : ""} ${activeTemplateId === 3 ? "rounded-none border border-slate-900 p-4" : ""}`} style={activeTemplateId === 2 ? { borderColor: activeBrandColor } : undefined}>
                            {(() => {
                              const totalEuro = (invoiceData.bookings || []).reduce((sum: number, b: Booking) => sum + (Number(b.total_euro) || Number(b.unit_price_euro) || 0), 0);
                              const isKlein = invoiceSettings.is_kleinunternehmer;
                              const mwst = !isKlein && invoiceSettings.mwst_satz ? invoiceSettings.mwst_satz : 0;
                              const mwstEuro = totalEuro * mwst / 100;
                              return (
                                <>
                                  <div className="flex justify-end gap-6 text-sm">
                                    <span className="font-bold text-slate-500">Nettobetrag</span>
                                    <span className="font-black text-slate-800 w-24 text-right">{safeToFixed(totalEuro, 2).replace('.', ',')} €</span>
                                  </div>
                                  {invoiceData.totals?.protection_fee_cents > 0 && (
                                    <div className="flex justify-end gap-6 text-sm">
                                      <span className="font-bold text-slate-500">Kaeufer- & Anbieterschutz</span>
                                      <span className="font-black text-slate-800 w-24 text-right">{safeToFixed(Number(invoiceData.totals.protection_fee_cents || 0) / 100, 2).replace('.', ',')} €</span>
                                    </div>
                                  )}
                                  {!isKlein && mwst > 0 && (
                                    <div className="flex justify-end gap-6 text-sm">
                                      <span className="font-bold text-slate-500">MwSt. {mwst}%</span>
                                      <span className="font-black text-slate-800 w-24 text-right">{safeToFixed(mwstEuro, 2).replace('.', ',')} €</span>
                                    </div>
                                  )}
                                  <div className="flex justify-end gap-6 text-base border-t border-slate-200 pt-2 mt-2">
                                    <span className="font-black uppercase text-slate-800">Gesamtbetrag</span>
                                    <span className="font-black w-24 text-right" style={{ color: activeTemplateId === 1 ? "#0f172a" : activeBrandColor }}>{safeToFixed((((Number(invoiceData.totals?.customer_total_cents || 0) / 100) || totalEuro) + mwstEuro), 2).replace('.', ',')} €</span>
                                  </div>
                                  {invoiceData.totals?.expert_payout_cents > 0 && (
                                    <div className="flex justify-end gap-6 text-sm">
                                      <span className="font-bold text-slate-500">Auszahlung an Experten</span>
                                      <span className="font-black text-slate-800 w-24 text-right">{safeToFixed(Number(invoiceData.totals.expert_payout_cents || 0) / 100, 2).replace('.', ',')} €</span>
                                    </div>
                                  )}
                                  {isKlein && (
                                    <p className="text-xs text-slate-400 mt-4">Gemäß §19 UStG wird keine Umsatzsteuer berechnet.</p>
                                  )}
                                </>
                              );
                            })()}
                          </div>

                          {(invoiceSettings.iban || invoiceSettings.kontoname) && (
                            <div className={`mt-8 p-4 rounded-xl text-xs text-slate-500 space-y-0.5 ${activeTemplateId === 1 ? "bg-slate-50" : "bg-white border"} ${activeTemplateId === 3 ? "rounded-none border-slate-900" : ""}`} style={activeTemplateId === 2 ? { borderColor: activeBrandColor } : undefined}>
                              <p className="font-black uppercase text-[10px] tracking-widest text-slate-400 mb-1">Bankverbindung</p>
                              {invoiceSettings.kontoname && <p>Kontoinhaber: <span className="font-bold text-slate-700">{invoiceSettings.kontoname}</span></p>}
                              {invoiceSettings.iban && <p>IBAN: <span className="font-bold text-slate-700">{invoiceSettings.iban}</span></p>}
                              {invoiceSettings.bic && <p>BIC: <span className="font-bold text-slate-700">{invoiceSettings.bic}</span></p>}
                              {invoiceSettings.bankname && <p>Bank: <span className="font-bold text-slate-700">{invoiceSettings.bankname}</span></p>}
                            </div>
                          )}
                        </main>

                        <footer
                          className={`px-8 py-5 text-xs border-t ${activeTemplateId === 2 ? "text-white border-white/20" : "text-slate-500 border-slate-200"} ${activeTemplateId === 3 ? "pl-11" : ""}`}
                          style={activeTemplateId === 2 ? { backgroundColor: "#0f172a" } : undefined}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <span>Vielen Dank für dein Vertrauen.</span>
                            <span>Seite 1/1</span>
                          </div>
                          <div className={`mt-1 ${activeTemplateId === 2 ? "text-white/70" : "text-slate-400"}`}>
                            {invoiceSettings.invoice_prefix || "R"}-{String(invoiceData.invoiceNumber || "001").padStart(4, "0")} · {new Date().toLocaleDateString("de-DE")}
                          </div>
                        </footer>
                      </article>

                      {!selectedStudent?.is_manual_customer && servicePlan.require_confirmation_each_booking === true && Array.isArray(invoiceData.bookings) && invoiceData.bookings.length > 0 && (
                        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 print:hidden">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Rechtsschutz: mobile Bestaetigung</p>
                          <p className="mt-1 text-xs text-emerald-800">Fordere je Leistung eine Handy-Bestaetigung an. Der Link wird nach Erstellung in die Zwischenablage kopiert.</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(invoiceData.bookings as Booking[]).map((b) => (
                              <button
                                key={`invoice-confirm-${b.id}`}
                                type="button"
                                onClick={() => doRequestBookingConfirmation(b.id)}
                                className="px-3 py-1.5 rounded-lg border border-emerald-200 text-[10px] font-black uppercase tracking-widest bg-white text-emerald-700 hover:bg-emerald-100"
                              >
                                Bestaetigung anfragen: {b.service_title || `Leistung #${b.id}`}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-8 flex gap-3 print:hidden">
                        <button type="button" onClick={doPrintInvoice} className={btnPrimary}>Drucken / als PDF</button>
                        <button type="button" onClick={() => setInvoiceData(null)} className={btnSecondary}>Schließen</button>
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════════ HINZUFÜGEN ══════════ */}
          {mainTab === "hinzufuegen" && (
            <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Kundenstamm</p>
                <h2 className="mt-2 text-2xl font-black italic uppercase tracking-tight text-slate-900">Schüler hinzufügen</h2>
              </div>

              {/* Sub-tab switcher */}
              <div className="flex gap-2 flex-wrap">
                {(["suche", "einladen", "manuell"] as AddSubTab[]).map((t) => {
                  const labels: Record<AddSubTab, string> = { suche: "Benutzer suchen", einladen: "Einladen", manuell: "Manueller Kunde" };
                  return (
                    <button key={t} type="button" onClick={() => setAddSubTab(t)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-colors ${addSubTab === t ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"}`}>
                      {labels[t]}
                    </button>
                  );
                })}
              </div>

              {/* Search existing */}
              {addSubTab === "suche" && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">Suche nach registrierten Plattform-Nutzern und füge sie deinem Kundenstamm hinzu.</p>
                  <div className="flex gap-3">
                    <input type="text" placeholder="Name oder E-Mail" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()} className={`${inputCls} flex-1`} />
                    <button type="button" onClick={doSearch} disabled={searching} className={btnPrimary}>Suchen</button>
                  </div>
                  {searchResults.length > 0 && (
                    <div className="space-y-2">
                      {searchResults.map((u: any) => (
                        <div key={u.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl">
                          <div>
                            <p className="font-black text-slate-800">{u.display_name || u.email}</p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </div>
                          <button type="button" onClick={() => doAddExisting(u.id)} disabled={saving} className={btnPrimary}>Hinzufügen</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {searchResults.length === 0 && searchTerm && !searching && (
                    <p className="text-sm text-slate-400">Keine Ergebnisse. Nutze "Einladen" für neue Nutzer.</p>
                  )}
                </div>
              )}

              {/* Invite new */}
              {addSubTab === "einladen" && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">Lade eine neue Person ein. Sie erhält eine E-Mail mit einem Registrierungslink und wird automatisch deinem Kundenstamm zugeordnet.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Vorname *</label>
                      <input type="text" value={inviteForm.vorname} onChange={(e) => setInviteForm(f => ({ ...f, vorname: e.target.value }))} placeholder="Vorname" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Nachname *</label>
                      <input type="text" value={inviteForm.nachname} onChange={(e) => setInviteForm(f => ({ ...f, nachname: e.target.value }))} placeholder="Nachname" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">E-Mail *</label>
                      <input type="email" value={inviteForm.email} onChange={(e) => setInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="email@beispiel.de" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Abrechnungstag (1–28)</label>
                      <input type="number" min="1" max="28" value={inviteForm.billingCycleDay} onChange={(e) => setInviteForm(f => ({ ...f, billingCycleDay: e.target.value }))} placeholder="1" className={inputCls} />
                    </div>
                  </div>
                  <button type="button" onClick={doInvite} disabled={saving || !inviteForm.vorname || !inviteForm.nachname || !inviteForm.email} className={btnPrimary}>
                    Einladung senden
                  </button>
                </div>
              )}

              {/* Manual customer */}
              {addSubTab === "manuell" && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">Lege einen Offline-Kunden an, der keinen Plattform-Account hat (z.B. für Bargeld-Kunden oder externe Buchungen).</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Vollständiger Name *</label>
                      <input type="text" value={manualForm.fullName} onChange={(e) => setManualForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Vor- und Nachname" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">E-Mail (für Rechnungen)</label>
                      <input type="email" value={manualForm.billingEmail} onChange={(e) => setManualForm(f => ({ ...f, billingEmail: e.target.value }))} placeholder="optional" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Telefon</label>
                      <input type="tel" value={manualForm.billingPhone} onChange={(e) => setManualForm(f => ({ ...f, billingPhone: e.target.value }))} placeholder="optional" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Adresse</label>
                      <input type="text" value={manualForm.billingAddress} onChange={(e) => setManualForm(f => ({ ...f, billingAddress: e.target.value }))} placeholder="optional" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Abrechnungstag (1–28)</label>
                      <input type="number" min="1" max="28" value={manualForm.billingCycleDay} onChange={(e) => setManualForm(f => ({ ...f, billingCycleDay: e.target.value }))} placeholder="1" className={inputCls} />
                    </div>
                  </div>
                  <button type="button" onClick={doManual} disabled={saving || !manualForm.fullName} className={btnPrimary}>
                    Kunden anlegen
                  </button>
                </div>
              )}
            </section>
          )}

          {/* ══════════ RECHNUNGSEINSTELLUNGEN ══════════ */}
          {mainTab === "rechnungseinstellungen" && (
            <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Rechnungseinstellungen</p>
                <h2 className="mt-2 text-2xl font-black italic uppercase tracking-tight text-slate-900">Meine Rechnungsdaten</h2>
                <p className="mt-2 text-sm text-slate-500">Diese Angaben erscheinen auf deinen Rechnungen als Absender.</p>
                <button
                  type="button"
                  onClick={() => { setMainTab("uebersicht"); }}
                  className="mt-4 px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-[10px] font-black uppercase tracking-widest text-emerald-700 hover:bg-emerald-100"
                >
                  Reiter Rechnungen öffnen
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setInvoiceSectionTab("daten")}
                  className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-colors ${invoiceSectionTab === "daten" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"}`}
                >
                  Rechnungsdaten
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceSectionTab("archiv")}
                  className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-colors ${invoiceSectionTab === "archiv" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"}`}
                >
                  Erstellte Rechnungen
                </button>
              </div>

              {invoiceSectionTab === "archiv" ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_180px_180px_180px] gap-3">
                    <input
                      type="search"
                      value={invoiceArchiveSearch}
                      onChange={(e) => setInvoiceArchiveSearch(e.target.value)}
                      placeholder="Suche nach Name, Monat oder Leistung"
                      className={inputCls}
                    />
                    <select value={invoiceArchiveYear} onChange={(e) => setInvoiceArchiveYear(e.target.value)} className={inputCls}>
                      <option value="all">Alle Jahre</option>
                      {invoiceArchiveYearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                    <select value={invoiceArchiveMonth} onChange={(e) => setInvoiceArchiveMonth(e.target.value)} className={inputCls}>
                      <option value="all">Alle Monate</option>
                      {invoiceArchiveMonthOptions.map((month) => <option key={month} value={month}>{month}</option>)}
                    </select>
                    <select value={invoiceArchiveSort} onChange={(e) => setInvoiceArchiveSort(e.target.value as typeof invoiceArchiveSort)} className={inputCls}>
                      <option value="recent">Neueste zuerst</option>
                      <option value="oldest">Älteste zuerst</option>
                      <option value="name-asc">Name A-Z</option>
                      <option value="name-desc">Name Z-A</option>
                    </select>
                  </div>

                  {invoiceArchiveLoading ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">Rechnungsarchiv wird geladen...</div>
                  ) : invoiceArchiveError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{invoiceArchiveError}</div>
                  ) : filteredInvoiceArchiveItems.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">Keine Rechnungen gefunden.</div>
                  ) : (
                    <div className="space-y-3">
                      {filteredInvoiceArchiveItems.map((item) => (
                        <div key={`${item.student_id}-${item.invoice_month}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-black uppercase text-slate-900 truncate">{item.customer_name}</p>
                              <span className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-white border border-slate-200 text-slate-500">{item.invoice_month}</span>
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              {item.booking_count} Positionen · Gesamt {eur(item.customer_total_cents)} · Leistungsanteil {eur(item.expert_payout_cents)}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {item.customer_email || "Keine E-Mail hinterlegt"}
                            </p>
                            <p className="text-xs text-slate-500 line-clamp-2">
                              {item.service_titles.length > 0 ? item.service_titles.join(" · ") : "Keine Leistungsbezeichnungen vorhanden."}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 xl:justify-end">
                            <button
                              type="button"
                              onClick={() => openArchiveInvoice(item)}
                              className="px-4 py-3 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest"
                            >
                              Rechnung öffnen
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Kontoinhaber / Firmenname</label>
                      <input type="text" value={invoiceSettings.kontoname || ""} onChange={(e) => setInvoiceSettings(s => ({ ...s, kontoname: e.target.value }))} placeholder="Max Mustermann" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Steuernummer</label>
                      <input type="text" value={invoiceSettings.steuernummer || ""} onChange={(e) => setInvoiceSettings(s => ({ ...s, steuernummer: e.target.value }))} placeholder="12/345/67890" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">USt-IdNr.</label>
                      <input type="text" value={invoiceSettings.ust_idnr || ""} onChange={(e) => setInvoiceSettings(s => ({ ...s, ust_idnr: e.target.value }))} placeholder="DE000000000" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Telefon</label>
                      <input type="tel" value={invoiceSettings.tel || ""} onChange={(e) => setInvoiceSettings(s => ({ ...s, tel: e.target.value }))} placeholder="+49 …" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">IBAN</label>
                      <input type="text" value={invoiceSettings.iban || ""} onChange={(e) => setInvoiceSettings(s => ({ ...s, iban: e.target.value }))} placeholder="DE00 0000 …" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">BIC</label>
                      <input type="text" value={invoiceSettings.bic || ""} onChange={(e) => setInvoiceSettings(s => ({ ...s, bic: e.target.value }))} placeholder="DEUTDEDB" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Bank</label>
                      <input type="text" value={invoiceSettings.bankname || ""} onChange={(e) => setInvoiceSettings(s => ({ ...s, bankname: e.target.value }))} placeholder="Deutsche Bank" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Rechnungspräfix</label>
                      <input type="text" value={invoiceSettings.invoice_prefix || ""} onChange={(e) => setInvoiceSettings(s => ({ ...s, invoice_prefix: e.target.value }))} placeholder="R" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">MwSt.-Satz (%)</label>
                      <input type="number" min="0" max="100" step="0.1" value={invoiceSettings.mwst_satz ?? ""} onChange={(e) => setInvoiceSettings(s => ({ ...s, mwst_satz: e.target.value ? parseFloat(e.target.value) : null }))} placeholder="19" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Logo-URL</label>
                      <input type="url" value={invoiceSettings.logo_url || ""} onChange={(e) => setInvoiceSettings(s => ({ ...s, logo_url: e.target.value }))} placeholder="https://…" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Akzentfarbe</label>
                      <input type="color" value={activeBrandColor} onChange={(e) => setInvoiceSettings(s => ({ ...s, brand_color: e.target.value }))} className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 p-2" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Rechnungsvorlagen</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {INVOICE_TEMPLATES.map((tpl) => {
                        const active = activeTemplateId === tpl.id;
                        return (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() => {
                              setInvoiceSettings((s) => ({ ...s, template_id: tpl.id }));
                            }}
                            className={`rounded-2xl border p-4 text-left transition-all ${active ? "border-2 bg-white shadow-sm" : "border-slate-200 bg-slate-50 hover:border-slate-300"}`}
                            style={active ? { borderColor: activeBrandColor } : undefined}
                          >
                            <p className="text-[10px] font-black uppercase tracking-widest" style={active ? { color: activeBrandColor } : undefined}>Vorlage {tpl.id}</p>
                            <p className="mt-1 text-sm font-black text-slate-800">{tpl.name}</p>
                            <p className="text-xs text-slate-500">{tpl.hint}</p>
                            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-2 space-y-1">
                              {tpl.id === 1 && (
                                <>
                                  <div className="h-px w-full bg-slate-300" />
                                  <div className="h-2 w-2/3 rounded bg-slate-200" />
                                  <div className="h-2 w-full rounded bg-slate-100" />
                                </>
                              )}
                              {tpl.id === 2 && (
                                <>
                                  <div className="h-2 rounded" style={{ backgroundColor: activeBrandColor }} />
                                  <div className="h-2 w-2/3 rounded bg-slate-200" />
                                  <div className="h-2 w-full rounded bg-slate-100" />
                                </>
                              )}
                              {tpl.id === 3 && (
                                <>
                                  <div className="flex gap-2">
                                    <div className="w-1 rounded" style={{ backgroundColor: activeBrandColor }} />
                                    <div className="flex-1 space-y-1">
                                      <div className="h-2 w-2/3 rounded bg-slate-200" />
                                      <div className="h-2 w-full rounded bg-slate-100" />
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Rechnungsvorschau in der Website</p>
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:p-6">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">PDF Vorschau</p>
                        <h3 className="mt-2 text-2xl font-black italic uppercase tracking-tight text-slate-900">{templatePreviewHeadline}</h3>
                        <p className="mt-1 text-sm text-slate-500">Die Vorschau zeigt jetzt die komplette Seite mit Kopf, Inhalt und Fuß.</p>

                        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-100 p-3">
                          <div className={`mx-auto aspect-[210/297] w-full max-w-[340px] overflow-hidden bg-white border shadow-sm ${activeTemplateId === 1 ? "font-serif border-slate-300" : "border-slate-200"} ${activeTemplateId === 3 ? "relative" : ""}`} style={activeTemplateId === 2 ? { borderColor: activeBrandColor } : undefined}>
                            {activeTemplateId === 3 && <div className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: activeBrandColor }} />}

                            <div className={`px-4 py-3 border-b ${activeTemplateId === 2 ? "text-white" : "text-slate-900"} ${activeTemplateId === 1 ? "border-slate-800" : "border-slate-200"}`} style={activeTemplateId === 2 ? { background: `linear-gradient(120deg, ${activeBrandColor} 0%, #0f172a 100%)` } : undefined}>
                              <div className="flex items-center justify-between">
                                <div className="text-[8px] font-black uppercase tracking-widest">Equily</div>
                                <div className="text-[8px] font-black uppercase tracking-widest">Rechnung</div>
                              </div>
                            </div>

                            <div className={`px-4 py-3 text-[8px] text-slate-500 ${activeTemplateId === 3 ? "pl-7" : ""}`}>
                              <div className={`mb-3 rounded ${activeTemplateId === 2 ? "border border-slate-200 bg-slate-50" : activeTemplateId === 3 ? "border border-slate-300 bg-slate-50/60" : ""} p-2`}>
                                <div className="h-1.5 w-24 rounded bg-slate-300" />
                                <div className="mt-1 h-1.5 w-16 rounded bg-slate-200" />
                              </div>
                              <div className={`grid grid-cols-[1fr_32px_42px_42px] gap-1 rounded-t px-1 py-1 text-[7px] font-black uppercase ${activeTemplateId === 2 ? "text-white" : activeTemplateId === 3 ? "bg-slate-900 text-slate-100" : "bg-slate-100 text-slate-500"}`} style={activeTemplateId === 2 ? { backgroundColor: activeBrandColor } : undefined}>
                                <span>Leistung</span><span className="text-right">Menge</span><span className="text-right">Einzel</span><span className="text-right">Gesamt</span>
                              </div>
                              <div className={`h-5 border-x border-b ${activeTemplateId === 3 ? "border-dashed border-slate-300" : "border-slate-200"}`} />
                              <div className={`mt-3 h-7 rounded ${activeTemplateId === 2 ? "border" : "border border-slate-200"} ${activeTemplateId === 3 ? "rounded-none border-slate-900" : ""}`} style={activeTemplateId === 2 ? { borderColor: activeBrandColor } : undefined} />
                            </div>

                            <div className={`mt-auto px-4 py-2 text-[7px] border-t ${activeTemplateId === 2 ? "text-white border-white/20" : "text-slate-400 border-slate-200"}`} style={activeTemplateId === 2 ? { backgroundColor: "#0f172a" } : undefined}>
                              <div className="flex justify-between"><span>Vielen Dank</span><span>Seite 1/1</span></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">Die Auswahl wird direkt in der Rechnungs-Vorschau übernommen.</p>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={!!invoiceSettings.is_kleinunternehmer}
                      onChange={(e) => setInvoiceSettings(s => ({ ...s, is_kleinunternehmer: e.target.checked }))}
                      className="w-5 h-5 accent-emerald-600"
                    />
                    <span className="text-sm font-bold text-slate-700 group-hover:text-emerald-700">Ich bin Kleinunternehmer (§19 UStG) — keine MwSt. auf Rechnungen</span>
                  </label>

                  <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500">
                    <p className="font-black uppercase text-[9px] tracking-widest text-slate-400 mb-1">Nächste Rechnungsnummer</p>
                    <p className="font-black text-slate-700">{invoiceSettings.invoice_prefix || "R"}-{String((invoiceSettings.invoice_counter || 0) + 1).padStart(4, "0")}</p>
                  </div>

                  <button type="button" onClick={doSaveInvoiceSettings} disabled={saving} className={btnPrimary}>Einstellungen speichern</button>
                </>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
