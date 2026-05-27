import Link from 'next/link';

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Equily</p>
            <h1 className="mt-2 text-4xl font-black italic uppercase tracking-tight text-slate-900">Datenschutzerklärung</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/agb" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">AGB</Link>
            <Link href="/cookies" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">Cookies</Link>
            <Link href="/" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">Zur Startseite</Link>
          </div>
        </div>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Allgemeine Hinweise</h2>
          <p className="text-sm text-slate-600 leading-relaxed">Soweit nachstehend keine anderen Angaben gemacht werden, ist die Bereitstellung Ihrer personenbezogenen Daten weder gesetzlich oder vertraglich vorgeschrieben, noch für einen Vertragsabschluss erforderlich. Sie sind zur Bereitstellung der Daten nicht verpflichtet. Eine Nichtbereitstellung hat keine Folgen. Dies gilt nur soweit bei den nachfolgenden Verarbeitungsvorgängen keine anderweitige Angabe gemacht wird.</p>
          <p className="text-sm text-slate-600 leading-relaxed">"Personenbezogene Daten" sind alle Informationen, die sich auf eine identifizierte oder identifizierbare natürliche Person beziehen.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Server-Logfiles</h2>
          <p className="text-sm text-slate-600 leading-relaxed">Sie können unsere Webseiten besuchen, ohne Angaben zu Ihrer Person zu machen. Bei jedem Zugriff auf unsere Website werden an uns oder unseren Webhoster / IT-Dienstleister Nutzungsdaten durch Ihren Internet Browser übermittelt und in Protokolldaten (sog. Server-Logfiles) gespeichert. Zu diesen gespeicherten Daten gehören z.B. der Name der aufgerufenen Seite, Datum und Uhrzeit des Abrufs, die IP-Adresse, die übertragene Datenmenge und der anfragende Provider.</p>
          <p className="text-sm text-slate-600 leading-relaxed">Die Verarbeitung erfolgt auf Grundlage des Art. 6 Abs. 1 lit. f DSGVO aus unserem überwiegenden berechtigten Interesse an der Gewährleistung eines störungsfreien Betriebs unserer Website sowie zur Verbesserung unseres Angebotes.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Kontakt</h2>
          <h3 className="text-lg font-black uppercase text-slate-900">Verantwortlicher</h3>
          <p className="text-sm text-slate-600 leading-relaxed">Verantwortlicher für die Datenverarbeitung ist: Isabell Bader, Innerkoflerstraße 40, 81377 München, Deutschland, Telefon: 015117903181, E-Mail: info@equily.de</p>

          <h3 className="text-lg font-black uppercase text-slate-900">Initiativ-Kontaktaufnahme per E‑Mail</h3>
          <p className="text-sm text-slate-600 leading-relaxed">Wenn Sie per E‑Mail initiativ mit uns in Geschäftskontakt treten, erheben wir Ihre personenbezogenen Daten (Name, E‑Mail‑Adresse, Nachrichtentext) nur in dem von Ihnen zur Verfügung gestellten Umfang. Die Datenverarbeitung dient der Bearbeitung und Beantwortung Ihrer Kontaktanfrage.</p>
          <p className="text-sm text-slate-600 leading-relaxed">Wenn die Kontaktaufnahme der Durchführung vorvertraglicher Maßnahmen dient oder einen bereits zwischen Ihnen und uns geschlossenen Vertrag betrifft, erfolgt die Datenverarbeitung auf Grundlage des Art. 6 Abs. 1 lit. b DSGVO. Erfolgt die Kontaktaufnahme aus anderen Gründen, erfolgt die Datenverarbeitung auf Grundlage des Art. 6 Abs. 1 lit. f DSGVO aus unserem überwiegenden berechtigten Interesse an der Bearbeitung Ihrer Anfrage. In diesem Fall haben Sie das Recht, jederzeit dieser Verarbeitung zu widersprechen.</p>
          <p className="text-sm text-slate-600 leading-relaxed">Ihre E‑Mail‑Adresse nutzen wir nur zur Bearbeitung Ihrer Anfrage. Ihre Daten werden anschließend unter Beachtung gesetzlicher Aufbewahrungsfristen gelöscht, sofern Sie der weitergehenden Verarbeitung nicht zugestimmt haben.</p>

          <h3 className="text-lg font-black uppercase text-slate-900">Kontaktformular</h3>
          <p className="text-sm text-slate-600 leading-relaxed">Bei der Nutzung des Kontaktformulars erheben wir Ihre personenbezogenen Daten (Name, E‑Mail‑Adresse, Nachrichtentext) nur in dem von Ihnen zur Verfügung gestellten Umfang. Die Datenverarbeitung dient dem Zweck der Kontaktaufnahme. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO für vorvertragliche Maßnahmen bzw. Art. 6 Abs. 1 lit. f DSGVO für sonstige Anfragen; Sie können in letzteren Fällen jederzeit widersprechen.</p>

          <h3 className="text-lg font-black uppercase text-slate-900">Widerrufsbutton</h3>
          <p className="text-sm text-slate-600 leading-relaxed">Wenn Sie einen Vertrag über unsere Onlinepräsenz abgeschlossen haben, stellen wir Ihnen eine Widerrufsfunktion (Widerrufsbutton) zur Verfügung. Bei Nutzung erfassen wir Name, E‑Mail, Angaben zur Identifizierung des Vertrages sowie Datum und Uhrzeit der Absendung. Die Verarbeitung dient der ordnungsgemäßen Bearbeitung des Widerrufs; Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (bei Vertragsbezug) bzw. Art. 6 Abs. 1 lit. c DSGVO und alternativ Art. 6 Abs. 1 lit. f DSGVO.</p>

          <h3 className="text-lg font-black uppercase text-slate-900">Kündigungsbutton</h3>
          <p className="text-sm text-slate-600 leading-relaxed">Bei Kündigung über die gesetzliche Kündigungsschaltfläche verarbeiten wir die eingegebenen Daten (Name, E‑Mail, ggf. Telefonnummer, Angaben zur Vertragsidentifikation sowie Datum/Uhrzeit). Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (bei Vertragsbezug) bzw. Art. 6 Abs. 1 lit. c DSGVO.</p>

          <h3 className="text-lg font-black uppercase text-slate-900">Upload von Bildern</h3>
          <p className="text-sm text-slate-600 leading-relaxed">Wir bieten eine Upload‑Funktion für Bilddateien. Mit Übermittlung Ihrer Bilder erheben wir ggf. personenbezogene Daten (z. B. Abbildungen identifizierbarer Personen) nur in dem von Ihnen bereitgestellten Umfang. The processing serves the creation of personalized products and is based on Art. 6 Abs. 1 lit. b DSGVO. A transfer to service providers may occur as part of contract processing.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Kundenkonto und Bestellungen</h2>
          <h3 className="text-lg font-black uppercase text-slate-900">Kundenkonto</h3>
          <p className="text-sm text-slate-600 leading-relaxed">Bei der Eröffnung eines Kundenkontos erheben wir personenbezogene Daten in dem dort angegebenen Umfang. Die Verarbeitung erfolgt auf Grundlage des Art. 6 Abs. 1 lit. a DSGVO mit Ihrer Einwilligung. Sie können Ihre Einwilligung jederzeit widerrufen; das Konto wird dann gelöscht.</p>

          <h3 className="text-lg font-black uppercase text-slate-900">Bestellungen</h3>
          <p className="text-sm text-slate-600 leading-relaxed">Bei Bestellungen erheben und verarbeiten wir personenbezogene Daten nur, soweit dies zur Erfüllung und Abwicklung Ihrer Bestellung sowie zur Bearbeitung Ihrer Anfragen erforderlich ist. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Eine Nichtbereitstellung der Daten führt dazu, dass kein Vertrag geschlossen werden kann.</p>
          <p className="text-sm text-slate-600 leading-relaxed">Eine Weitergabe Ihrer Daten erfolgt z.B. an Versandunternehmen, Zahlungsdienstleister, Fulfillment‑Anbieter und IT‑Dienstleister; stets beschränkt auf ein Mindestmaß und unter Beachtung gesetzlicher Vorgaben.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Werbung und Bewertungen</h2>
          <h3 className="text-lg font-black uppercase text-slate-900">Newsletter</h3>
          <p className="text-sm text-slate-600 leading-relaxed">Wir nutzen Ihre E‑Mail‑Adresse zur Zusendung von Newslettern nur mit Ihrer ausdrücklichen Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Ein Widerruf ist jederzeit möglich; nach Abbestellung speichern wir Ihre Adresse ggf. in einer Blacklist auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO, um erneute Zusendungen zu verhindern.</p>

          <h3 className="text-lg font-black uppercase text-slate-900">Brevo (Sendinblue)</h3>
          <p className="text-sm text-slate-600 leading-relaxed">Wir verwenden Brevo (Sendinblue) für Newsletterversand; Daten (E‑Mail, ggf. Name) werden im Rahmen einer Auftragsverarbeitung an Brevo übermittelt. Tracking‑Pixel und Tracking‑Links können eingesetzt werden. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Details: https://www.brevo.com/de/legal/privacypolicy/</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Zahlungsdienstleister</h2>
          <p className="text-sm text-slate-600 leading-relaxed">PayPal Checkout: Wir verwenden PayPal (Europe) S.à.r.l. et Cie, S.C.A. zur Zahlungsabwicklung. Die zur Zahlungsabwicklung erforderlichen Daten werden an PayPal übermittelt; Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Weitere Zahlungsarten (Apple Pay, Google Pay) werden ggf. ebenfalls unterstützt.</p>
          <p className="text-sm text-slate-600 leading-relaxed">Bei bestimmten PayPal‑Zahlungsarten kann PayPal eine Bonitätsprüfung durchführen; dies erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO als berechtigtes Interesse zur Vermeidung von Zahlungsausfällen.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Cookies</h2>
          <p className="text-sm text-slate-600 leading-relaxed">Unsere Website verwendet Cookies. Cookies sind kleine Textdateien, die im Browser gespeichert werden und die Wiedererkennung des Browsers ermöglichen. Sie haben die Kontrolle über Cookies über Ihre Browsereinstellungen. Technisch notwendige Cookies verwenden wir auf Grundlage des § 25 Abs. 2 TDDDG und Art. 6 Abs. 1 lit. f DSGVO.</p>
          <p className="text-sm text-slate-600 leading-relaxed">Cookiebot wird als Consent‑Tool genutzt. Details: https://www.cookiebot.com/de/privacy-policy/</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Analyse</h2>
          <p className="text-sm text-slate-600 leading-relaxed">Google Analytics 4 wird verwendet. Die Verarbeitung erfolgt mit Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Erweiterter Einwilligungsmodus (Advanced Consent Mode) kann Pings an Google senden; Datenübermittlung in die USA erfolgt ggf. unter TADPF.</p>
          <p className="text-sm text-slate-600 leading-relaxed">Details: https://policies.google.com/technologies/partner-sites</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Plug‑ins und Sonstiges</h2>
          <p className="text-sm text-slate-600 leading-relaxed">OpenStreetMap wird für Karten verwendet; ggf. Übermittlung von IP und Browserdaten an OpenStreetMap. Rechtsgrundlage ist Art. 6 Abs. 1 lit. a DSGVO bei Einwilligung.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Speicherdauer & Betroffenenrechte</h2>
          <p className="text-sm text-slate-600 leading-relaxed">Nach vollständiger Vertragsabwicklung werden Daten zunächst für die Dauer der Gewährleistungsfrist und danach unter Berücksichtigung gesetzlicher Aufbewahrungsfristen gespeichert und anschließend gelöscht, sofern keine Einwilligung vorliegt.</p>
          <p className="text-sm text-slate-600 leading-relaxed">Sie haben Rechte nach Art. 15–20 DSGVO (Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit) sowie Widerspruchsrecht nach Art. 21 DSGVO. Beschwerderecht besteht bei der Aufsichtsbehörde (BayLDA, Promenade 18, 91522 Ansbach, poststelle@lda.bayern.de).</p>
          <p className="text-sm text-slate-600 leading-relaxed">Widerspruchsrecht: Bei Verarbeitungen auf Grundlage berechtigten Interesses (Art. 6 Abs. 1 lit. f DSGVO) können Sie jederzeit widersprechen; wir stellen die Verarbeitung ein, sofern keine vorrangigen Gründe vorliegen.</p>
        </section>
      </main>
    </div>
  );
}
