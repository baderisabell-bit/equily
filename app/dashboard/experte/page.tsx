"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoggedInHeader from "../../components/logged-in-header";
import DashboardSidebar from "../../components/dashboard-sidebar";
import { getExpertDashboardAnalytics } from "../../actions";

// Sub-Komponente für die Metriken
const StatTile = ({ label, value }: { label: string; value: any }) => (
  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
    <p className="text-[9px] font-black uppercase text-slate-500 tracking-tight">{label}</p>
    <p className="text-lg font-black italic text-slate-900">{value || 0}</p>
  </div>
);

export default function ExpertDashboardPage() {
  const router = useRouter();
  
  // States
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState("Experte");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  // Initialisierung
  useEffect(() => {
    const init = async () => {
      const userIdRaw = sessionStorage.getItem("userId");
      const roleRaw = sessionStorage.getItem("userRole");
      const name = sessionStorage.getItem("userName") || "Experte";
      setRole(roleRaw);
      setUserName(name);
      
      const parsedUserId = userIdRaw ? parseInt(userIdRaw, 10) : 0;
      if (parsedUserId > 0) {
        setUserId(parsedUserId);
        try {
          const res = await getExpertDashboardAnalytics(parsedUserId);
          if (res.success) {
            setAnalytics(res.data);
            console.log("Analytics Daten erhalten:", res.data);
          }
        } catch (err) {
          console.error("Fetch Error:", err);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  // Filter-Logik
  const isFilterActive = (f: string) => activeFilters.length === 0 || activeFilters.includes(f);
  
  // Grid-Spalten Logik
  const visibleCount = [
    isFilterActive('Anzeigen'), 
    isFilterActive('Beiträge'), 
    isFilterActive('Werbung')
  ].filter(Boolean).length || 1;

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#fbfcfd] text-[10px] font-black uppercase">Lade Intelligence...</div>;

  const totalReach = (analytics?.profile?.viewsTotal || 0) + 
                     (analytics?.posts?.viewsTotal || 0) + 
                     (analytics?.ads?.viewsTotal || 0);

  const openProfile = () => {
    if (userId && userId > 0) {
      window.location.href = `/profil/${userId}`;
      return;
    }
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-[#fbfcfd] text-slate-900 font-sans text-sm">
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpenProfile={openProfile} role="experte" />

      <LoggedInHeader userId={userId} role="experte" userName={userName} onOpenSidebar={() => setSidebarOpen(true)} brandText="Expert Intelligence" />

      <main className="max-w-[1400px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          
          {/* Reihe 1: Stats */}
          <div className="md:col-span-3 bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
            <p className="text-[9px] font-black uppercase text-slate-400 mb-2">Profil-Sichtbarkeit</p>
            <p className="text-5xl font-black italic text-emerald-600">{analytics?.profile?.viewsTotal || 0}</p>
            <div className="mt-4 border-t pt-2"><p className="text-[8px] font-bold text-slate-400 uppercase">Reach: {totalReach.toLocaleString('de-DE')}</p></div>
          </div>

          <div className="md:col-span-5 bg-slate-950 rounded-[2rem] p-6 text-white flex justify-between items-center">
            <div><p className="text-[9px] font-black uppercase text-emerald-400 mb-1">Status</p><h3 className="text-xl font-black italic uppercase">{analytics?.planLabel || "Premium Experte"}</h3></div>
          </div>

          <div className="md:col-span-2 bg-white rounded-[2rem] p-6 border border-slate-100 flex flex-col justify-center text-center">
             <p className="text-[9px] font-black text-slate-400 uppercase">Anfragen</p>
             <p className="text-3xl font-black italic">{analytics?.ads?.incomingMessagesTotal || 0}</p>
          </div>
          <div className="md:col-span-2 bg-white rounded-[2rem] p-6 border border-slate-100 flex flex-col justify-center text-center">
             <p className="text-[9px] font-black text-slate-400 uppercase">Likes</p>
             <p className="text-3xl font-black italic">{analytics?.posts?.likesTotal || 0}</p>
          </div>

          {/* Performance Hub (Zentrum) */}
          <div className="md:col-span-8 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-black italic uppercase text-sm">Performance Hub</h3>
              <div className="flex gap-1 bg-slate-50 p-1 rounded-xl">
                {['Anzeigen', 'Beiträge', 'Werbung'].map(f => (
                  <button key={f} onClick={() => setActiveFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])} 
                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${activeFilters.includes(f) || activeFilters.length === 0 ? 'bg-white shadow-sm' : 'text-slate-400'}`}>{f}</button>
                ))}
              </div>
            </div>

            <div className="grid gap-6 items-end min-h-[200px]" style={{ gridTemplateColumns: `repeat(${visibleCount}, 1fr)` }}>
              {/* Bereich 1: ANZEIGEN */}
              {isFilterActive('Anzeigen') && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 justify-end">
                    {analytics?.ads?.list?.length > 0 ? (
                      analytics.ads.list.map((ad: any) => (
                        <div key={ad.id} className="w-full">
                          <div className="bg-emerald-500 rounded-lg" style={{ height: `${Math.max((ad.views || 0) * 1.5, 10)}px` }} />
                          <div className="flex justify-between mt-1 text-[7px] font-black uppercase px-1"><span className="truncate w-2/3">{ad.title}</span><span>{ad.views || 0}</span></div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[8px] font-bold text-slate-300 uppercase text-center pb-4 italic">Keine Anzeigen online</p>
                    )}
                  </div>
                  <p className="text-center text-[9px] font-black text-slate-200 border-t pt-2 tracking-[0.2em]">Anzeigen</p>
                </div>
              )}

              {/* Bereich 2: BEITRÄGE */}
              {isFilterActive('Beiträge') && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 justify-end">
                    {analytics?.posts?.list?.map((p: any) => (
                      <div key={p.id}>
                        <div className="bg-sky-500 rounded-lg" style={{ height: `${Math.max((p.views || 0) * 1.5, 10)}px` }} />
                        <div className="flex justify-between mt-1 text-[7px] font-black uppercase px-1"><span>{p.title}</span><span>{p.views || 0}</span></div>
                      </div>
                    ))}
                  </div>
                  <p className="text-center text-[9px] font-black text-slate-200 border-t pt-2 tracking-[0.2em]">Beiträge</p>
                </div>
              )}

              {/* Bereich 3: WERBUNG */}
              {isFilterActive('Werbung') && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 justify-end">
                    {analytics?.werbung?.list?.map((w: any) => (
                      <div key={w.id}>
                        <div className="bg-amber-500 rounded-lg" style={{ height: `${Math.max((w.views || 0) * 1.5, 10)}px` }} />
                        <div className="flex justify-between mt-1 text-[7px] font-black uppercase px-1"><span>{w.title}</span><span>{w.views || 0}</span></div>
                      </div>
                    ))}
                  </div>
                  <p className="text-center text-[9px] font-black text-slate-200 border-t pt-2 tracking-[0.2em]">Werbung</p>
                </div>
              )}
            </div>
          </div>

          {/* Details & Interaktionen */}
          <div className="md:col-span-4 bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 flex flex-col gap-2">
             <p className="text-[9px] font-black uppercase text-slate-400 mb-2 tracking-widest">Interaktionen</p>
             <StatTile label="Kommentare" value={analytics?.posts?.commentsTotal} />
             <StatTile label="Merkliste" value={(analytics?.profile?.wishlistTotal || 0) + (analytics?.ads?.wishlistTotal || 0)} />
             <StatTile label="Bewertungen" value={analytics?.ads?.ratingsTotal} />
          </div>

        </div>
      </main>
    </div>
  );
}