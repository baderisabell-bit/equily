"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Heart, MapPin, Search, MessageSquare, User, Star, X } from "lucide-react";
import LoggedInHeader from "../components/logged-in-header";
import SearchMap from "../components/search-map";
import { ANGEBOT_KATEGORIEN } from "./kategorien-daten";
import { safeToFixed } from "../lib/num";
import { addWishlistItem, getSearchFeed, getWishlistItems, rateUser, removeWishlistItem, sendConnectionRequest } from "../actions";

type FilterType = "all" | "profile" | "groups" | "posts" | "offers";

type SearchEntry = {
  id: string;
  userId: number | null;
  typ: "experte" | "nutzer" | "beitrag" | "gruppe" | "angebot";
  name: string;
  ort: string;
  plz?: string;
  rating: number;
  kategorien: string[];
  angebotText: string;
  sucheText: string;
  lat?: number;
  lon?: number;
  imageUrl?: string;
};

type CategoryOption = {
  label: string;
  themen: string[];
};

const RADIUS_OPTIONS_KM = [5, 10, 20, 30, 50, 75, 100];

const FILTER_TYPES: { value: FilterType; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "profile", label: "Profile" },
  { value: "groups", label: "Gruppen" },
  { value: "posts", label: "Beiträge" },
  { value: "offers", label: "Anzeigen" },
];

function normalizeText(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function displayText(value: string) {
  return String(value || "")
    .replace(/ae/g, "ä")
    .replace(/oe/g, "ö")
    .replace(/ue/g, "ü");
}

function distanceKmBetween(from: { lat: number; lon: number }, to: { lat: number; lon: number }) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lon - from.lon);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildSearchLocationKey(ort: string, plz: string) {
  return String([ort, plz].filter(Boolean).join(" ")).trim().toLowerCase();
}

function buildCategoryOptions(): CategoryOption[] {
  return ANGEBOT_KATEGORIEN.map((category) => ({
    label: String(category.label || "").trim(),
    themen: Array.isArray(category.themen)
      ? category.themen.flatMap((entry) => {
          if (typeof entry === "string") return [entry];
          const baseName = String(entry?.name || "").trim();
          const base = baseName ? [baseName] : [];
          const subs = Array.isArray(entry?.subs) ? entry.subs.map((item) => String(item || "").trim()).filter(Boolean) : [];
          return [...base, ...subs.map((sub) => `${baseName}: ${sub}`)];
        })
      : [],
  }));
}

