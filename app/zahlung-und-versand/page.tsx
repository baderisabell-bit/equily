import Link from "next/link";

export default function ZahlungUndVersandPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Equily</p>
            <h1 className="mt-2 text-4xl font-black italic uppercase tracking-tight text-slate-900">Zahlung und Versand</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/agb" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
              AGB
            </Link>
            <Link href="/datenschutz" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
              Datenschutz
            </Link>
            <Link href="/" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
              Zur Startseite
            </Link>
          </div>
        </div>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Bereitstellung von digitalen Inhalten</h2>
          <p className="text-sm text-slate-600 leading-relaxed">Die Bereitstellung der Inhalte erfolgt nur innerhalb von Deutschland.</p>
          <p className="text-sm text-slate-600 leading-relaxed">Für digitale Inhalte (Daten, die in digitaler Form erstellt und bereitgestellt werden) fallen keine Versandkosten an.</p>
          <p className="text-sm text-slate-600 leading-relaxed">Digitale Inhalte werden Ihnen in Ihrem Kundenaccount bereitgestellt. Die Bereitstellung erfolgt innerhalb von 24 Stunden nach Vertragsschluss (bei vereinbarter Vorauszahlung nach dem Zeitpunkt Ihrer Zahlungsanweisung). Über die Bereitstellung werden Sie auch per E-Mail informiert.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Akzeptierte Zahlungsmöglichkeiten</h2>
          <ul className="list-disc list-inside text-sm text-slate-600 leading-relaxed">
            <li>Zahlung per SEPA-Lastschrift</li>
            <li>Sofortüberweisung von GoCardless</li>
            <li>Zahlung per PayPal (PayPal Checkout)</li>
          </ul>

          <h3 className="text-lg font-black uppercase text-slate-900">Weitere Einzelheiten zur Zahlung</h3>
          <p className="text-sm text-slate-600 leading-relaxed">Bei Zahlung per SEPA-Lastschrift ermächtigen Sie uns durch Erteilung eines entsprechenden SEPA-Mandats, den Rechnungsbetrag vom angegebenen Konto einzuziehen. Sie erhalten eine Vorabankündigung (Pre-Notification) mindestens 5 Tage vor dem Datum des Lastschrifteinzugs. Beachten Sie bitte, dass Sie verpflichtet sind für die ausreichende Deckung des Kontos zum angekündigten Datum zu sorgen.</p>

          <p className="text-sm text-slate-600 leading-relaxed">Bei Fragen finden Sie unsere Kontaktdaten im Impressum.</p>
        </section>
      </main>
    </div>
  );
}
