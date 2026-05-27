import Link from "next/link";

export default function WiderrufsbelehrungPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Equily</p>
            <h1 className="mt-2 text-4xl font-black italic uppercase tracking-tight text-slate-900">Widerrufsbelehrung</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/widerrufsformular" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
              Widerrufsformular
            </Link>
            <Link href="/agb" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
              AGB
            </Link>
            <Link href="/" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
              Zur Startseite
            </Link>
          </div>
        </div>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Widerrufsrecht für den Verkauf von digitalen Inhalten</h2>
          <p className="text-sm text-slate-600 leading-relaxed">(Verbraucher ist jede natürliche Person, die ein Rechtsgeschäft zu Zwecken abschließt, die überwiegend weder ihrer gewerblichen noch ihrer selbstständigen beruflichen Tätigkeit zugerechnet werden können.)</p>

          <h3 className="text-lg font-black uppercase text-slate-900">Widerrufsbelehrung</h3>
          <p className="text-sm text-slate-600 leading-relaxed">Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.</p>

          <p className="text-sm text-slate-600 leading-relaxed">Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (Isabell Bader, Schwendener Straße 23, 87616 Marktoberdorf, Telefonnummer: +4915117903181, E-Mail-Adresse: widerruf@equily.de) mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder eine E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte Muster‑Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.</p>

          <p className="text-sm text-slate-600 leading-relaxed">Sie können Ihr Widerrufsrecht auch online unter einer entsprechend bezeichneten Schaltfläche ("Vertrag widerrufen" oder ähnlich) auf unserer Webseite (www.equily.de (https://www.equily.de)) ausüben. Wenn Sie diese Online‑Funktion nutzen, übermitteln wir Ihnen unverzüglich auf einem dauerhaften Datenträger (z. B. per E‑Mail) eine Eingangsbestätigung mit Informationen zum Inhalt der Widerrufserklärung sowie dem Datum und der Uhrzeit ihres Eingangs.</p>

          <p className="text-sm text-slate-600 leading-relaxed">Sie können das Muster‑Widerrufsformular oder eine andere eindeutige Erklärung auch auf unserer Webseite elektronisch ausfüllen und übermitteln. Machen Sie von dieser Möglichkeit Gebrauch, so werden wir Ihnen unverzüglich (z. B. per E‑Mail) eine Bestätigung über den Eingang eines solchen Widerrufs übermitteln.</p>

          <p className="text-sm text-slate-600 leading-relaxed">Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Folgen des Widerrufs</h2>
          <p className="text-sm text-slate-600 leading-relaxed">Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass Sie eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt haben), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist.</p>

          <p className="text-sm text-slate-600 leading-relaxed">Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Erlöschensgründe</h2>
          <p className="text-sm text-slate-600 leading-relaxed">Das Widerrufsrecht erlischt bei einem Vertrag über die Bereitstellung von nicht auf einem körperlichen Datenträger befindlichen digitalen Inhalten, der den Verbraucher zur Zahlung eines Preises verpflichtet, wenn der Verbraucher:</p>
          <ol className="list-decimal list-inside text-sm text-slate-600 leading-relaxed space-y-2">
            <li>ausdrücklich zugestimmt hat, dass der Unternehmer mit der Vertragserfüllung vor Ablauf der Widerrufsfrist beginnt und</li>
            <li>seine Kenntnis davon bestätigt hat, dass durch seine Zustimmung mit Beginn der Vertragserfüllung sein Widerrufsrecht erlischt und</li>
            <li>der Unternehmer dem Verbraucher eine Bestätigung des Vertrags innerhalb einer angemessenen Frist nach Vertragsschluss, spätestens jedoch bei Bereitstellung der digitalen Inhalte, auf einem dauerhaften Datenträger zur Verfügung gestellt hat, in der der Vertragsinhalt wiedergegeben ist und auf der festgehalten ist, dass der Verbraucher vor Vertragserfüllung ausdrücklich zugestimmt hat und seine Kenntnis vom Erlöschen des Widerrufsrechts bestätigt hat.</li>
          </ol>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Muster‑Widerrufsformular</h2>
          <p className="text-sm text-slate-600 leading-relaxed">(Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und senden Sie es zurück.)</p>
          <div className="text-sm text-slate-600 leading-relaxed space-y-2">
            <p>An: Isabell Bader, Schwendener Straße 23, 87616 Marktoberdorf, E‑Mail: widerruf@equily.de</p>
            <p>Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*)/ die Erbringung der folgenden Dienstleistung (*)</p>
            <p>Bestellt am (*)/ erhalten am (*)</p>
            <p>Name des/der Verbraucher(s):</p>
            <p>Anschrift des/der Verbraucher(s):</p>
            <p>Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier):</p>
            <p>Datum:</p>
            <p className="text-xs text-slate-500">(*) Unzutreffendes streichen.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
