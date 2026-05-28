"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { registerUser, saveExpertProfileData, uploadProfileHorseImage, uploadCertificates, uploadIdentityVerification, uploadProfileImage } from '../../actions';
import MediaDropzone from '../../components/media-dropzone';
import { 
  Camera, ChevronDown, ChevronUp, ShieldCheck, 
  MapPin, User, Mail, Lock, FileText, Check 
} from 'lucide-react';

import { ZERTIFIKAT_KATEGORIEN, ANGEBOT_KATEGORIEN, } from '../../suche/kategorien-daten';

const FREE_EXPERT_HORSE_LIMIT = 2;

export default function RegistrierungExperte() {
  const [formData, setFormData] = useState({
    // Sektion 1: Gewerbe
    gewerbeName: '', website: '', ustId: '',
    gewerbeStrasse: '', gewerbeHausnummer: '', gewerbePlz: '', gewerbeOrt: '',
    freitextBeschreibung: '',
    // Sektion 2+3: Auswahl
    angebote: [] as string[],
    zertifikate: [] as string[],
    freitextZertifikate: '',
    // Sektion 4: Privat & Account
    vorname: '', nachname: '', birthDate: '', privatStrasse: '', privatHausnummer: '', privatPlz: '', privatOrt: '',
    pferdName: '', pferdRasse: '', pferdAlter: '',
    email: '', password: '', confirmPassword: '',
    newsletterExperte: false,
    datenschutz: false
  });

  const [certificates, setCertificates] = useState<FileList | null>(null);
  const [idProof, setIdProof] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [openSection, setOpenSection] = useState<string | null>("FN-Abzeichen");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [zertifikatFreitext, setZertifikatFreitext] = useState<Record<string, string>>({});
  const beschreibungRef = useRef<HTMLTextAreaElement | null>(null);
  const [pferde, setPferde] = useState<Array<{ name: string; rasse: string; alter: string; beschreibung: string; bilder: File[] }>>([
    { name: '', rasse: '', alter: '', beschreibung: '', bilder: [] }
  ]);

  useEffect(() => {
    const textarea = beschreibungRef.current;
    if (!textarea) return;

    textarea.style.height = '0px';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [formData.freitextBeschreibung]);

  const setFormValue = (key: keyof typeof formData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.gewerbeName.trim()) errors.gewerbeName = 'Pflichtfeld';
    if (!formData.gewerbeStrasse.trim()) errors.gewerbeStrasse = 'Pflichtfeld';
    if (!formData.gewerbeHausnummer.trim()) errors.gewerbeHausnummer = 'Pflichtfeld';
    if (!formData.gewerbePlz.trim()) errors.gewerbePlz = 'Pflichtfeld';
    if (!formData.gewerbeOrt.trim()) errors.gewerbeOrt = 'Pflichtfeld';
    if (!formData.ustId.trim()) errors.ustId = 'Pflichtfeld';

    if (!formData.vorname.trim()) errors.vorname = 'Pflichtfeld';
    if (!formData.nachname.trim()) errors.nachname = 'Pflichtfeld';
    if (formData.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(formData.birthDate)) errors.birthDate = 'Bitte ein gültiges Datum wählen';
    if (!formData.privatStrasse.trim()) errors.privatStrasse = 'Pflichtfeld';
    if (!formData.privatHausnummer.trim()) errors.privatHausnummer = 'Pflichtfeld';
    if (!formData.privatPlz.trim()) errors.privatPlz = 'Pflichtfeld';
    if (!formData.privatOrt.trim()) errors.privatOrt = 'Pflichtfeld';

    if (!formData.email.trim()) {
      errors.email = 'Pflichtfeld';
    } else if (!formData.email.includes('@')) {
      errors.email = 'Bitte gültige E-Mail eingeben';
    }

    if (!formData.password) {
      errors.password = 'Pflichtfeld';
    } else if (formData.password.length < 8) {
      errors.password = 'Mindestens 8 Zeichen';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Pflichtfeld';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwörter stimmen nicht überein';
    }

    if (!formData.datenschutz) {
      errors.datenschutz = 'Bitte AGB und Datenschutz akzeptieren';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const toggleItem = (list: 'angebote' | 'zertifikate', item: string) => {
    setFormData(prev => ({
      ...prev,
      [list]: prev[list].includes(item) ? prev[list].filter(i => i !== item) : [...prev[list], item]
    }));
  };

  const hasFreitextSelection = (key: string) => {
    return formData.zertifikate.includes(key) || formData.zertifikate.some((entry) => entry.startsWith(`${key}: `));
  };

  const toggleSonstiges = (key: string) => {
    setFormData((prev) => {
      const selected = prev.zertifikate.includes(key);
      const cleaned = prev.zertifikate.filter((entry) => entry !== key && !entry.startsWith(`${key}: `));

      if (selected) {
        return { ...prev, zertifikate: cleaned };
      }

      return { ...prev, zertifikate: [...cleaned, key] };
    });

    setZertifikatFreitext((prev) => {
      if (!hasFreitextSelection(key)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSonstigesTextChange = (key: string, value: string) => {
    setZertifikatFreitext((prev) => ({ ...prev, [key]: value }));

    setFormData((prev) => {
      const cleaned = prev.zertifikate.filter((entry) => !entry.startsWith(`${key}: `));
      const trimmed = value.trim();

      if (!prev.zertifikate.includes(key)) {
        return { ...prev, zertifikate: cleaned };
      }

      if (!trimmed) {
        return { ...prev, zertifikate: cleaned };
      }

      return { ...prev, zertifikate: [...cleaned, `${key}: ${trimmed}`] };
    });
  };

  const updatePferd = (index: number, field: 'name' | 'rasse' | 'alter' | 'beschreibung', value: string) => {
    setPferde((prev) => prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)));
  };

  const handlePferdBilderChange = (index: number, files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files).filter((file) => file.type.startsWith('image/')).slice(0, 8);
    setPferde((prev) => prev.map((item, idx) => (idx === index ? { ...item, bilder: list } : item)));
  };

  const addPferd = () => {
    if (pferde.length >= FREE_EXPERT_HORSE_LIMIT) {
      alert('Ohne Abo sind maximal 2 Schulpferde möglich. Mehr kannst du nach einem Upgrade hinterlegen.');
      return;
    }
    setPferde((prev) => [...prev, { name: '', rasse: '', alter: '', beschreibung: '', bilder: [] }]);
  };

  const removePferd = (index: number) => {
    setPferde((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleProfilEinreichen = async () => {
    if (!validateForm()) {
      return;
    }

    setUploading(true);
    try {
      // Step 1: Register the user during expert registration
      const registerRes = await registerUser({
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        name: formData.gewerbeName,
        vorname: formData.vorname,
        role: 'experte'
      });

      if (!registerRes.success) {
        alert(registerRes.error || 'Registrierung fehlgeschlagen.');
        setUploading(false);
        return;
      }

      const userId = registerRes.userId;
      if (!userId || Number.isNaN(userId)) {
        alert('Benutzer konnte nicht erstellt werden.');
        setUploading(false);
        return;
      }

      // Upload optional profile image during registration
      if (profileImage) {
        try {
          const imgForm = new FormData();
          imgForm.append('file', profileImage);
          const imgRes = await uploadProfileImage(userId, imgForm);
          if (!imgRes.success) console.warn('Profilbild Upload fehlgeschlagen:', imgRes.error);
        } catch (err) {
          console.error('Profilbild Upload Exception:', err);
        }
      }

      const payload = {
        name: formData.gewerbeName,
        website: formData.website,
        ustId: formData.ustId,
        gewerbeAdresse: `${formData.gewerbeStrasse} ${formData.gewerbeHausnummer}, ${formData.gewerbePlz} ${formData.gewerbeOrt}`.trim(),
        ort: formData.gewerbeOrt,
        plz: formData.gewerbePlz,
        angebote: formData.angebote,
        zertifikate: formData.zertifikate,
        angebotText: formData.angebote.join(', '),
        freitextBeschreibung: formData.freitextBeschreibung,
        vorname: formData.vorname,
        nachname: formData.nachname,
        birthDate: formData.birthDate,
        pferdName: formData.pferdName,
        pferdRasse: formData.pferdRasse,
        pferdAlter: formData.pferdAlter,
        privatAdresse: `${formData.privatStrasse} ${formData.privatHausnummer}, ${formData.privatPlz} ${formData.privatOrt}`.trim(),
        email: formData.email,
        newsletterExperte: formData.newsletterExperte,
        updatedAt: new Date().toISOString()
      };

      // Certificates and ID uploads: required during expert registration
      if (!certificates || certificates.length === 0) {
        alert('Bitte mindestens ein Zertifikat hochladen.');
        setUploading(false);
        return;
      }

      if (!idProof || idProof.length === 0) {
        alert('Bitte ein Ausweisdokument hochladen.');
        setUploading(false);
        return;
      }

      // Upload certificates (admin-only storage)
      const uploadedCertificateUrls: string[] = [];
      for (const file of Array.from(certificates)) {
        try {
          const uploadData = new FormData();
          uploadData.append('file', file);
          const uploadRes = await uploadCertificates(userId, uploadData);
          if (uploadRes.success && uploadRes.url) {
            uploadedCertificateUrls.push(uploadRes.url);
          } else {
            console.warn(`⚠ Zertifikat Upload fehlgeschlagen: ${uploadRes.error}`);
          }
        } catch (err) {
          console.error('Fehler beim Zertifikat-Upload:', err);
        }
      }

      // Upload ID proof (admin-only storage)
      const uploadedIdUrls: string[] = [];
      for (const file of Array.from(idProof)) {
        try {
          const uploadData = new FormData();
          uploadData.append('file', file);
          const uploadRes = await uploadIdentityVerification(userId, uploadData);
          if (uploadRes.success && uploadRes.url) {
            uploadedIdUrls.push(uploadRes.url);
          } else {
            console.warn(`⚠ Ausweisverifikation Upload fehlgeschlagen: ${uploadRes.error}`);
          }
        } catch (err) {
          console.error('Fehler beim Ausweisverifikation-Upload:', err);
        }
      }

      const gespeichertePferde = await Promise.all(
        pferde.map(async (pferd) => {
          const bildUrls: string[] = [];

          for (const file of pferd.bilder) {
            try {
              const uploadData = new FormData();
              uploadData.append('file', file);
              const uploadRes = await uploadProfileHorseImage(userId, 'experte', uploadData);
              if (uploadRes.success && uploadRes.url) {
                bildUrls.push(uploadRes.url);
              } else {
                console.warn(`⚠ Pferdbild Upload fehlgeschlagen: ${uploadRes.error}`);
              }
            } catch (err) {
              console.error('Fehler beim Pferdbild-Upload:', err);
            }
          }

          return {
            name: pferd.name.trim(),
            rasse: pferd.rasse.trim(),
            alter: pferd.alter.trim(),
            beschreibung: pferd.beschreibung.trim(),
            bilder: bildUrls
          };
        })
      );

      const validePferde = gespeichertePferde.filter((pferd) =>
        pferd.name || pferd.rasse || pferd.alter || pferd.beschreibung || pferd.bilder.length > 0
      );

      const erstesPferd = validePferde[0] || { name: formData.pferdName, rasse: formData.pferdRasse, alter: formData.pferdAlter, beschreibung: '', bilder: [] as string[] };

      const res = await saveExpertProfileData(userId, {
        ...payload,
        pferdName: erstesPferd.name,
        // Persist uploaded document URLs so admin can review them
        uploadedCertificates: uploadedCertificateUrls,
        uploadedIdDocs: uploadedIdUrls,
        profil_data: {
          uploadedCertificates: uploadedCertificateUrls,
          uploadedIdDocs: uploadedIdUrls
        },

        pferdRasse: erstesPferd.rasse,
        pferdAlter: erstesPferd.alter,
        pferdBeschreibung: erstesPferd.beschreibung,
        pferdBilder: erstesPferd.bilder,
        pferde: validePferde
      });
      if (!res.success) {
        alert(res.error || 'Speichern fehlgeschlagen.');
        setUploading(false);
        return;
      }

      sessionStorage.setItem('userId', String(userId));
      sessionStorage.setItem('userRole', 'experte');
      sessionStorage.setItem('userEmail', formData.email);
      sessionStorage.setItem('userName', `${formData.vorname} ${formData.nachname}`.trim() || formData.gewerbeName || 'Experte');
      sessionStorage.setItem('equiconnect-founding-info-pending', '1');
      alert('Konto erstellt. Du bist jetzt eingeloggt und kannst dein Profil direkt nutzen.');
      window.location.href = '/abo?onboarding=1&role=experte';
    } catch (err) {
      console.error('Profil-Einreichungsfehler:', err);
      alert('Ein Fehler bei der Profileinreichung ist aufgetreten.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16 font-sans text-slate-900">
      {/* Header */}
      <nav className="p-4 bg-white border-b sticky top-0 z-50 flex justify-between items-center shadow-sm">
        <span className="font-black text-emerald-600 text-xl italic uppercase tracking-tighter">EQUIPRO</span>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Pro-Account Erstellung</span>
      </nav>

      <main className="max-w-[58rem] mx-auto px-5 mt-8 space-y-6">
        
        {/* BLOCK 1: GEWERBEDATEN */}
        <section className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-100">
          <h2 className="text-lg font-black uppercase italic mb-6 text-emerald-600">1. Gewerbedaten (Impressum)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 grid grid-cols-1 gap-3">
              <input
                id="gewerbeName"
                name="gewerbeName"
                placeholder="Gewerbename / Stallname"
                value={formData.gewerbeName}
                onChange={(e) => setFormValue('gewerbeName', e.target.value)}
                required
                className="w-full p-3 text-sm bg-slate-50 rounded-xl font-bold border-2 border-transparent focus:border-emerald-200 outline-none"
              />
              {fieldErrors.gewerbeName && <p className="-mt-2 text-[10px] font-bold text-red-500">{fieldErrors.gewerbeName}</p>}
              <div className="grid grid-cols-3 gap-2">
                <input
                  id="gewerbeStrasse"
                  name="gewerbeStrasse"
                  placeholder="Straße"
                  value={formData.gewerbeStrasse}
                  onChange={(e) => setFormValue('gewerbeStrasse', e.target.value)}
                  required
                  className="col-span-2 w-full p-3 text-sm bg-slate-50 rounded-xl font-bold"
                />
                <input
                  id="gewerbeHausnummer"
                  name="gewerbeHausnummer"
                  placeholder="Nr."
                  value={formData.gewerbeHausnummer}
                  onChange={(e) => setFormValue('gewerbeHausnummer', e.target.value)}
                  required
                  className="w-full p-3 text-sm bg-slate-50 rounded-xl font-bold"
                />
              </div>
              {(fieldErrors.gewerbeStrasse || fieldErrors.gewerbeHausnummer) && (
                <p className="-mt-2 text-[10px] font-bold text-red-500">{fieldErrors.gewerbeStrasse || fieldErrors.gewerbeHausnummer}</p>
              )}
              <div className="grid grid-cols-3 gap-2">
                <input
                  id="gewerbePlz"
                  name="gewerbePlz"
                  placeholder="PLZ"
                  value={formData.gewerbePlz}
                  onChange={(e) => setFormValue('gewerbePlz', e.target.value)}
                  required
                  className="w-full p-3 text-sm bg-slate-50 rounded-xl font-bold"
                />
                <input
                  id="gewerbeOrt"
                  name="gewerbeOrt"
                  placeholder="Ort"
                  value={formData.gewerbeOrt}
                  onChange={(e) => setFormValue('gewerbeOrt', e.target.value)}
                  required
                  className="col-span-2 w-full p-3 text-sm bg-slate-50 rounded-xl font-bold"
                />
              </div>
              {(fieldErrors.gewerbePlz || fieldErrors.gewerbeOrt) && (
                <p className="-mt-2 text-[10px] font-bold text-red-500">{fieldErrors.gewerbePlz || fieldErrors.gewerbeOrt}</p>
              )}
              <input
                id="website"
                name="website"
                placeholder="Webseite"
                value={formData.website}
                onChange={(e) => setFormValue('website', e.target.value)}
                className="w-full p-3 text-sm bg-slate-50 rounded-xl font-bold border-2 border-transparent focus:border-emerald-200 outline-none"
              />
              <input
                id="ustId"
                name="ustId"
                placeholder="USt-ID / Steuernummer (Für Impressum)"
                value={formData.ustId}
                onChange={(e) => setFormValue('ustId', e.target.value)}
                required
                className="w-full p-3 text-sm bg-slate-50 rounded-xl font-bold border-2 border-transparent focus:border-emerald-200 outline-none"
              />
              {fieldErrors.ustId && <p className="-mt-2 text-[10px] font-bold text-red-500">{fieldErrors.ustId}</p>}
              {/* BESCHREIBUNG */}
              <div className="mt-6 pt-6 border-t border-slate-50 rounded-[1.5rem] bg-gradient-to-br from-slate-50 to-emerald-50/40 p-5">
                <label className="block text-[10px] font-black uppercase text-emerald-700 tracking-[0.2em] mb-3 ml-1">
                  Beschreibung
                </label>
                <textarea 
                  id="freitextBeschreibung"
                  name="freitextBeschreibung"
                  ref={beschreibungRef}
                  rows={1}
                  placeholder="Beschreibe hier kurz deine Arbeitsweise, deinen Stall oder dein spezielles Angebot..." 
                  value={formData.freitextBeschreibung}
                  className="w-full p-4 text-sm bg-white rounded-[1.5rem] font-medium border-2 border-emerald-100 shadow-sm focus:border-emerald-300 outline-none transition-all resize-none overflow-hidden min-h-[220px]"
                  onChange={(e) => {
                    setFormValue('freitextBeschreibung', e.target.value);
                    const textarea = beschreibungRef.current;
                    if (!textarea) return;
                    textarea.style.height = '0px';
                    textarea.style.height = `${textarea.scrollHeight}px`;
                  }}
                />
                <div className="flex justify-end mt-2 mr-4">
                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Wird auf deinem Profil öffentlich angezeigt</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BLOCK 2: KATEGORIEN */}
        <section className="bg-white rounded-[2.25rem] p-7 shadow-sm border border-slate-100 space-y-7">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-600 text-white w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black italic shadow-lg">02</div>
            <div>
              <h2 className="text-lg font-black uppercase italic text-emerald-600">Kategorien</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Wähle deine allgemeinen Angebotsbereiche</p>
            </div>
          </div>

          {/* Haupt-Kategorien */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            {ANGEBOT_KATEGORIEN.map((kat) => (
              <button
                key={kat.label}
                type="button"
                onClick={() => {
                  const exists = formData.angebote.includes(kat.label);
                  setFormData(prev => ({
                    ...prev,
                    angebote: exists ? prev.angebote.filter(a => a !== kat.label) : [...prev.angebote, kat.label]
                  }));
                }}
                aria-pressed={formData.angebote.includes(kat.label)}
                className={`p-4 rounded-[1.5rem] border-2 transition-all flex flex-col items-start gap-3 text-left shadow-sm ${
                  formData.angebote.includes(kat.label)
                    ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100'
                    : 'border-slate-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/40'
                }`}
              >
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${formData.angebote.includes(kat.label) ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {formData.angebote.includes(kat.label) ? 'Ausgewählt' : 'Wählen'}
                </span>
                <span className="text-[11px] font-black uppercase leading-tight text-slate-900">{kat.label}</span>
                <span className="text-[10px] font-bold text-slate-400 leading-snug">
                  {kat.themen.slice(0, 3).map((item) => (typeof item === 'string' ? item : item.name)).join(' · ')}
                </span>
              </button>
            ))}
          </div>

          <div className="rounded-[1.5rem] border border-dashed border-emerald-200 bg-emerald-50/70 p-4">
            <div className="flex items-center justify-between gap-4 mb-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Ausgewählte Kategorien</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{formData.angebote.length} gewählt</p>
            </div>
            {formData.angebote.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {formData.angebote.map((angebot) => (
                  <span key={angebot} className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white">
                    {angebot}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[10px] font-medium text-slate-500">Wähle mindestens eine Kategorie, damit dein Profil klar eingeordnet werden kann.</p>
            )}
          </div>

          {/* Themen-Verfeinerung */}
          <div className="space-y-6">
            {ANGEBOT_KATEGORIEN.filter(k => formData.angebote.includes(k.label)).map((kat) => (
              <div key={kat.label} className="bg-slate-50 rounded-[1.75rem] p-6 border border-slate-100">
                <h3 className="text-[11px] font-black uppercase italic text-slate-800 mb-4 flex items-center gap-2">
                  <Check size={16} className="text-emerald-500" /> {kat.label} verfeinern
                </h3>
                <div className="flex flex-wrap gap-3">
                  {kat.themen.map((thema: any, idx: number) => {
                    const isObj = typeof thema !== 'string';
                    const name = isObj ? thema.name : thema;
                    const isSelected = formData.zertifikate.includes(name);

                    return (
                      <div key={idx} className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => toggleItem('zertifikate', name)}
                          className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${
                            isSelected ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-100'
                          }`}
                        >
                          {name}
                        </button>

                        {/* Unter-Optionen (Subs) */}
                        {isObj && thema.subs && isSelected && (
                          <div className="flex items-center gap-2 mt-1 ml-2">
                            <div className="flex gap-1.5">
                              {thema.subs.map((sub: string) => (
                                <button
                                  key={sub}
                                  type="button"
                                  onClick={() => toggleItem('zertifikate', `${name}: ${sub}`)}
                                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${
                                    formData.zertifikate.includes(`${name}: ${sub}`) ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 border border-slate-200'
                                  }`}
                                >
                                  {sub}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* BLOCK 3 QUALIFIKATIONEN (AUFKLAPPBAR) */}
        <section className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-100">
          <h2 className="text-lg font-black uppercase italic mb-2 text-emerald-600">3 Qualifikationen & Zertifikate</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Wähle alles aus, was du belegen kannst</p>

          <div className="space-y-4">
            {Object.entries(ZERTIFIKAT_KATEGORIEN).map(([catName, content]) => (
              <div key={catName} className="border border-slate-100 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenSection(openSection === catName ? null : catName)}
                  className={`w-full p-4 flex justify-between items-center transition-all ${openSection === catName ? 'bg-slate-900 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}
                >
                  <span className="font-black uppercase italic text-[13px] tracking-tight">{catName}</span>
                  {openSection === catName ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                {openSection === catName && (
                  <div className="p-5 bg-white animate-in slide-in-from-top-2 duration-200">
                    {Array.isArray(content) && (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {content.map((item) => {
                            const isSonstiges = item === 'Sonstiges';
                            const sonstigesKey = `${catName}: Sonstiges`;
                            const selected = isSonstiges ? hasFreitextSelection(sonstigesKey) : formData.zertifikate.includes(item);

                            return (
                              <button
                                type="button"
                                key={`${catName}-${item}`}
                                onClick={() => (isSonstiges ? toggleSonstiges(sonstigesKey) : toggleItem('zertifikate', item))}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all border-2 ${selected ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-200'}`}
                              >
                                {item}
                              </button>
                            );
                          })}
                        </div>

                        {hasFreitextSelection(`${catName}: Sonstiges`) && (
                          <textarea
                            placeholder="Bitte Sonstiges spezifizieren"
                            value={zertifikatFreitext[`${catName}: Sonstiges`] || ''}
                            onChange={(e) => handleSonstigesTextChange(`${catName}: Sonstiges`, e.target.value)}
                            className="w-full p-4 bg-slate-50 rounded-xl text-sm h-20 border border-slate-200"
                          />
                        )}
                      </div>
                    )}

                    {!Array.isArray(content) && typeof content === 'object' && content !== null && catName === 'Reitweisen' && (
                      <div className="space-y-6">
                        {Object.entries(content as Record<string, unknown>).map(([subCat, items]) => {
                          if (subCat === 'Sonstiges') {
                            const sonstigesKey = `${catName}: Sonstiges`;
                            return (
                              <div key={subCat} className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.2em]">{subCat}</h4>
                                <button
                                  type="button"
                                  onClick={() => toggleSonstiges(sonstigesKey)}
                                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all border-2 ${hasFreitextSelection(sonstigesKey) ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-200'}`}
                                >
                                  Sonstiges
                                </button>
                                {hasFreitextSelection(sonstigesKey) && (
                                  <textarea
                                    placeholder="Bitte Sonstiges spezifizieren"
                                    value={zertifikatFreitext[sonstigesKey] || ''}
                                    onChange={(e) => handleSonstigesTextChange(sonstigesKey, e.target.value)}
                                    className="w-full p-4 bg-slate-50 rounded-xl text-sm h-20 border border-slate-200"
                                  />
                                )}
                              </div>
                            );
                          }

                          const mainKey = `Reitweisen: ${subCat}`;
                          const mainSelected = formData.zertifikate.includes(mainKey);
                          const centeredLevels = Array.isArray(items) ? items : [];

                          return (
                            <div key={subCat} className="space-y-3">
                              <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.2em]">{subCat}</h4>
                              <button
                                type="button"
                                onClick={() => toggleItem('zertifikate', mainKey)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all border-2 ${mainSelected ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-200'}`}
                              >
                                {subCat}
                              </button>

                              {subCat === 'Centered-Riding-Instructor' && centeredLevels.length > 0 && mainSelected && (
                                <div className="flex flex-wrap gap-2 pl-2">
                                  {centeredLevels.map((level) => {
                                    const levelKey = `${subCat}: ${String(level)}`;
                                    return (
                                      <button
                                        type="button"
                                        key={levelKey}
                                        onClick={() => toggleItem('zertifikate', levelKey)}
                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border ${formData.zertifikate.includes(levelKey) ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-200'}`}
                                      >
                                        {String(level)}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {!Array.isArray(content) && typeof content === 'object' && content !== null && catName === 'Staatlich anerkannte Berufsabschlüsse' && (
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.2em]">Abschlüsse</h4>
                          <div className="flex flex-wrap gap-2">
                            {Array.isArray((content as Record<string, unknown>).Abschlüsse) &&
                              ((content as Record<string, unknown>).Abschlüsse as string[]).map((abschluss) => {
                                const abschlussKey = `Abschlüsse: ${abschluss}`;
                                const selected = formData.zertifikate.includes(abschlussKey);
                                const meisterKey = `Meister: ${abschluss}`;

                                return (
                                  <div key={abschluss} className="space-y-2">
                                    <button
                                      type="button"
                                      onClick={() => toggleItem('zertifikate', abschlussKey)}
                                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all border-2 ${selected ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-200'}`}
                                    >
                                      {abschluss}
                                    </button>

                                    {selected && (
                                      <label className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={formData.zertifikate.includes(meisterKey)}
                                          onChange={() => toggleItem('zertifikate', meisterKey)}
                                          className="w-4 h-4 accent-emerald-600"
                                        />
                                        <span className="text-[9px] font-black uppercase text-emerald-800">Meistertitel</span>
                                      </label>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.2em]">Sonstiges</h4>
                          <button
                            type="button"
                            onClick={() => toggleSonstiges(`${catName}: Sonstiges`)}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all border-2 ${hasFreitextSelection(`${catName}: Sonstiges`) ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-200'}`}
                          >
                            Sonstiges
                          </button>
                          {hasFreitextSelection(`${catName}: Sonstiges`) && (
                            <textarea
                              placeholder="Bitte Sonstiges spezifizieren"
                              value={zertifikatFreitext[`${catName}: Sonstiges`] || ''}
                              onChange={(e) => handleSonstigesTextChange(`${catName}: Sonstiges`, e.target.value)}
                              className="w-full p-4 bg-slate-50 rounded-xl text-sm h-20 border border-slate-200"
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {!Array.isArray(content) && typeof content === 'object' && content !== null && catName !== 'Reitweisen' && catName !== 'Staatlich anerkannte Berufsabschlüsse' && (
                      <div className="space-y-6">
                        {Object.entries(content as Record<string, unknown>).map(([subCat, items]) => {
                          const sonstigesKey = `${catName}: Sonstiges`;

                          if (subCat === 'Sonstiges') {
                            return (
                              <div key={subCat} className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.2em]">{subCat}</h4>
                                <button
                                  type="button"
                                  onClick={() => toggleSonstiges(sonstigesKey)}
                                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all border-2 ${hasFreitextSelection(sonstigesKey) ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-200'}`}
                                >
                                  Sonstiges
                                </button>
                                {hasFreitextSelection(sonstigesKey) && (
                                  <textarea
                                    placeholder="Bitte Sonstiges spezifizieren"
                                    value={zertifikatFreitext[sonstigesKey] || ''}
                                    onChange={(e) => handleSonstigesTextChange(sonstigesKey, e.target.value)}
                                    className="w-full p-4 bg-slate-50 rounded-xl text-sm h-20 border border-slate-200"
                                  />
                                )}
                              </div>
                            );
                          }

                          if (Array.isArray(items)) {
                            return (
                              <div key={subCat} className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.2em]">{subCat}</h4>
                                <div className="flex flex-wrap gap-2">
                                  {items.map((item) => (
                                    <button
                                      type="button"
                                      key={`${subCat}-${String(item)}`}
                                      onClick={() => toggleItem('zertifikate', `${subCat}: ${String(item)}`)}
                                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all border-2 ${formData.zertifikate.includes(`${subCat}: ${String(item)}`) ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-200'}`}
                                    >
                                      {String(item)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div key={subCat} className="space-y-3">
                              <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.2em]">{subCat}</h4>
                              <button
                                type="button"
                                onClick={() => toggleItem('zertifikate', subCat)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all border-2 ${formData.zertifikate.includes(subCat) ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-200'}`}
                              >
                                {subCat}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

            <div className="mt-8 p-6 border-2 border-dashed border-emerald-100 rounded-[1.5rem] bg-emerald-50/30">
              <div className="flex flex-col md:flex-row items-center gap-5">
                <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm text-emerald-600">
                  <ShieldCheck size={32} />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-sm font-black uppercase italic text-slate-800">Nachweise hochladen</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mt-1">
                    Bitte lade hier deine Zertifikate (Urkunden, Zeugnisse) als PDF oder Foto hoch.
                    <span className="text-emerald-600 block sm:inline sm:ml-1">Dies ist zwingend für das "Verifiziert"-Abzeichen.</span>
                  </p>
                </div>
                <div className="relative">
                  <input 
                    type="file" 
                    multiple 
                    className="hidden" 
                    id="cert-upload-experte"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setCertificates(e.target.files)}
                  />
                  <label
                    htmlFor="cert-upload-experte"
                    className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase italic tracking-widest cursor-pointer hover:bg-emerald-600 transition-all shadow-lg block"
                  >
                    Dateien wählen
                  </label>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-[8px] font-black uppercase text-slate-400">Unterstützte Formate: PDF, JPG, PNG (max. 5MB pro Datei)</span>
                {certificates && certificates.length > 0 && (
                  <span className="text-[8px] font-black uppercase text-emerald-600">✓ {certificates.length} Datei(en) gewählt</span>
                )}
              </div>
            </div>
          </section>

          <section className="bg-slate-900 rounded-[2.25rem] p-7 shadow-2xl text-white">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-8 flex items-center gap-2">
              <FileText size={18} /> Schulpferde (optional)
            </h3>
            <div className="space-y-4">
              {pferde.map((pferd, index) => (
                <div key={`pferd-${index}`} className="p-4 rounded-2xl border border-white/10 bg-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Pferd {index + 1}</p>
                    {pferde.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePferd(index)}
                        className="text-[9px] font-black uppercase tracking-widest text-red-300 hover:text-red-200"
                      >
                        Entfernen
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label htmlFor={`experte-schulpferd-name-${index}`} className="text-[9px] font-black uppercase ml-2 text-slate-500 italic">Name</label>
                      <input
                        id={`experte-schulpferd-name-${index}`}
                        name={`experte-schulpferd-name-${index}`}
                        placeholder="z.B. Starlight"
                        value={pferd.name}
                        onChange={(e) => updatePferd(index, 'name', e.target.value)}
                        className="w-full p-3 text-sm bg-white/5 border border-white/10 rounded-xl font-bold outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor={`experte-schulpferd-rasse-${index}`} className="text-[9px] font-black uppercase ml-2 text-slate-500 italic">Rasse</label>
                      <input
                        id={`experte-schulpferd-rasse-${index}`}
                        name={`experte-schulpferd-rasse-${index}`}
                        placeholder="z.B. Hannoveraner"
                        value={pferd.rasse}
                        onChange={(e) => updatePferd(index, 'rasse', e.target.value)}
                        className="w-full p-3 text-sm bg-white/5 border border-white/10 rounded-xl font-bold outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor={`experte-schulpferd-alter-${index}`} className="text-[9px] font-black uppercase ml-2 text-slate-500 italic">Alter</label>
                      <input
                        id={`experte-schulpferd-alter-${index}`}
                        name={`experte-schulpferd-alter-${index}`}
                        placeholder="z.B. 7"
                        value={pferd.alter}
                        onChange={(e) => updatePferd(index, 'alter', e.target.value)}
                        className="w-full p-3 text-sm bg-white/5 border border-white/10 rounded-xl font-bold outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor={`experte-pferd-beschreibung-${index}`} className="text-[9px] font-black uppercase ml-2 text-slate-500 italic">Beschreibung</label>
                    <textarea
                      id={`experte-pferd-beschreibung-${index}`}
                      name={`experte-pferd-beschreibung-${index}`}
                      placeholder="Besonderheiten, Trainingsstand, Charakter..."
                      value={pferd.beschreibung}
                      onChange={(e) => updatePferd(index, 'beschreibung', e.target.value)}
                      rows={3}
                      className="w-full p-3 text-sm bg-white/5 border border-white/10 rounded-xl font-medium outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor={`experte-pferd-bilder-${index}`} className="text-[9px] font-black uppercase ml-2 text-slate-500 italic">Pferdebilder</label>
                    <label htmlFor={`experte-pferd-bilder-${index}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-emerald-500">
                      Bilder auswählen
                      <input
                        id={`experte-pferd-bilder-${index}`}
                        name={`experte-pferd-bilder-${index}`}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handlePferdBilderChange(index, e.target.files)}
                      />
                    </label>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      {pferd.bilder.length > 0 ? `${pferd.bilder.length} Bild(er) gewählt` : 'Noch keine Bilder ausgewählt'}
                    </p>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addPferd}
                disabled={pferde.length >= FREE_EXPERT_HORSE_LIMIT}
                className="px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-500"
              >
                + Weiteres Pferd hinzufügen
              </button>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Ohne Abo sind hier bis zu {FREE_EXPERT_HORSE_LIMIT} Schulpferde möglich. Mit Abo später unbegrenzt.
              </p>
            </div>
          </section>


        {/* BLOCK 4: PERSÖNLICHES, ADRESSE & ACCOUNT */}
        <section className="bg-slate-900 rounded-[2.25rem] p-7 text-white shadow-2xl space-y-6">
          <h2 className="text-lg font-black uppercase italic text-emerald-400">4. Private Daten & Sicherheit</h2>
          
          <div className="space-y-4">
            <div>
              <MediaDropzone
                title="Profilbild hochladen (optional)"
                description="Ziehe ein Profilbild hierhin oder klicke, um auszuwählen."
                accept="image/*"
                multiple={false}
                onFiles={(files) => {
                  setProfileImage(files && files.length > 0 ? files[0] : null);
                  return Promise.resolve();
                }}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="vorname" className="block text-[10px] font-bold uppercase text-white/70 mb-1">Vorname</label>
              <input
                id="vorname"
                name="vorname"
                placeholder="Vorname"
                value={formData.vorname}
                onChange={(e) => setFormValue('vorname', e.target.value)}
                required
                autoComplete="given-name"
                className="w-full p-3 text-sm bg-white/5 border border-white/10 rounded-xl"
              />
              {fieldErrors.vorname && <p className="mt-1 text-[10px] font-bold text-red-300">{fieldErrors.vorname}</p>}
            </div>
            <div>
              <label htmlFor="nachname" className="block text-[10px] font-bold uppercase text-white/70 mb-1">Nachname</label>
              <input
                id="nachname"
                name="nachname"
                placeholder="Nachname"
                value={formData.nachname}
                onChange={(e) => setFormValue('nachname', e.target.value)}
                required
                autoComplete="family-name"
                className="w-full p-3 text-sm bg-white/5 border border-white/10 rounded-xl"
              />
              {fieldErrors.nachname && <p className="mt-1 text-[10px] font-bold text-red-300">{fieldErrors.nachname}</p>}
            </div>
            <div className="md:col-span-2 grid gap-2">
              <label htmlFor="birthDate" className="text-[9px] font-black uppercase ml-2 text-slate-500 italic">Geburtsdatum (nicht öffentlich)</label>
              <input
                id="birthDate"
                name="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormValue('birthDate', e.target.value)}
                autoComplete="bday"
                className="p-3 text-sm bg-white/5 border border-white/10 rounded-xl"
              />
              {fieldErrors.birthDate && <p className="-mt-1 text-[10px] font-bold text-red-300">{fieldErrors.birthDate}</p>}
            </div>
            <div className="md:col-span-2 grid grid-cols-3 gap-2">
              <input
                id="privatStrasse"
                name="privatStrasse"
                placeholder="Privatadresse (Straße)"
                value={formData.privatStrasse}
                onChange={(e) => setFormValue('privatStrasse', e.target.value)}
                required
                className="col-span-2 p-3 text-sm bg-white/5 border border-white/10 rounded-xl"
              />
              <input
                id="privatHausnummer"
                name="privatHausnummer"
                placeholder="Nr."
                value={formData.privatHausnummer}
                onChange={(e) => setFormValue('privatHausnummer', e.target.value)}
                required
                className="p-3 text-sm bg-white/5 border border-white/10 rounded-xl"
              />
            </div>
            {(fieldErrors.privatStrasse || fieldErrors.privatHausnummer) && (
              <p className="md:col-span-2 -mt-2 text-[10px] font-bold text-red-300">{fieldErrors.privatStrasse || fieldErrors.privatHausnummer}</p>
            )}
            <input
                id="privatPlz"
                name="privatPlz"
                placeholder="PLZ"
                value={formData.privatPlz}
                onChange={(e) => setFormValue('privatPlz', e.target.value)}
                required
                className="p-3 text-sm bg-white/5 border border-white/10 rounded-xl"
              />
              {fieldErrors.privatPlz && <p className="-mt-2 text-[10px] font-bold text-red-300">{fieldErrors.privatPlz}</p>}
              <input
                id="privatOrt"
                name="privatOrt"
                placeholder="Ort"
                value={formData.privatOrt}
                onChange={(e) => setFormValue('privatOrt', e.target.value)}
                required
                className="p-3 text-sm bg-white/5 border border-white/10 rounded-xl"
              />
              {fieldErrors.privatOrt && <p className="-mt-2 text-[10px] font-bold text-red-300">{fieldErrors.privatOrt}</p>}

            {/* Mein Pferd removed for expert registration per request */}
            
            <div className="md:col-span-2 py-5 border-t border-white/10 mt-3">
              <div className="flex items-center gap-4 p-5 bg-emerald-600/10 border border-emerald-500/20 rounded-2xl">
                <FileText className="text-emerald-400" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest">Ausweis-Verifikation</p>
                  <p className="text-[9px] text-slate-400 uppercase">Lade ein Foto deines Ausweises hoch (Manuelle Prüfung)</p>
                  {idProof && idProof.length > 0 && (
                    <p className="text-[8px] text-emerald-400 font-black uppercase mt-1">✓ {idProof.length} Datei(en) gewählt</p>
                  )}
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  id="id-upload"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setIdProof(e.target.files)}
                />
                <label htmlFor="id-upload" className="ml-auto bg-white text-slate-900 px-4 py-2 rounded-lg text-[9px] font-black uppercase cursor-pointer hover:bg-emerald-400 transition-colors">Upload</label>
              </div>
            </div>

            <input
              id="email"
              name="email"
              type="email"
              placeholder="E-Mail für Login"
              value={formData.email}
              onChange={(e) => setFormValue('email', e.target.value)}
              required
              autoComplete="email"
              className="md:col-span-2 p-3 text-sm bg-white/5 border border-white/10 rounded-xl"
            />
            {fieldErrors.email && <p className="md:col-span-2 -mt-2 text-[10px] font-bold text-red-300">{fieldErrors.email}</p>}
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Passwort"
              value={formData.password}
              onChange={(e) => setFormValue('password', e.target.value)}
              required
              autoComplete="new-password"
              className="p-3 text-sm bg-white/5 border border-white/10 rounded-xl"
            />
            {fieldErrors.password && <p className="-mt-2 text-[10px] font-bold text-red-300">{fieldErrors.password}</p>}
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Passwort bestätigen"
              value={formData.confirmPassword}
              onChange={(e) => setFormValue('confirmPassword', e.target.value)}
              required
              autoComplete="new-password"
              className="p-3 text-sm bg-white/5 border border-white/10 rounded-xl"
            />
            {fieldErrors.confirmPassword && <p className="-mt-2 text-[10px] font-bold text-red-300">{fieldErrors.confirmPassword}</p>}
          </div>

          <div className="space-y-4 pt-6 border-t border-white/10">
            <label className="flex items-center gap-4 cursor-pointer group">
              <input
                type="checkbox"
                checked={formData.datenschutz}
                onChange={(e) => setFormValue('datenschutz', e.target.checked)}
                className="w-5 h-5 accent-emerald-500"
              />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">
                Ich akzeptiere die <Link href="/agb" className="underline text-white">AGB</Link> und <Link href="/datenschutz" className="underline text-white">Datenschutzerklärung</Link>
              </span>
            </label>
            {fieldErrors.datenschutz && <p className="text-[10px] font-bold text-red-300 ml-9">{fieldErrors.datenschutz}</p>}
            <label className="flex items-center gap-4 cursor-pointer group">
              <input
                type="checkbox"
                checked={formData.newsletterExperte}
                onChange={(e) => setFormValue('newsletterExperte', e.target.checked)}
                className="w-5 h-5 accent-emerald-500"
              />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors text-emerald-400">Ja, ich möchte den Newsletter für Experten erhalten</span>
            </label>
          </div>

          <button
            type="button"
            onClick={handleProfilEinreichen}
            disabled={uploading}
            className="w-full bg-emerald-600 py-4 rounded-2xl text-lg font-black uppercase italic tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Profil wird eingereich und Dateien werden hochgeladen...' : 'Profil zur Prüfung einreichen'}
          </button>

          <p className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
            Bereits registriert?
            {' '}
            <Link href="/login" className="text-emerald-400 hover:text-white underline underline-offset-2">
              Zum Einloggen
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}