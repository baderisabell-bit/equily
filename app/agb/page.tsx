import Link from 'next/link';

export default function AgbPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Equily</p>
            <h1 className="mt-2 text-4xl font-black italic uppercase tracking-tight text-slate-900">Allgemeine Geschäftsbedingungen und Kundeninformationen</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/datenschutz" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">Datenschutz</Link>
            <Link href="/cookies" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">Cookies</Link>
            <Link href="/widerrufsbelehrung" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">Widerrufsbelehrung</Link>
            <Link href="/zahlung-und-versand" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">Zahlung und Versand</Link>
            <Link href="/" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">Zur Startseite</Link>
          </div>
        </div>

        <div>
          <h2 className="mt-2 text-2xl font-black uppercase text-slate-900">I. Allgemeine Geschäftsbedingungen</h2>
        </div>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h3 className="text-xl font-black uppercase text-slate-900">§ 1 Grundlegende Bestimmungen</h3>
          <p className="text-sm text-slate-600 leading-relaxed">(1) Die nachstehenden Geschäftsbedingungen gelten für Verträge, die Sie mit uns als Anbieter (Isabell Bader) über die Internetseite www.equily.de schließen. Soweit nicht anders vereinbart, wird der Einbeziehung gegebenenfalls von Ihnen verwendeter eigener Bedingungen widersprochen.</p>
          <p className="text-sm text-slate-600 leading-relaxed">(2) Verbraucher im Sinne der nachstehenden Regelungen ist jede natürliche Person, die ein Rechtsgeschäft zu Zwecken abschließt, die überwiegend weder ihrer gewerblichen noch ihrer selbständigen beruflichen Tätigkeit zugerechnet werden kann. Unternehmer ist jede natürliche oder juristische Person oder eine rechtsfähige Personengesellschaft, die bei Abschluss eines Rechtsgeschäfts in Ausübung ihrer selbständigen beruflichen oder gewerblichen Tätigkeit handelt.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h3 className="text-xl font-black uppercase text-slate-900">§ 2 Zustandekommen des Vertrages</h3>
          <p className="text-sm text-slate-600 leading-relaxed">(1) Gegenstand des Vertrages ist der Verkauf von digitalen Inhalten (Daten, die in digitaler Form erstellt und bereitgestellt werden).</p>
          <p className="text-sm text-slate-600 leading-relaxed">(2) Ihre Anfragen zur Erstellung eines Angebotes sind für Sie unverbindlich. Wir unterbreiten Ihnen hierzu ein verbindliches Angebot in Textform (z.B. per E-Mail), welches Sie innerhalb von 5 Tagen (soweit im jeweiligen Angebot keine andere Frist ausgewiesen ist) annehmen können.</p>
          <p className="text-sm text-slate-600 leading-relaxed">(3) Die Abwicklung der Bestellung und Übermittlung aller im Zusammenhang mit dem Vertragsschluss erforderlichen Informationen erfolgt per E-Mail zum Teil automatisiert. Sie haben deshalb sicherzustellen, dass die von Ihnen bei uns hinterlegte E-Mail-Adresse zutreffend ist, der Empfang der E-Mails technisch sichergestellt und insbesondere nicht durch SPAM-Filter verhindert wird.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h3 className="text-xl font-black uppercase text-slate-900">§ 3 Nutzungslizenz bei digitalen Inhalten</h3>
          <p className="text-sm text-slate-600 leading-relaxed">(1) Die angebotenen digitalen Inhalte sind urheberrechtlich geschützt. Sie erhalten zu jedem bei uns erworbenen digitalen Inhalt eine Nutzungslizenz durch den jeweiligen Lizenzgeber. Art und Umfang der Nutzungslizenz ergeben sich aus den im jeweiligen Angebot genannten Lizenzbestimmungen.</p>
          <p className="text-sm text-slate-600 leading-relaxed">(2) Soweit im jeweiligen Angebot nichts anderes angegeben ist, erhalten Sie eine einfache Nutzungslizenz. Diese umfasst ein nicht ausschließliches, zeitlich auf die im Angebot angegebene Nutzungsdauer beschränktes Recht zur Nutzung, insbesondere die Erlaubnis, eine Kopie des digitalen Inhaltes für Ihren persönlichen Gebrauch auf Ihrem Computer bzw. sonstigem elektronischen Gerät abzuspeichern und/oder auszudrucken. Sie sind nicht berechtigt, die vertragsgegenständlichen digitalen Inhalte oder Teile davon zu vermieten oder weder entgeltlich noch unentgeltlich unterlizenzieren, öffentlich wiedergeben oder in sonstiger Weise zugänglich zu machen oder sonst Dritten zur Verfügung stellen.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h3 className="text-xl font-black uppercase text-slate-900">§ 4 Vertragslaufzeit / Kündigung bei Abonnement-Verträgen</h3>
          <p className="text-sm text-slate-600 leading-relaxed">(1) Der zwischen Ihnen und uns geschlossene Abonnement-Vertrag hat die im jeweiligen Angebot ausgewiesene Laufzeit, nachfolgend "Grundlaufzeit" genannt. Eine Grundlaufzeit von mehr als 2 Jahren kann nicht vereinbart werden.</p>
          <p className="text-sm text-slate-600 leading-relaxed">(2) Wird der Abonnement-Vertrag nicht einen Monat vor Ablauf der Grundlaufzeit (soweit im jeweiligen Angebot keine kürzere Frist geregelt ist) von einer der Parteien gekündigt, verlängert er sich stillschweigend auf unbestimmte Zeit. Das verlängerte Vertragsverhältnis kann jederzeit mit einer Frist von einem Monat (soweit im jeweiligen Angebot keine kürzere Frist geregelt ist) gekündigt werden.</p>
          <p className="text-sm text-slate-600 leading-relaxed">(3) Das Recht zur fristlosen Kündigung aus wichtigem Grund bleibt hiervon unberührt.</p>
          <p className="text-sm text-slate-600 leading-relaxed">(4) Jede Kündigung muss entweder in Textform (z.B. E-Mail) oder über die auf unserer Internetpräsenz eingebundene Kündigungsschaltfläche ("Verträge hier kündigen" oder ähnliche Bezeichnung) erklärt und übermittelt werden.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h3 className="text-xl font-black uppercase text-slate-900">§ 5 Besondere Vereinbarungen zu angebotenen Zahlungsarten</h3>
          <p className="text-sm text-slate-600 leading-relaxed">(1) SEPA-Lastschrift: Bei Zahlung per SEPA-Lastschrift ermächtigen Sie uns durch Erteilung eines entsprechenden SEPA-Mandats, den Rechnungsbetrag vom angegebenen Konto einzuziehen. Der Einzug der Lastschrift erfolgt innerhalb von 5-7 Tagen nach Vertragsschluss. Die Frist für die Übermittlung der Vorabankündigung (Pre-Notification) wird auf 5 Tage vor dem Fälligkeitsdatum verkürzt. Sie sind verpflichtet für die ausreichende Deckung des Kontos zum Fälligkeitsdatum zu sorgen. Im Falle einer Rücklastschrift aufgrund Ihres Verschuldens haben Sie die anfallende Bankgebühr zu tragen.</p>
          <p className="text-sm text-slate-600 leading-relaxed">(2) Zahlung über PayPal / PayPal Checkout: Bei Auswahl einer Zahlungsart, die über PayPal angeboten wird, erfolgt die Zahlungsabwicklung über den Zahlungsdienstleister PayPal (Europe) S.à.r.l. et Cie, S.C.A. (22-24 Boulevard Royal L-2449, Luxemburg). Nähere Informationen: https://www.paypal.com/de/webapps/mpp/ua/legalhub-full.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h3 className="text-xl font-black uppercase text-slate-900">§ 6 Zurückbehaltungsrecht</h3>
          <p className="text-sm text-slate-600 leading-relaxed">Ein Zurückbehaltungsrecht können Sie nur ausüben, soweit es sich um Forderungen aus demselben Vertragsverhältnis handelt.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h3 className="text-xl font-black uppercase text-slate-900">§ 7 Gewährleistung</h3>
          <p className="text-sm text-slate-600 leading-relaxed">(1) Es bestehen die gesetzlichen Mängelhaftungsrechte.</p>
          <p className="text-sm text-slate-600 leading-relaxed">(2) Soweit ein Merkmal des digitalen Inhalts von den objektiven Anforderungen abweicht, gilt die Abweichung nur dann als vereinbart, wenn Sie vor Abgabe der Vertragserklärung durch uns über selbige in Kenntnis gesetzt wurden und die Abweichung ausdrücklich und gesondert zwischen den Vertragsparteien vereinbart wurde.</p>
          <p className="text-sm text-slate-600 leading-relaxed">(3) Soweit Sie Unternehmer sind, gilt abweichend von den vorstehenden Gewährleistungsregelungen: a) Als Beschaffenheit des digitalen Inhalts gelten nur unsere eigenen Angaben und die Produktbeschreibung des Herstellers als vereinbart; b) Bei Mängeln leisten wir nach unserer Wahl Gewähr durch Nachbesserung oder Nachlieferung. Schlägt die Mangelbeseitigung fehl, können Sie nach Ihrer Wahl Minderung verlangen oder vom Vertrag zurücktreten. c) Die Gewährleistungsfrist beträgt ein Jahr ab Ablieferung des digitalen Inhalts. Ausnahmen gelten z.B. bei Schäden aus Verletzung des Lebens, Körpers oder Gesundheit oder arglistigem Verschweigen des Mangels.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h3 className="text-xl font-black uppercase text-slate-900">§ 8 Rechtswahl</h3>
          <p className="text-sm text-slate-600 leading-relaxed">(1) Es gilt deutsches Recht. Bei Verbrauchern gilt diese Rechtswahl nur, soweit hierdurch der durch zwingende Bestimmungen des Rechts des Staates des gewöhnlichen Aufenthaltes des Verbrauchers gewährte Schutz nicht entzogen wird.</p>
          <p className="text-sm text-slate-600 leading-relaxed">(2) Die Bestimmungen des UN-Kaufrechts finden ausdrücklich keine Anwendung.</p>
        </section>

        <div>
          <h2 className="mt-2 text-2xl font-black uppercase text-slate-900">II. Kundeninformationen</h2>
        </div>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h3 className="text-xl font-black uppercase text-slate-900">1. Identität des Verkäufers</h3>
          <p className="text-sm text-slate-600 leading-relaxed">Isabell Bader<br/>Schwendener Straße 23<br/>87616 Marktoberdorf<br/>Deutschland<br/>Telefon: +4915117903181<br/>E-Mail: info@equily.de</p>
          <p className="text-sm text-slate-600 leading-relaxed">Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor Verbraucherschlichtungsstellen teilzunehmen.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h3 className="text-xl font-black uppercase text-slate-900">2. Informationen zum Zustandekommen des Vertrages</h3>
          <p className="text-sm text-slate-600 leading-relaxed">Die technischen Schritte zum Vertragsschluss, der Vertragsschluss selbst und die Korrekturmöglichkeiten erfolgen nach Maßgabe der Regelungen "Zustandekommen des Vertrages" unserer Allgemeinen Geschäftsbedingungen (Teil I.).</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h3 className="text-xl font-black uppercase text-slate-900">3. Vertragssprache, Vertragstextspeicherung</h3>
          <p className="text-sm text-slate-600 leading-relaxed">3.1. Vertragssprache ist deutsch.</p>
          <p className="text-sm text-slate-600 leading-relaxed">3.2. Der vollständige Vertragstext wird von uns nicht gespeichert. Vor Absenden der Bestellung können die Vertragsdaten über die Druckfunktion des Browsers ausgedruckt oder elektronisch gesichert werden. Nach Zugang der Bestellung bei uns werden die Bestelldaten, die gesetzlich vorgeschriebenen Informationen bei Fernabsatzverträgen und die Allgemeinen Geschäftsbedingungen nochmals per E-Mail an Sie übersandt.</p>
          <p className="text-sm text-slate-600 leading-relaxed">3.3. Bei Angebotsanfragen außerhalb des Online-Warenkorbsystems erhalten Sie alle Vertragsdaten im Rahmen eines verbindlichen Angebotes in Textform übersandt, z.B. per E-Mail.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h3 className="text-xl font-black uppercase text-slate-900">4. Wesentliche Merkmale der Ware oder Dienstleistung</h3>
          <p className="text-sm text-slate-600 leading-relaxed">Die wesentlichen Merkmale der Ware und/oder Dienstleistung finden sich im jeweiligen Angebot.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h3 className="text-xl font-black uppercase text-slate-900">5. Preise und Zahlungsmodalitäten</h3>
          <p className="text-sm text-slate-600 leading-relaxed">5.1. Die in den jeweiligen Angeboten angeführten Preise sowie die Versandkosten stellen Gesamtpreise dar. Sie beinhalten alle Preisbestandteile einschließlich aller anfallenden Steuern.</p>
          <p className="text-sm text-slate-600 leading-relaxed">5.2. Es fallen keine Versandkosten an.</p>
          <p className="text-sm text-slate-600 leading-relaxed">5.3. Die Ihnen zur Verfügung stehenden Zahlungsarten sind unter einer entsprechend bezeichneten Schaltfläche auf unserer Internetpräsenz oder im jeweiligen Angebot ausgewiesen.</p>
          <p className="text-sm text-slate-600 leading-relaxed">5.4. Soweit bei den einzelnen Zahlungsarten nicht anders angegeben, sind die Zahlungsansprüche aus dem geschlossenen Vertrag sofort zur Zahlung fällig.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h3 className="text-xl font-black uppercase text-slate-900">6. Bereitstellung</h3>
          <p className="text-sm text-slate-600 leading-relaxed">6.1. Die Bedingungen für die Bereitstellung, den Bereitstellungstermin sowie gegebenenfalls bestehenden Bereitstellungsbeschränkungen finden sich unter einer entsprechend bezeichneten Schaltfläche auf unserer Internetpräsenz oder im jeweiligen Angebot.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h3 className="text-xl font-black uppercase text-slate-900">7. Gesetzliches Mängelhaftungsrecht</h3>
          <p className="text-sm text-slate-600 leading-relaxed">Die Mängelhaftung richtet sich nach der Regelung "Gewährleistung" in unseren Allgemeinen Geschäftsbedingungen (Teil I).</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h3 className="text-xl font-black uppercase text-slate-900">8. Vertragslaufzeit / Kündigung</h3>
          <p className="text-sm text-slate-600 leading-relaxed">Informationen zur Laufzeit des Vertrages sowie den Kündigungsbedingungen finden Sie in der Regelung "Vertragslaufzeit / Kündigung bei Abonnement-Verträgen" in unseren Allgemeinen Geschäftsbedingungen (Teil I) sowie im jeweiligen Angebot.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">Diese AGB und Kundeninformationen wurden von den auf IT‑Recht spezialisierten Juristen des Händlerbundes erstellt und werden permanent auf Rechtskonformität geprüft. Die Händlerbund Management AG garantiert für die Rechtssicherheit der Texte und haftet im Falle von Abmahnungen. Nähere Informationen dazu finden Sie unter: https://www.haendlerbund.de/de/leistungen/rechtssicherheit/agb-service.</p>
        </section>
      </main>
    </div>
  );
}