async function resolveSearchCoordinates(location: string, cacheRef: React.MutableRefObject<Map<string, { lat: number; lon: number } | null>>) {
  const key = String(location || "").trim().toLowerCase();
  if (!key) return null;
  if (cacheRef.current.has(key)) return cacheRef.current.get(key) || null;

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=de&q=${encodeURIComponent(location)}`, {
      headers: { Accept: "application/json" },
    });
    if (response.ok) {
      const data = await response.json();
      const first = Array.isArray(data) ? data[0] : null;
      const lat = Number(first?.lat);
      const lon = Number(first?.lon);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        const coords = { lat, lon };
        cacheRef.current.set(key, coords);
        return coords;
      }
    }
  } catch {
    // ignore geocode failures
  }

  cacheRef.current.set(key, null);
  return null;
}

// Detail Modal Component
function DetailModal({
  entry,
  onClose,
  userId,
  isWishlisted,
  onWishlistToggle,
}: {
  entry: SearchEntry | null;
  onClose: () => void;
  userId: number | null;
  isWishlisted: boolean;
  onWishlistToggle: (entry: SearchEntry) => Promise<void>;
}) {
  const [comments, setComments] = useState<Array<{ user: string; text: string; likes: number }>>([]);
  const [newComment, setNewComment] = useState("");
  const [currentRating, setCurrentRating] = useState(0);
  const router = useRouter();

  useEffect(() => {
    setCurrentRating(Number(entry?.rating || 0));
  }, [entry]);

  if (!entry) return null;

  const handleWishlist = async () => {
    await onWishlistToggle(entry);
  };

  const handleSendMessage = () => {
    if (entry.userId) {
      const params = new URLSearchParams();
      params.set("target", displayText(entry.name));
      params.set("targetType", entry.typ === "angebot" ? "anzeige" : "person");
      params.set("targetUserId", String(entry.userId));
      router.push(`/nachrichten?${params.toString()}`);
    }
  };

  const handleOpenProfile = () => {
    if (entry.userId) {
      router.push(`/profil/${entry.userId}`);
    }
  };


  const handleConnect = () => {
    const targetUserId = entry.userId;
    if (typeof targetUserId === 'number' && targetUserId > 0 && userId) {
      void (async () => {
        const res = await sendConnectionRequest({ requesterId: userId, targetUserId });
        if (!res.success) {
          alert(res.error || 'Vernetzungsanfrage konnte nicht gesendet werden.');
          return;
        }
        if (res.status === 'accepted') {
          alert('Du folgst diesem Profil jetzt.');
          return;
        }
        alert('Vernetzung/Folgen wurde gesendet.');
      })();
    }
  };
  const handleAddComment = () => {
    if (newComment.trim()) {
      setComments([...comments, { user: "Du", text: newComment, likes: 0 }]);
      setNewComment("");
    }
  };

  const handleRating = async (stars: number) => {
    setCurrentRating(stars);
    if (entry.userId && userId) {
      await rateUser({ raterUserId: userId, ratedUserId: entry.userId, rating: stars });
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white p-6">
          <h2 className="text-2xl font-black italic uppercase text-slate-900">{displayText(entry.name)}</h2>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Image */}
          {entry.imageUrl && (
            <div className="rounded-2xl overflow-hidden border border-slate-200">
              <img src={entry.imageUrl} alt={entry.name} className="w-full h-64 object-cover" />
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {entry.typ === "experte" ? "Experte" : entry.typ === "nutzer" ? "Nutzer" : entry.typ === "angebot" ? "Anzeige" : entry.typ === "gruppe" ? "Gruppe" : "Beitrag"}
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">{displayText(entry.ort)}{entry.plz ? ` · ${entry.plz}` : ""}</p>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => void handleRating(star)} className={`text-lg ${star <= Math.round(currentRating) ? "text-yellow-400" : "text-slate-200"}`}>
                    ★
                  </button>
                ))}
                <span className="ml-2 text-sm font-bold text-slate-700">({safeToFixed(currentRating, 1)})</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-700">{displayText(entry.angebotText || entry.sucheText || "Keine Beschreibung verfügbar.")}</p>
          </div>

          {/* Categories */}
          {entry.kategorien.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {entry.kategorien.map((cat) => (
                <span key={cat} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black uppercase text-slate-600">
                  {displayText(cat)}
                </span>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <button
              onClick={() => void handleWishlist()}
              className={`flex items-center justify-center gap-2 rounded-xl py-3 font-black uppercase text-[10px] tracking-widest transition ${
                isWishlisted ? "bg-red-100 text-red-600 border border-red-200" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Heart size={14} fill={isWishlisted ? "currentColor" : "none"} /> {isWishlisted ? "Gemerkt" : "Merken"}
            </button>

            {entry.userId && (
              <>
                <button
                  onClick={handleSendMessage}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 font-black uppercase text-[10px] text-slate-700 tracking-widest hover:bg-slate-50 transition"
                >
                  <MessageSquare size={14} /> Nachricht
                </button>

                {entry.typ !== "gruppe" && entry.typ !== "beitrag" && (
                  <>
                    <button
                      onClick={handleOpenProfile}
                      className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 font-black uppercase text-[10px] text-slate-700 tracking-widest hover:bg-slate-50 transition"
                    >
                      <User size={14} /> Profil
                    </button>

                    {entry.typ === "experte" && (
                      <button
                        onClick={handleConnect}
                        className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white py-3 font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition"
                      >
                        Vernetzen
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* Comments Section (für Beiträge) */}
          {entry.typ === "beitrag" && (
            <div className="space-y-4 border-t border-slate-200 pt-6">
              <h3 className="font-black uppercase text-slate-900">Kommentare</h3>

              {/* Comment Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Kommentar schreiben..."
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-slate-400"
                  onKeyPress={(e) => e.key === "Enter" && handleAddComment()}
                />
                <button onClick={handleAddComment} className="rounded-xl bg-emerald-600 text-white px-4 py-2 font-black text-[10px] hover:bg-emerald-700">
                  Senden
                </button>
              </div>

              {/* Comments List */}
              <div className="space-y-3">
                {comments.map((comment, i) => (
                  <div key={i} className="rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-black text-slate-900">{comment.user}</p>
                      <button className="text-slate-400 hover:text-red-600">
                        <Heart size={14} />
                      </button>
                    </div>
                    <p className="text-sm text-slate-700 mt-1">{comment.text}</p>
                    <p className="text-xs text-slate-400 mt-2">{comment.likes} Likes</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SuchseiteContent() {
  const categoryOptions = useMemo(buildCategoryOptions, []);

  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"search" | "map">("search");
  const [searchTerm, setSearchTerm] = useState("");
  const [ortFilter, setOrtFilter] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [entries, setEntries] = useState<SearchEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<SearchEntry | null>(null);
  const [selectedRadiusKm, setSelectedRadiusKm] = useState("");
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lon: number } | null>(null);
  const searchGeoCacheRef = useRef<Map<string, { lat: number; lon: number } | null>>(new Map());

  const activeCategory = useMemo(() => categoryOptions.find((category) => category.label === selectedCategory) || null, [categoryOptions, selectedCategory]);
  const selectedThemeSet = useMemo(() => new Set(selectedThemes), [selectedThemes]);

  useEffect(() => {
    const init = async () => {
      const userIdRaw = sessionStorage.getItem("userId");
      const roleRaw = sessionStorage.getItem("role");
      const name = sessionStorage.getItem("userName");
      const parsedUserId = userIdRaw ? parseInt(userIdRaw, 10) : null;
      setUserId(parsedUserId);
      setRole(roleRaw);
      setUserName(name);
      setLoading(false);

      const res = await getSearchFeed(parsedUserId, {});
      if (res.success) {
        setEntries(res.data || res.items || res.feed || []);
      } else {
        setFeedError("Feed konnte nicht geladen werden");
      }

      if (parsedUserId) {
        const wishlistRes = await getWishlistItems(parsedUserId);
        if (wishlistRes.success && Array.isArray(wishlistRes.items)) {
          setWishlistIds(new Set((wishlistRes.items as Array<{ sourceId?: string }>).map((item) => String(item.sourceId || "").trim()).filter(Boolean)));
        }
      }
    };
    init();
  }, []);

  useEffect(() => {
    let isActive = true;
    const updateCoords = async () => {
      const key = buildSearchLocationKey(ortFilter, "");
      if (!key) {
        if (isActive) setLocationCoords(null);
        return;
      }

      const coords = await resolveSearchCoordinates(key, searchGeoCacheRef);
      if (!isActive) return;
      setLocationCoords(coords);
    };

    void updateCoords();
    return () => {
      isActive = false;
    };
  }, [ortFilter]);

  const filteredEntries = useMemo(() => {
    let result = entries;

    if (filterType !== "all") {
      const typeMap: Record<FilterType, string[]> = {
        all: [],
        profile: ["experte", "nutzer"],
        groups: ["gruppe"],
        posts: ["beitrag"],
        offers: ["angebot"],
      };
      result = result.filter((entry) => typeMap[filterType].includes(entry.typ));
    }

    if (searchTerm) {
      const normalized = normalizeText(searchTerm);
      result = result.filter((entry) => normalizeText(entry.name).includes(normalized) || normalizeText(entry.sucheText).includes(normalized));
    }

    if (ortFilter) {
      const normalized = normalizeText(ortFilter);
      result = result.filter((entry) => normalizeText(entry.ort).includes(normalized));
    }

    const radiusValue = Number(selectedRadiusKm || 0);
    if (radiusValue > 0 && locationCoords) {
      result = result.filter((entry) => {
        if (!entry.lat || !entry.lon) return false;
        return distanceKmBetween(locationCoords, { lat: entry.lat, lon: entry.lon }) <= radiusValue;
      });
    }

    if (selectedThemes.length > 0) {
      result = result.filter((entry) => entry.kategorien.some((cat) => selectedThemeSet.has(cat)));
    } else if (selectedCategory) {
      result = result.filter((entry) => entry.kategorien.some((cat) => normalizeText(cat) === normalizeText(selectedCategory)));
    }

    return result;
  }, [entries, filterType, searchTerm, ortFilter, selectedThemes, selectedThemeSet, selectedRadiusKm, locationCoords]);

  const entryDistanceKm = useMemo(() => {
    if (!locationCoords) return {} as Record<string, number | null>;
    return filteredEntries.reduce<Record<string, number | null>>((acc, entry) => {
      if (!entry.lat || !entry.lon) {
        acc[entry.id] = null;
        return acc;
      }
      acc[entry.id] = distanceKmBetween(locationCoords, { lat: entry.lat, lon: entry.lon });
      return acc;
    }, {});
  }, [filteredEntries, locationCoords]);

  const mapEntries = useMemo(() => filteredEntries.filter((e) => e.lat && e.lon), [filteredEntries]);

  const openProfile = () => {
    if (userId && userId > 0) {
      window.location.href = `/profil/${userId}`;
      return;
    }
    window.location.href = "/login";
  };

  const handleLogout = () => {
    sessionStorage.clear();
    window.location.href = "/";
  };

  const clearFilters = () => {
    setSearchTerm("");
    setOrtFilter("");
    setSelectedCategory("");
    setSelectedThemes([]);
    setSelectedRadiusKm("");
    setLocationCoords(null);
  };

  const toggleWishlist = async (entry: SearchEntry) => {
    if (!userId) return;

    const sourceId = String(entry.id || "").trim();
    if (!sourceId) return;

    const currentlyWishlisted = wishlistIds.has(sourceId);
    const res = currentlyWishlisted
      ? await removeWishlistItem(userId, sourceId)
      : await addWishlistItem(userId, entry);

    if (!res.success) return;

    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (currentlyWishlisted) next.delete(sourceId);
      else next.add(sourceId);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      {sidebarOpen && (
        <>
          <button type="button" aria-label="Menü schließen" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm" />
          <aside className="fixed left-0 top-0 z-[70] h-full w-72 bg-white shadow-2xl transition-transform duration-300 p-6 flex flex-col">
            <div className="flex justify-between items-center mb-8 text-emerald-600 font-black italic tracking-tighter">
              MENÜ
              <button onClick={() => setSidebarOpen(false)} className="text-slate-300 text-xl leading-none">
                ×
              </button>
            </div>
            <nav className="space-y-5 flex-grow">
              <Link href="/" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">
                Startseite
              </Link>
              <button type="button" onClick={openProfile} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">
                Mein Profil
              </button>
              <Link href="/suche" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">
                Suche
              </Link>
              <Link href="/netzwerk" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">
                Netzwerk
              </Link>
              <Link href="/nachrichten" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">
                Nachrichten
              </Link>
              <Link href="/merkliste" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">
                Merkliste
              </Link>
              <Link href="/einstellungen" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">
                Einstellungen
              </Link>
              <Link href="/kontakt" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">
                Kontakt &amp; FAQ
              </Link>
            </nav>
            <button onClick={handleLogout} className="mt-auto p-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">
              Abmelden
            </button>
          </aside>
        </>
      )}

      <LoggedInHeader
        userId={userId}
        role={role === "experte" ? "experte" : "nutzer"}
        userName={userName || "Gast"}
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenProfile={openProfile}
        searchContent={
          <>
            <div className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, Kategorie, Stichwort..."
                className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none placeholder-slate-400"
              />
            </div>
            <div className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <MapPin size={16} className="text-slate-400" />
              <input
                type="text"
                value={ortFilter}
                onChange={(e) => setOrtFilter(e.target.value)}
                placeholder="Ort oder PLZ"
                className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none placeholder-slate-400"
              />
            </div>
            <div className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-slate-400 text-sm font-black uppercase tracking-widest">km</span>
              <select
                value={selectedRadiusKm}
                onChange={(e) => setSelectedRadiusKm(e.target.value)}
                className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none"
              >
                <option value="">Umkreis wählen</option>
                {RADIUS_OPTIONS_KM.map((radius) => (
                  <option key={radius} value={String(radius)}>{radius} km</option>
                ))}
              </select>
            </div>
          </>
        }
      />

      <main className="mx-auto max-w-[1600px] px-3 py-6 sm:px-6 lg:px-8">
        {/* Filter Header */}
        <div className="mb-6 rounded-[1.25rem] border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-start gap-2 overflow-visible">
            <div className="relative z-30 shrink-0">
              <button
                type="button"
                onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                {FILTER_TYPES.find((t) => t.value === filterType)?.label} <ChevronDown size={14} />
              </button>
              {typeDropdownOpen && (
                <div className="absolute top-12 left-0 z-40 rounded-2xl border border-slate-200 bg-white shadow-lg min-w-40 overflow-hidden">
                  {FILTER_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        setFilterType(type.value);
                        setTypeDropdownOpen(false);
                      }}
                      className="block w-full px-4 py-2 text-left text-sm font-bold hover:bg-slate-50"
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative z-30 shrink-0">
              <button
                type="button"
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                {selectedCategory || "Alle Kategorien"} <ChevronDown size={14} />
              </button>
              {categoryDropdownOpen && (
                <div className="absolute top-12 left-0 z-40 max-h-64 w-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("");
                      setSelectedThemes([]);
                      setCategoryDropdownOpen(false);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm font-bold hover:bg-slate-50"
                  >
                    Alle
                  </button>
                  {categoryOptions.map((category) => (
                    <button
                      key={category.label}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(category.label);
                        setSelectedThemes([]);
                        setCategoryDropdownOpen(false);
                      }}
                      className="block w-full px-4 py-2 text-left text-sm font-bold hover:bg-slate-50"
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={clearFilters} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50">
              Filter zurücksetzen
            </button>

            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setViewMode("search")}
                className={`rounded-lg px-3 py-2 text-[9px] font-black uppercase tracking-widest ${viewMode === "search" ? "bg-slate-900 text-white" : "text-slate-600"}`}
              >
                Suche
              </button>
              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={`rounded-lg px-3 py-2 text-[9px] font-black uppercase tracking-widest ${viewMode === "map" ? "bg-slate-900 text-white" : "text-slate-600"}`}
              >
                Karte
              </button>
            </div>
          </div>

          {activeCategory && activeCategory.themen.length > 0 && (
            <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Unterkategorien</p>
                  <p className="text-xs font-bold text-slate-500">{activeCategory.label} auswählen oder einzelne Themen filtern</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedThemes([])}
                  className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[9px] font-black uppercase tracking-widest text-emerald-700 hover:bg-emerald-50"
                >
                  Unterkategorien zurücksetzen
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeCategory.themen.map((theme) => {
                  const isSelected = selectedThemeSet.has(theme);
                  return (
                    <button
                      key={theme}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(activeCategory.label);
                        setSelectedThemes((prev) =>
                          prev.includes(theme) ? prev.filter((item) => item !== theme) : [...prev, theme]
                        );
                      }}
                      className={`rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50"
                      }`}
                    >
                      {theme}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!activeCategory && categoryOptions.length > 0 && (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Unterkategorien erscheinen nach Auswahl einer Hauptkategorie</p>
            </div>
          )}
        </div>

        {/* Results */}
        <div>
          {viewMode === "search" ? (
            <section className="space-y-4">
              {filteredEntries.length === 0 && !loading ? (
                <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">
                  Keine Treffer gefunden. Bitte Suche, Ort oder Kategorien anpassen.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {filteredEntries.map((entry) => (
                    <article
                      key={entry.id}
                      onClick={() => setSelectedEntry(entry)}
                      className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
                    >
                      {entry.imageUrl ? (
                        <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                          <img src={entry.imageUrl} alt={entry.name} className="h-40 w-full object-cover" loading="lazy" />
                        </div>
                      ) : null}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            {entry.typ === "experte" ? "Experte" : entry.typ === "nutzer" ? "Nutzer" : entry.typ === "angebot" ? "Anzeige" : entry.typ === "gruppe" ? "Gruppe" : "Beitrag"}
                          </p>
                          <h3 className="mt-1 text-base font-black italic uppercase text-slate-900">{displayText(entry.name)}</h3>
                          <p className="text-xs text-slate-500">
                            {displayText(entry.ort)}
                            {entry.plz ? ` · ${entry.plz}` : ""}
                          </p>
                        </div>
                        <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-700">{safeToFixed(entry.rating, 1)}</div>
                      </div>

                      <p className="mt-2 text-sm text-slate-600 line-clamp-3">{displayText(entry.angebotText || entry.sucheText || "Keine Beschreibung verfügbar.")}</p>

                      {typeof entryDistanceKm[entry.id] === "number" && (
                        <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                          {safeToFixed(entryDistanceKm[entry.id], 1)} km entfernt
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {entry.kategorien.slice(0, 4).map((category) => (
                          <span key={`${entry.id}-${category}`} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-slate-600">
                            {displayText(category)}
                          </span>
                        ))}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest ${wishlistIds.has(entry.id) ? "border-red-200 bg-red-50 text-red-600" : "border-slate-200 bg-white text-slate-700"}`}>
                          <Heart size={14} fill={wishlistIds.has(entry.id) ? "currentColor" : "none"} /> {wishlistIds.has(entry.id) ? "Gemerkt" : "Merken"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section>
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3 px-2 pt-1">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Karte</p>
                    <h2 className="mt-1 text-base font-black italic uppercase tracking-tight text-slate-900">Standorte der Treffer</h2>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {mapEntries.length} Marker
                  </span>
                </div>
                <SearchMap
                  className="h-[72vh] w-full rounded-[1.25rem] overflow-hidden"
                  entries={mapEntries}
                  onSelectEntry={(id: string) => {
                    const entry = filteredEntries.find((item) => item.id === id);
                    if (entry) {
                      setSelectedEntry(entry);
                    }
                  }}
                />
              </div>
            </section>
          )}
        </div>
      </main>

      <DetailModal
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
        userId={userId}
        isWishlisted={selectedEntry ? wishlistIds.has(selectedEntry.id) : false}
        onWishlistToggle={toggleWishlist}
      />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8">Suche wird geladen...</div>}>
      <SuchseiteContent />
    </Suspense>
  );
}
