"use client";

import React, { useEffect, useState } from 'react';
import { registerUser, saveUserProfileData, uploadProfileHorseImage, uploadProfileImage } from '../../actions';
import MediaDropzone from '../../components/media-dropzone';
import Link from 'next/link';
import { Camera, Check, FileText, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { ANGEBOT_KATEGORIEN, ZERTIFIKAT_KATEGORIEN } from '../../suche/kategorien-daten';

export default function RegistrierungNutzer() {
  const [formData, setFormData] = useState({
    profilName: '',
    profilBeschreibung: '',
    vorname: '',
    nachname: '',
    birthDate: '',
    privatStrasse: '',
    privatHausnummer: '',
    privatPlz: '',
    privatOrt: '',
    email: '',
    password: '',
    confirmPassword: '',
    interessen: [] as string[],
    interessenThemen: [] as string[],
    gesuche: {} as Record<string, { titel: string; inhalt: string }>,
    block3Zertifikate: [] as string[],
    newsletter: false,
    datenschutz: false,
    role: 'nutzer'
  });

  // Certificates and ID verification are uploaded after login in the user profile (admin-only access to files)
  const [uploading, setUploading] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreviewUrl, setProfileImagePreviewUrl] = useState('');
  const [pferde, setPferde] = useState<Array<{ name: string; rasse: string; alter: string; beschreibung: string; bilder: File[] }>>([
    { name: '', rasse: '', alter: '', beschreibung: '', bilder: [] }
  ]);
  const [openSection, setOpenSection] = useState<string | null>('FN-Abzeichen');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [block3Freitext, setBlock3Freitext] = useState<Record<string, string>>({});

  const setFormValue = (key: keyof typeof formData, value: string | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  useEffect(() => {
    if (!profileImage) {
      setProfileImagePreviewUrl('');
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(profileImage);
    setProfileImagePreviewUrl(nextPreviewUrl);

    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [profileImage]);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.profilName.trim()) errors.profilName = 'Pflichtfeld';

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

  const toggleBlock3Zertifikat = (item: string) => {
    setFormData((prev) => ({
      ...prev,
      block3Zertifikate: prev.block3Zertifikate.includes(item)
        ? prev.block3Zertifikate.filter((i) => i !== item)
        : [...prev.block3Zertifikate, item]
    }));
  };

  const hasBlock3FreitextSelection = (key: string) => {
    return formData.block3Zertifikate.includes(key) || formData.block3Zertifikate.some((entry) => entry.startsWith(`${key}: `));
  };

  const toggleBlock3Sonstiges = (key: string) => {
    setFormData((prev) => {
      const selected = prev.block3Zertifikate.includes(key);
      const cleaned = prev.block3Zertifikate.filter((entry) => entry !== key && !entry.startsWith(`${key}: `));

      if (selected) {
        return { ...prev, block3Zertifikate: cleaned };
      }

      return { ...prev, block3Zertifikate: [...cleaned, key] };
    });

    setBlock3Freitext((prev) => {
      if (!hasBlock3FreitextSelection(key)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleBlock3SonstigesTextChange = (key: string, value: string) => {
    setBlock3Freitext((prev) => ({ ...prev, [key]: value }));

    setFormData((prev) => {
      const cleaned = prev.block3Zertifikate.filter((entry) => !entry.startsWith(`${key}: `));
      const trimmed = value.trim();

      if (!prev.block3Zertifikate.includes(key)) {
        return { ...prev, block3Zertifikate: cleaned };
      }

      if (!trimmed) {
        return { ...prev, block3Zertifikate: cleaned };
      }

      return { ...prev, block3Zertifikate: [...cleaned, `${key}: ${trimmed}`] };
    });
  };

  const toggleInteresse = (item: string) => {
    setFormData(prev => {
      const list = [...prev.interessen];
      const index = list.indexOf(item);

      if (index > -1) {
        list.splice(index, 1);
        const nextGesuche = { ...prev.gesuche };
        delete nextGesuche[item];
        return { ...prev, interessen: list, gesuche: nextGesuche };
      }

      list.push(item);
      return {
        ...prev,
        interessen: list,
        gesuche: {
          ...prev.gesuche,
          [item]: prev.gesuche[item] || { titel: '', inhalt: '' }
        }
      };
    });
  };

  const updateGesuchFeld = (kategorie: string, feld: 'titel' | 'inhalt', value: string) => {
    setFormData(prev => ({
      ...prev,
      gesuche: {
        ...prev.gesuche,
        [kategorie]: {
          ...(prev.gesuche[kategorie] || { titel: '', inhalt: '' }),
          [feld]: value
        }
      }
    }));
  };

  const toggleInteressenThema = (item: string) => {
    setFormData(prev => {
      const list = [...prev.interessenThemen];
      const index = list.indexOf(item);
      if (index > -1) list.splice(index, 1);
      else list.push(item);
      return { ...prev, interessenThemen: list };
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
    setPferde((prev) => [...prev, { name: '', rasse: '', alter: '', beschreibung: '', bilder: [] }]);
  };

  const removePferd = (index: number) => {
    setPferde((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setUploading(true);
    try {
      const res = await registerUser({
        ...formData,
        geburtsdatum: formData.birthDate,
        stallName: formData.profilName || null,
        bio: formData.profilBeschreibung || null,
        lizenzen: formData.interessen,
        custom_lizenzen: formData.interessenThemen.length > 0 ? formData.interessenThemen.join(', ') : null
      });

      if (!res.success) {
        alert(res.error || 'Registrierung fehlgeschlagen.');
        setUploading(false);
        return;
      }

      if (res.userId) {
        // Upload optional profile image during registration
        if (profileImage) {
          try {
            const imgForm = new FormData();
            imgForm.append('file', profileImage);
            const imgRes = await uploadProfileImage(res.userId, imgForm);
            if (!imgRes.success) console.warn('Profilbild Upload fehlgeschlagen:', imgRes.error);
          } catch (err) {
            console.error('Profilbild Upload Exception:', err);
          }
        }
        // Certificates and ID uploads are intentionally NOT handled during registration.
        // Users should log in and upload documents from their profile/settings page instead.

        // Upload horse images
        const gespeichertePferde = await Promise.all(
          pferde.map(async (pferd) => {
            const bildUrls: string[] = [];

            for (const file of pferd.bilder) {
              try {
                const uploadData = new FormData();
                uploadData.append('file', file);
                const uploadRes = await uploadProfileHorseImage(res.userId, 'nutzer', uploadData);
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

        const erstesPferd = validePferde[0] || { name: '', rasse: '', alter: '', beschreibung: '', bilder: [] as string[] };

        const sucheText = Object.entries(formData.gesuche)
          .map(([kat, val]) => `${kat}: ${val.titel} ${val.inhalt}`.trim())
          .join(' | ');

        await saveUserProfileData(res.userId, {
          profilName: formData.profilName,
          profilBeschreibung: formData.profilBeschreibung,
          vorname: formData.vorname,
          nachname: formData.nachname,
          birthDate: formData.birthDate,
          email: formData.email,
          pferdName: erstesPferd.name,
          pferdRasse: erstesPferd.rasse,
          pferdAlter: erstesPferd.alter,
          pferdBeschreibung: erstesPferd.beschreibung,
          pferdBilder: erstesPferd.bilder,
          pferde: validePferde,
          ort: formData.privatOrt,
          plz: formData.privatPlz,
          kategorien: formData.interessen,
          interessenThemen: formData.interessenThemen,
          block3Zertifikate: formData.block3Zertifikate,
          gesuche: formData.gesuche,
          sucheText
        });
      }

      if (res.userId) {
        sessionStorage.setItem('userId', String(res.userId));
        sessionStorage.setItem('userRole', 'nutzer');
        sessionStorage.setItem('userName', `${formData.vorname} ${formData.nachname}`.trim() || formData.profilName || 'Nutzer');
      }

      alert("Konto erstellt. Du bist jetzt eingeloggt.");
      window.location.href = '/';
    } catch (err) {
      console.error('Registrierungsfehler:', err);
      alert('Ein Fehler bei der Registrierung ist aufgetreten.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16 font-sans text-slate-900">
      <nav className="p-4 bg-white border-b sticky top-0 z-50 flex justify-between items-center shadow-sm">
        <span className="font-black text-emerald-600 text-xl italic uppercase tracking-tighter">EQUIPRO</span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Reiter Profil erstellen</span>
      </nav>

      <main className="max-w-[58rem] mx-auto px-5 mt-8 space-y-8">
        <form onSubmit={handleRegister} className="space-y-8">

          {/* BLOCK 1: PROFILBILD, NAME & BESCHREIBUNG */}
          <section className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-100">
            <h2 className="text-lg font-black uppercase italic mb-6 text-emerald-600">1. Profilname & Kurzprofil</h2>
            <div className="grid grid-cols-1 gap-3">
                <div>
                  <MediaDropzone
                    title="Profilbild hochladen (optional)"
                    description="Ziehe ein Profilbild hierhin oder klicke, um auszuwählen. Es wird sofort oben angezeigt."
                    accept="image/*"
                    multiple={false}
                    onFiles={(files) => {
                      setProfileImage(files && files.length > 0 ? files[0] : null);
                      return Promise.resolve();
                    }}
                  />
                </div>
                {profileImagePreviewUrl && (
                  <div className="flex justify-center md:justify-start pt-1">
                    <div className="relative h-28 w-28 overflow-hidden rounded-3xl border-4 border-white shadow-[0_14px_45px_rgba(16,185,129,0.18)] bg-slate-100">
                      <img
                        src={profileImagePreviewUrl}
                        alt="Profilbild Vorschau"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                )}
                <label htmlFor="profilName" className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Profilname</label>
                <input
                  id="profilName"
                  name="profilName"
                  placeholder="Profilname (z.B. Anna & Pferd Luna)"
                  value={formData.profilName}
                  onChange={(e) => setFormValue('profilName', e.target.value)}
                  autoComplete="off"
                  className="w-full p-3 text-sm bg-slate-50 rounded-xl font-bold border-2 border-transparent focus:border-emerald-200 outline-none"
                />
                {fieldErrors.profilName && <p className="-mt-2 text-[10px] font-bold text-red-500">{fieldErrors.profilName}</p>}
                <textarea
                  id="profilBeschreibung"
                  name="profilBeschreibung"
                  placeholder="Kurzbeschreibung: Schreibe was dich ausmacht (empfohlen)"
                  value={formData.profilBeschreibung}
                  onChange={(e) => setFormValue('profilBeschreibung', e.target.value)}
                  className="w-full p-4 text-sm bg-slate-50 rounded-[1.5rem] font-medium border-2 border-transparent focus:border-emerald-200 outline-none min-h-[120px] resize-none"
                />
            </div>
          </section>

          {/* BLOCK 2: SUCH-KATEGORIEN (WIE EXPERTE) */}
          <section className="bg-white rounded-[2.25rem] p-7 shadow-sm border border-slate-100 space-y-7">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-600 text-white w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black italic shadow-lg">02</div>
              <h2 className="text-lg font-black uppercase italic text-emerald-600">Ich bin aktuell auf der Suche nach: (optional)</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {ANGEBOT_KATEGORIEN.map((kat) => (
                <button
                  key={kat.label}
                  type="button"
                  onClick={() => toggleInteresse(kat.label)}
                  className={`p-4 rounded-[1.75rem] border-2 transition-all flex flex-col items-center gap-3 ${
                    formData.interessen.includes(kat.label) ? 'border-emerald-500 bg-emerald-50' : 'border-slate-50 bg-slate-50'
                  }`}
                >
                  <span className="text-2xl font-black text-emerald-700">{kat.label.slice(0, 1)}</span>
                  <span className="text-[10px] font-black uppercase text-center leading-tight">{kat.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-6">
              {ANGEBOT_KATEGORIEN.filter(k => formData.interessen.includes(k.label)).map((kat) => (
                <div key={kat.label} className="bg-slate-50 rounded-[1.75rem] p-6 border border-slate-100">
                  <h3 className="text-[11px] font-black uppercase italic text-slate-800 mb-4 flex items-center gap-2">
                    <Check size={16} className="text-emerald-500" /> {kat.label} verfeinern
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {kat.themen.map((thema: any, idx: number) => {
                      const isObj = typeof thema !== 'string';
                      const name = isObj ? thema.name : thema;
                      const isSelected = formData.interessenThemen.includes(name);

                      return (
                        <div key={idx} className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => toggleInteressenThema(name)}
                            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${
                              isSelected ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-100'
                            }`}
                          >
                            {name}
                          </button>

                          {isObj && thema.subs && isSelected && (
                            <div className="flex items-center gap-2 mt-1 ml-2">
                              <div className="flex gap-1.5 flex-wrap">
                                {thema.subs.map((sub: string) => (
                                  <button
                                    key={sub}
                                    type="button"
                                    onClick={() => toggleInteressenThema(`${name}: ${sub}`)}
                                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${
                                      formData.interessenThemen.includes(`${name}: ${sub}`) ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 border border-slate-200'
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

            {formData.interessen.length > 0 && (
              <div className="space-y-4 pt-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Suchanfrage je Kategorie</h3>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Nach deiner Auswahl kannst du pro Kategorie Titel und Inhalt angeben.</p>

                <div className="space-y-4">
                  {formData.interessen.map((kategorie) => (
                    <div key={`gesuch-${kategorie}`} className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{kategorie}</p>
                      <input
                        type="text"
                        placeholder="Titel (z.B. Suche Dressurunterricht für Einsteiger)"
                        value={formData.gesuche[kategorie]?.titel || ''}
                        onChange={(e) => updateGesuchFeld(kategorie, 'titel', e.target.value)}
                        className="w-full p-3 text-sm bg-slate-50 rounded-xl font-bold border-2 border-transparent focus:border-emerald-200 outline-none"
                      />
                      <textarea
                        rows={3}
                        placeholder="Inhalt (z.B. Raum München, 1-2x pro Woche, mobil oder am Stall möglich)"
                        value={formData.gesuche[kategorie]?.inhalt || ''}
                        onChange={(e) => updateGesuchFeld(kategorie, 'inhalt', e.target.value)}
                        className="w-full p-3 text-sm bg-slate-50 rounded-xl font-medium border-2 border-transparent focus:border-emerald-200 outline-none resize-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* BLOCK 3: QUALIFIKATIONEN & EXPERTEN-VERIFIZIERUNG (NUR PROFILDATEN) */}
          <section className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-100">
            <h2 className="text-lg font-black uppercase italic mb-2 text-emerald-600">3. Qualifikationen & Zertifikate</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Mache Angebote benötigen Zertifikate zur Teilnahme (empfohlen)</p>

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
                    <div className="p-5 bg-white">
                      {Array.isArray(content) && (
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {content.map((item) => {
                              const isSonstiges = item === 'Sonstiges';
                              const sonstigesKey = `${catName}: Sonstiges`;
                              const selected = isSonstiges ? hasBlock3FreitextSelection(sonstigesKey) : formData.block3Zertifikate.includes(item);

                              return (
                                <button
                                  type="button"
                                  key={`${catName}-${item}`}
                                  onClick={() => (isSonstiges ? toggleBlock3Sonstiges(sonstigesKey) : toggleBlock3Zertifikat(item))}
                                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all border-2 ${selected ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-200'}`}
                                >
                                  {item}
                                </button>
                              );
                            })}
                          </div>

                          {hasBlock3FreitextSelection(`${catName}: Sonstiges`) && (
                            <textarea
                              placeholder="Bitte Sonstiges spezifizieren"
                              value={block3Freitext[`${catName}: Sonstiges`] || ''}
                              onChange={(e) => handleBlock3SonstigesTextChange(`${catName}: Sonstiges`, e.target.value)}
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
                                    onClick={() => toggleBlock3Sonstiges(sonstigesKey)}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all border-2 ${hasBlock3FreitextSelection(sonstigesKey) ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-200'}`}
                                  >
                                    Sonstiges
                                  </button>
                                  {hasBlock3FreitextSelection(sonstigesKey) && (
                                    <textarea
                                      placeholder="Bitte Sonstiges spezifizieren"
                                      value={block3Freitext[sonstigesKey] || ''}
                                      onChange={(e) => handleBlock3SonstigesTextChange(sonstigesKey, e.target.value)}
                                      className="w-full p-4 bg-slate-50 rounded-xl text-sm h-20 border border-slate-200"
                                    />
                                  )}
                                </div>
                              );
                            }

                            const mainKey = `Reitweisen: ${subCat}`;
                            const mainSelected = formData.block3Zertifikate.includes(mainKey);
                            const centeredLevels = Array.isArray(items) ? items : [];

                            return (
                              <div key={subCat} className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.2em]">{subCat}</h4>
                                <button
                                  type="button"
                                  onClick={() => toggleBlock3Zertifikat(mainKey)}
                                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all border-2 ${mainSelected ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-200'}`}
                                >
                                  {subCat}
                                </button>

                                {subCat === 'Centered-Riding-Instructor' && centeredLevels.length > 0 && mainSelected && (
                                  <div className="flex flex-wrap gap-2 pl-2">
                                    {centeredLevels.map((level) => {
                                      const token = `${subCat}: ${String(level)}`;
                                      return (
                                        <button
                                          type="button"
                                          key={token}
                                          onClick={() => toggleBlock3Zertifikat(token)}
                                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border ${formData.block3Zertifikate.includes(token) ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-200'}`}
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
                                  const selected = formData.block3Zertifikate.includes(abschlussKey);
                                  const meisterKey = `Meister: ${abschluss}`;

                                  return (
                                    <div key={abschluss} className="space-y-2">
                                      <button
                                        type="button"
                                        onClick={() => toggleBlock3Zertifikat(abschlussKey)}
                                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all border-2 ${selected ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-200'}`}
                                      >
                                        {abschluss}
                                      </button>

                                      {selected && (
                                        <label className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={formData.block3Zertifikate.includes(meisterKey)}
                                            onChange={() => toggleBlock3Zertifikat(meisterKey)}
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
                              onClick={() => toggleBlock3Sonstiges(`${catName}: Sonstiges`)}
                              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all border-2 ${hasBlock3FreitextSelection(`${catName}: Sonstiges`) ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-200'}`}
                            >
                              Sonstiges
                            </button>
                            {hasBlock3FreitextSelection(`${catName}: Sonstiges`) && (
                              <textarea
                                placeholder="Bitte Sonstiges spezifizieren"
                                value={block3Freitext[`${catName}: Sonstiges`] || ''}
                                onChange={(e) => handleBlock3SonstigesTextChange(`${catName}: Sonstiges`, e.target.value)}
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
                                    onClick={() => toggleBlock3Sonstiges(sonstigesKey)}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all border-2 ${hasBlock3FreitextSelection(sonstigesKey) ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-200'}`}
                                  >
                                    Sonstiges
                                  </button>
                                  {hasBlock3FreitextSelection(sonstigesKey) && (
                                    <textarea
                                      placeholder="Bitte Sonstiges spezifizieren"
                                      value={block3Freitext[sonstigesKey] || ''}
                                      onChange={(e) => handleBlock3SonstigesTextChange(sonstigesKey, e.target.value)}
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
                                    {items.map((item) => {
                                      const token = `${subCat}: ${String(item)}`;
                                      return (
                                        <button
                                          type="button"
                                          key={token}
                                          onClick={() => toggleBlock3Zertifikat(token)}
                                          className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all border-2 ${formData.block3Zertifikate.includes(token) ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-200'}`}
                                        >
                                          {String(item)}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div key={subCat} className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.2em]">{subCat}</h4>
                                <button
                                  type="button"
                                  onClick={() => toggleBlock3Zertifikat(subCat)}
                                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all border-2 ${formData.block3Zertifikate.includes(subCat) ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-200'}`}
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

            <div className="mt-8 p-6 rounded-[1.5rem] bg-emerald-50/20 border border-emerald-100">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm text-emerald-600">
                  <ShieldCheck size={32} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase italic text-slate-800">Nachweise & Ausweis</h3>
                  <p className="text-[10px] font-bold text-slate-500 mt-1">Bitte zuerst einloggen — Zertifikate und Ausweisverifikation müssen nach dem Login im Profil hochgeladen werden. Das Hochladen gehört nicht zur Registrierung.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-slate-900 rounded-[2.25rem] p-7 shadow-2xl text-white">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-8 flex items-center gap-2">
              <FileText size={18} /> Mein Pferd (optional)
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
                      <label htmlFor={`pferd-name-${index}`} className="text-[9px] font-black uppercase ml-2 text-slate-500 italic">Name</label>
                      <input
                        id={`pferd-name-${index}`}
                        name={`pferd-name-${index}`}
                        placeholder="z.B. Starlight"
                        value={pferd.name}
                        onChange={(e) => updatePferd(index, 'name', e.target.value)}
                        className="w-full p-3 text-sm bg-white/5 border border-white/10 rounded-xl font-bold outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor={`pferd-rasse-${index}`} className="text-[9px] font-black uppercase ml-2 text-slate-500 italic">Rasse</label>
                      <input
                        id={`pferd-rasse-${index}`}
                        name={`pferd-rasse-${index}`}
                        placeholder="z.B. Hannoveraner"
                        value={pferd.rasse}
                        onChange={(e) => updatePferd(index, 'rasse', e.target.value)}
                        className="w-full p-3 text-sm bg-white/5 border border-white/10 rounded-xl font-bold outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor={`pferd-alter-${index}`} className="text-[9px] font-black uppercase ml-2 text-slate-500 italic">Alter</label>
                      <input
                        id={`pferd-alter-${index}`}
                        name={`pferd-alter-${index}`}
                        placeholder="z.B. 7"
                        value={pferd.alter}
                        onChange={(e) => updatePferd(index, 'alter', e.target.value)}
                        className="w-full p-3 text-sm bg-white/5 border border-white/10 rounded-xl font-bold outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor={`pferd-beschreibung-${index}`} className="text-[9px] font-black uppercase ml-2 text-slate-500 italic">Beschreibung</label>
                    <textarea
                      id={`pferd-beschreibung-${index}`}
                      name={`pferd-beschreibung-${index}`}
                      placeholder="Besonderheiten, Gesundheitsstand, Trainingslevel..."
                      value={pferd.beschreibung}
                      onChange={(e) => updatePferd(index, 'beschreibung', e.target.value)}
                      rows={3}
                      className="w-full p-3 text-sm bg-white/5 border border-white/10 rounded-xl font-medium outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor={`pferd-bilder-${index}`} className="text-[9px] font-black uppercase ml-2 text-slate-500 italic">Pferdebilder</label>
                    <label htmlFor={`pferd-bilder-${index}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-emerald-500">
                      Bilder auswählen
                      <input
                        id={`pferd-bilder-${index}`}
                        name={`pferd-bilder-${index}`}
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
                className="px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-500"
              >
                + Weiteres Pferd hinzufügen
              </button>
            </div>
          </section>

          {/* BLOCK 4: PERSÖNLICHES, ADRESSE & ACCOUNT (IDENTISCHER STIL) */}
          <section className="bg-slate-900 rounded-[2.25rem] p-7 text-white shadow-2xl space-y-6">
            <h2 className="text-lg font-black uppercase italic text-emerald-400">4. Private Daten & Sicherheit (nicht öffentlich sichtbar)</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="vorname" className="block text-[10px] font-bold uppercase text-white/70 mb-1">Vorname</label>
                <input
                  id="vorname"
                  name="vorname"
                  placeholder="Vorname"
                  value={formData.vorname}
                  onChange={(e) => setFormValue('vorname', e.target.value)}
                  autoComplete="given-name"
                  className="w-full p-3 text-sm bg-white/5 border border-white/10 rounded-xl"
                  required
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
                  autoComplete="family-name"
                  className="w-full p-3 text-sm bg-white/5 border border-white/10 rounded-xl"
                  required
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
                <div className="col-span-2">
                  <label htmlFor="privatStrasse" className="block text-[10px] font-bold uppercase text-white/70 mb-1">Straße</label>
                  <input
                    id="privatStrasse"
                    name="privatStrasse"
                    placeholder="Privatadresse (Straße)"
                    value={formData.privatStrasse}
                    onChange={(e) => setFormValue('privatStrasse', e.target.value)}
                    autoComplete="street-address"
                    className="w-full p-3 text-sm bg-white/5 border border-white/10 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="privatHausnummer" className="block text-[10px] font-bold uppercase text-white/70 mb-1">Nr.</label>
                  <input
                    id="privatHausnummer"
                    name="privatHausnummer"
                    placeholder="Nr."
                    value={formData.privatHausnummer}
                    onChange={(e) => setFormValue('privatHausnummer', e.target.value)}
                    autoComplete="street-address"
                    className="w-full p-3 text-sm bg-white/5 border border-white/10 rounded-xl"
                    required
                  />
                </div>
              </div>
              {(fieldErrors.privatStrasse || fieldErrors.privatHausnummer) && (
                <p className="md:col-span-2 -mt-2 text-[10px] font-bold text-red-300">{fieldErrors.privatStrasse || fieldErrors.privatHausnummer}</p>
              )}
              <div>
                <label htmlFor="privatPlz" className="block text-[10px] font-bold uppercase text-white/70 mb-1">PLZ</label>
                <input
                  id="privatPlz"
                  name="privatPlz"
                  placeholder="PLZ"
                  value={formData.privatPlz}
                  onChange={(e) => setFormValue('privatPlz', e.target.value)}
                  autoComplete="postal-code"
                  className="w-full p-3 text-sm bg-white/5 border border-white/10 rounded-xl"
                  required
                />
                {fieldErrors.privatPlz && <p className="mt-1 text-[10px] font-bold text-red-300">{fieldErrors.privatPlz}</p>}
              </div>
              <div>
                <label htmlFor="privatOrt" className="block text-[10px] font-bold uppercase text-white/70 mb-1">Ort</label>
                <input
                  id="privatOrt"
                  name="privatOrt"
                  placeholder="Ort"
                  value={formData.privatOrt}
                  onChange={(e) => setFormValue('privatOrt', e.target.value)}
                  autoComplete="address-level2"
                  className="w-full p-3 text-sm bg-white/5 border border-white/10 rounded-xl"
                  required
                />
                {fieldErrors.privatOrt && <p className="mt-1 text-[10px] font-bold text-red-300">{fieldErrors.privatOrt}</p>}
              </div>

              <div className="md:col-span-2 py-5 border-t border-white/10 mt-3">
                <div className="flex items-start gap-4 p-5 bg-emerald-50/30 border border-emerald-100 rounded-2xl">
                  <FileText className="text-emerald-400" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest">Ausweis-Verifikation</p>
                    <p className="text-[9px] text-slate-500">Bitte zuerst einloggen — lade Ausweisdokumente nach dem Login in deinem Profil hoch. Manuelle Prüfung durch Admins.</p>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="email" className="block text-[10px] font-bold uppercase text-white/70 mb-1">E-Mail für Login</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="E-Mail für Login"
                  value={formData.email}
                  onChange={(e) => setFormValue('email', e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full p-3 text-sm bg-white/5 border border-white/10 rounded-xl"
                />
                {fieldErrors.email && <p className="mt-1 text-[10px] font-bold text-red-300">{fieldErrors.email}</p>}
              </div>
              <div>
                <label htmlFor="password" className="block text-[10px] font-bold uppercase text-white/70 mb-1">Passwort</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Passwort"
                  value={formData.password}
                  onChange={(e) => setFormValue('password', e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full p-3 text-sm bg-white/5 border border-white/10 rounded-xl"
                />
                {fieldErrors.password && <p className="mt-1 text-[10px] font-bold text-red-300">{fieldErrors.password}</p>}
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-[10px] font-bold uppercase text-white/70 mb-1">Passwort bestätigen</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Passwort bestätigen"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormValue('confirmPassword', e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full p-3 text-sm bg-white/5 border border-white/10 rounded-xl"
                />
                {fieldErrors.confirmPassword && <p className="mt-1 text-[10px] font-bold text-red-300">{fieldErrors.confirmPassword}</p>}
              </div>
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
                  checked={formData.newsletter}
                  onChange={(e) => setFormValue('newsletter', e.target.checked)}
                  className="w-5 h-5 accent-emerald-500"
                />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors text-emerald-400">
                  Ja, ich möchte den Newsletter erhalten
                </span>
              </label>
            </div>

            <button type="submit" disabled={uploading} className="w-full bg-emerald-600 py-4 rounded-2xl text-lg font-black uppercase italic tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed">
              {uploading ? 'Konto wird erstellt und Dateien werden hochgeladen...' : 'Konto erstellen & Starten'}
            </button>

            <p className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
              Bereits registriert?
              {' '}
              <Link href="/login" className="text-emerald-400 hover:text-white underline underline-offset-2">
                Zum Einloggen
              </Link>
            </p>
          </section>
        </form>
      </main>
    </div>
  );
}