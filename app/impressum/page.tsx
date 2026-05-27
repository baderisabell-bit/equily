import Link from 'next/link';

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Equily</p>
            <h1 className="mt-2 text-4xl font-black italic uppercase tracking-tight text-slate-900">Impressum</h1>
          </div>
          <Link href="/" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
            Zur Startseite
          </Link>
        </div>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Gesetzliche Anbieterkennung:</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Isabell Bader<br />
            Equily<br />
            Schwendener Straße 23<br />
            87616 Marktoberdorf<br />
            Deutschland<br />
            Telefon: +4915117903181<br />
            E-Mail: info@equily.de
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Inhaltlich Verantwortlicher gemäß § 18 Abs. 2 MStV:</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Frau Isabell Bader<br />
            Innerkoflerstraße 40<br />
            81377 München<br />
            Deutschland
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">zuständige Aufsichtsbehörde für audiovisuelle Mediendienste:</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Bayerische Landeszentrale für neue Medien (BLM)<br />
            Heinrich-Lübke-Str. 27<br />
            81737 München<br />
            Internet: https://www.blm.de/ (https://www.blm.de/de/startseite.cfm)
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Verantwortlich für den Inhalt</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor Verbraucherschlichtungsstellen teilzunehmen.
          </p>
        </section>
      </main>
    </div>
  );
}