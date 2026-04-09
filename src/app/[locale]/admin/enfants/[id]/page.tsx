"use client";

import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Locale } from "@/lib/i18n/config";
import { apiClient } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SidebarNew } from "@/components/layout/sidebar-new";
import { Pencil, X, Plus, Trash2, Save, ChevronLeft } from "lucide-react";

export default function EnfantDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const resolvedParams = use(params);
  const { locale, id } = resolvedParams;
  const t = useTranslations("admin.children");

  const [enfant, setEnfant]   = useState<any | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // ── Edit form state ───────────────────────────────────────────────────────
  const [editing, setEditing]   = useState(false);
  const [editForm, setEditForm] = useState({
    prenom: "", nom: "", genre: "", classeId: "", photoUrl: "", remarques: "",
  });
  const [saving, setSaving]     = useState(false);
  const [editErr, setEditErr]   = useState<string | null>(null);

  // ── Delegation form ───────────────────────────────────────────────────────
  const [showDelForm, setShowDelForm] = useState(false);
  const [delForm, setDelForm] = useState({ nom: "", telephone: "", cin: "", relation: "" });
  const [delSaving, setDelSaving]     = useState(false);
  const [delErr, setDelErr]           = useState<string | null>(null);

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const [childRes, classesRes] = await Promise.all([
          apiClient.getChild(id),
          apiClient.listClasses(),
        ]);
        if (!cancelled) {
          setEnfant(childRes.data);
          setClasses(Array.isArray(classesRes.data) ? classesRes.data : classesRes.data?.data ?? []);
        }
      } catch {
        if (!cancelled) setError("Impossible de charger la fiche enfant.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const openEdit = () => {
    if (!enfant) return;
    setEditForm({
      prenom:    enfant.prenom   ?? "",
      nom:       enfant.nom      ?? "",
      genre:     enfant.genre    ?? "",
      classeId:  enfant.classeId ?? "",
      photoUrl:  enfant.photoUrl ?? "",
      remarques: enfant.remarques ?? "",
    });
    setEditErr(null);
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true); setEditErr(null);
    try {
      const res = await apiClient.updateChild(id, {
        prenom:    editForm.prenom   || undefined,
        nom:       editForm.nom      || undefined,
        genre:     editForm.genre    || undefined,
        classeId:  editForm.classeId || null,
        photoUrl:  editForm.photoUrl || null,
        remarques: editForm.remarques || null,
      });
      setEnfant((prev: any) => ({ ...prev, ...res.data }));
      setEditing(false);
    } catch {
      setEditErr("Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  const addDelegation = async () => {
    if (!delForm.nom.trim()) { setDelErr("Le nom est obligatoire."); return; }
    setDelSaving(true); setDelErr(null);
    try {
      const res = await apiClient.addDelegation(id, delForm);
      setEnfant((prev: any) => ({ ...prev, delegations: [...(prev.delegations ?? []), res.data] }));
      setDelForm({ nom: "", telephone: "", cin: "", relation: "" });
      setShowDelForm(false);
    } catch {
      setDelErr("Erreur lors de l'ajout.");
    } finally {
      setDelSaving(false);
    }
  };

  const removeDelegation = async (delegationId: string) => {
    if (!confirm("Supprimer cette personne autorisée ?")) return;
    try {
      await apiClient.deleteDelegation(id, delegationId);
      setEnfant((prev: any) => ({ ...prev, delegations: prev.delegations.filter((d: any) => d.id !== delegationId) }));
    } catch {
      alert("Erreur lors de la suppression.");
    }
  };

  // ── Loading / error states ────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex">
      <SidebarNew currentLocale={locale} />
      <div className="flex-1 md:ml-64 flex items-center justify-center pt-16 md:pt-0">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Chargement de la fiche enfant…</p>
        </div>
      </div>
    </div>
  );

  if (error || !enfant) return (
    <div className="min-h-screen bg-gray-50 flex">
      <SidebarNew currentLocale={locale} />
      <div className="flex-1 md:ml-64 flex items-center justify-center pt-16 md:pt-0 p-4">
        <p className="text-destructive text-sm text-center">{error ?? "Fiche enfant introuvable."}</p>
      </div>
    </div>
  );

  const fullName    = `${enfant.prenom} ${enfant.nom}`.trim();
  const group       = enfant.classe?.nom ?? "—";
  const niveau      = enfant.classe?.niveau ?? null;
  const tuteurs     = enfant.famille?.tuteurs ?? [];
  const birthdate   = enfant.dateNaissance ? new Date(enfant.dateNaissance) : null;
  const profilSante = enfant.profilSante ?? null;
  const allergies: any[]   = Array.isArray(profilSante?.allergies)   ? profilSante.allergies   : [];
  const intolerances: any[]= Array.isArray(profilSante?.intolerances) ? profilSante.intolerances : [];
  const tags: string[]     = Array.isArray(profilSante?.tags)         ? profilSante.tags         : [];
  const delegations: any[] = Array.isArray(enfant.delegations) ? enfant.delegations : [];
  const inscription  = Array.isArray(enfant.inscriptions) && enfant.inscriptions.length > 0 ? enfant.inscriptions[0] : null;
  const payload      = inscription?.payload ?? null;
  const santePayload = payload?.sante ?? null;

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-x-hidden">
      <SidebarNew currentLocale={locale} />

      <div className="flex-1 md:ml-64 pt-16 md:pt-0">

        {/* ── Mobile-friendly top bar ───────────────────────────────────── */}
        <div className="sticky top-16 md:top-0 z-30 bg-white border-b border-border px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => history.back()}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t("backToList")}</span>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-foreground truncate">{fullName}</h1>
            <p className="text-xs text-muted-foreground truncate">
              {group}{niveau ? ` · ${niveau}` : ""}
            </p>
          </div>
          <Button size="sm" onClick={openEdit} className="flex items-center gap-1.5 flex-shrink-0">
            <Pencil className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Modifier</span>
          </Button>
        </div>

        <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">

          {/* ── Hero card ──────────────────────────────────────────────── */}
          <Card className="p-4 sm:p-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-border bg-muted flex items-center justify-center flex-shrink-0">
                {enfant.photoUrl
                  ? <img src={enfant.photoUrl} alt={fullName} className="w-full h-full object-cover" />
                  : <span className="text-3xl sm:text-4xl">👧</span>}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-foreground break-words">{fullName}</h2>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <span className="text-sm text-muted-foreground">{group}</span>
                  {niveau && <Badge variant="outline" className="text-xs">{niveau}</Badge>}
                  {enfant.genre && <Badge variant="outline" className="text-xs">{enfant.genre === "M" ? "Masculin" : enfant.genre === "F" ? "Féminin" : enfant.genre}</Badge>}
                </div>
                {birthdate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Né(e) le {birthdate.toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                )}
              </div>
            </div>
            {enfant.remarques && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs font-semibold text-amber-700 mb-1">📝 Remarques admin</p>
                <p className="text-sm text-amber-900">{enfant.remarques}</p>
              </div>
            )}
            {payload?.commentaire && (
              <div className="mt-3 p-3 bg-muted/40 border border-border rounded-xl">
                <p className="text-xs font-semibold text-muted-foreground mb-1">💬 Commentaire (inscription)</p>
                <p className="text-sm text-foreground">{payload.commentaire}</p>
              </div>
            )}
          </Card>

          {/* ── Fiche santé ────────────────────────────────────────────── */}
          <Card className="p-4 sm:p-5 space-y-4">
            <h2 className="text-base font-semibold">🏥 Fiche santé</h2>

            {/* Mesures */}
            {(santePayload?.taille || santePayload?.poids) && (
              <div className="flex flex-wrap gap-3">
                {santePayload.taille && (
                  <div className="flex-1 min-w-[100px] rounded-xl p-3 bg-blue-50 border border-blue-200 text-center">
                    <p className="text-xs text-blue-600 font-medium">Taille</p>
                    <p className="text-lg font-bold text-blue-800">{santePayload.taille} cm</p>
                  </div>
                )}
                {santePayload.poids && (
                  <div className="flex-1 min-w-[100px] rounded-xl p-3 bg-green-50 border border-green-200 text-center">
                    <p className="text-xs text-green-600 font-medium">Poids</p>
                    <p className="text-lg font-bold text-green-800">{santePayload.poids} kg</p>
                  </div>
                )}
              </div>
            )}

            {/* Allergies */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Allergies</p>
              {allergies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {allergies.map((a: any, i: number) => (
                    <span key={i} className="px-2.5 py-1 text-xs rounded-full bg-red-50 text-red-700 border border-red-200">
                      {typeof a === "string" ? a : a.nom}{a.severite ? ` (${a.severite})` : ""}
                    </span>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">Aucune allergie.</p>}
            </div>

            {/* Intolérances */}
            {intolerances.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Intolérances</p>
                <div className="flex flex-wrap gap-2">
                  {intolerances.map((i: any) => (
                    <span key={i.id ?? i.nom} className="px-2.5 py-1 text-xs rounded-full bg-orange-50 text-orange-700 border border-orange-200">{i.nom}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Tags santé */}
            {(tags.length > 0 || (santePayload?.tags ?? []).length > 0) && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tags santé</p>
                <div className="flex flex-wrap gap-2">
                  {(tags.length > 0 ? tags : santePayload?.tags ?? []).map((tag: string) => (
                    <span key={tag} className="px-2.5 py-1 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Restriction alimentaire */}
            {santePayload?.restrictionAlimentaire && santePayload.restrictionAlimentaire !== "sans_restriction" && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                <p className="text-xs font-semibold text-yellow-700 mb-0.5">⚠️ Restriction alimentaire</p>
                <p className="text-sm text-yellow-900">
                  {{
                    sans_porc: "Sans porc",
                    vegetarien: "Végétarien",
                    sans_gluten: "Sans gluten",
                    autre: santePayload.restrictionDetails || "Autre",
                  }[santePayload.restrictionAlimentaire as string] ?? santePayload.restrictionAlimentaire}
                </p>
              </div>
            )}

            {/* Profil santé DB */}
            {profilSante && (
              <div className="space-y-1 text-sm border-t border-border pt-3">
                {profilSante.medecin && <InfoRow label="Médecin" value={profilSante.medecin} />}
                {profilSante.notes   && <InfoRow label="Notes médicales" value={profilSante.notes} />}
              </div>
            )}

            {!profilSante && allergies.length === 0 && intolerances.length === 0 && tags.length === 0 && !santePayload && (
              <p className="text-sm text-muted-foreground">Aucune information de santé.</p>
            )}
          </Card>

          {/* ── Personnes autorisées ────────────────────────────────────── */}
          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">👥 Personnes autorisées</h2>
              <Button size="sm" onClick={() => { setShowDelForm(true); setDelErr(null); }} className="flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </Button>
            </div>

            {showDelForm && (
              <div className="mb-4 p-4 border border-border rounded-xl bg-muted/20 space-y-3">
                <p className="text-sm font-semibold">Nouvelle personne autorisée</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Nom complet *</label>
                    <Input value={delForm.nom} onChange={e => setDelForm(p => ({ ...p, nom: e.target.value }))} placeholder="Prénom Nom" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Téléphone</label>
                    <Input value={delForm.telephone} onChange={e => setDelForm(p => ({ ...p, telephone: e.target.value }))} placeholder="+212 6..." />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">CIN</label>
                    <Input value={delForm.cin} onChange={e => setDelForm(p => ({ ...p, cin: e.target.value }))} placeholder="AB123456" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Relation</label>
                    <Input value={delForm.relation} onChange={e => setDelForm(p => ({ ...p, relation: e.target.value }))} placeholder="Grand-mère, Oncle…" />
                  </div>
                </div>
                {delErr && <p className="text-xs text-destructive">{delErr}</p>}
                <div className="flex gap-2">
                  <Button size="sm" onClick={addDelegation} disabled={delSaving}>{delSaving ? "…" : "Ajouter"}</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowDelForm(false)}>Annuler</Button>
                </div>
              </div>
            )}

            {delegations.length === 0 && !showDelForm ? (
              <p className="text-sm text-muted-foreground">Aucune personne autorisée enregistrée.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {delegations.map((d: any) => (
                  <div key={d.id} className="p-3 rounded-xl border border-border bg-white flex justify-between items-start gap-2">
                    <div className="text-sm min-w-0">
                      <p className="font-semibold text-foreground break-words">{d.nom}</p>
                      {d.relation  && <p className="text-xs text-muted-foreground">Lien : {d.relation}</p>}
                      {d.telephone && <p className="text-xs text-muted-foreground">Tél : {d.telephone}</p>}
                      {d.cin       && <p className="text-xs text-muted-foreground">CIN : {d.cin}</p>}
                    </div>
                    <button onClick={() => removeDelegation(d.id)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Personnes from inscription payload (fallback) */}
            {payload?.restrictions?.personnesAutorisees?.length > 0 && delegations.length === 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Depuis le formulaire d'inscription :</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {payload.restrictions.personnesAutorisees.map((p: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg border border-border bg-muted/20">
                      <p className="font-medium break-words">{p.name || "—"}</p>
                      {p.relationship && <p className="text-xs text-muted-foreground">Lien : {p.relationship}</p>}
                      {p.phone && <p className="text-xs text-muted-foreground">Tél : {p.phone}</p>}
                      {p.cin   && <p className="text-xs text-muted-foreground">CIN : {p.cin}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* ── Parents / tuteurs ───────────────────────────────────────── */}
          <Card className="p-4 sm:p-5">
            <h2 className="text-base font-semibold mb-3">👪 Parents / tuteurs</h2>

            {/* Payload tuteurs (avec CIN) priorité sur les DB tuteurs */}
            {Array.isArray(payload?.tuteurs) && payload.tuteurs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {payload.tuteurs.map((tut: any, i: number) => (
                  <div key={i} className="p-3 rounded-xl border border-border bg-white space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm break-words">{`${tut.prenom ?? ""} ${tut.nom ?? ""}`.trim() || "—"}</span>
                      <div className="flex gap-1 flex-shrink-0">
                        {tut.principal && <Badge className="bg-emerald-100 text-emerald-700 text-[11px]">Principal</Badge>}
                        {tut.lien && <Badge variant="outline" className="text-[11px]">{tut.lien}</Badge>}
                      </div>
                    </div>
                    {tut.cin       && <p className="text-xs text-muted-foreground">CIN : <span className="font-medium text-foreground">{tut.cin}</span></p>}
                    {tut.telephone && <p className="text-xs text-muted-foreground">Tél : {tut.telephone}</p>}
                    {tut.email     && <p className="text-xs text-muted-foreground break-all">Email : {tut.email}</p>}
                  </div>
                ))}
              </div>
            ) : tuteurs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tuteurs.map((tut: any) => (
                  <div key={tut.id} className="p-3 rounded-xl border border-border bg-white space-y-1">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className="font-medium text-sm break-words">{`${tut.prenom ?? ""} ${tut.nom ?? ""}`.trim() || tut.telephone || "—"}</span>
                      {tut.principal && <Badge className="bg-emerald-100 text-emerald-700 text-[11px] flex-shrink-0">Principal</Badge>}
                    </div>
                    {tut.lien      && <p className="text-xs text-muted-foreground">Lien : {tut.lien}</p>}
                    {tut.cin       && <p className="text-xs text-muted-foreground">CIN : <span className="font-medium text-foreground">{tut.cin}</span></p>}
                    {tut.telephone && <p className="text-xs text-muted-foreground">Tél : {tut.telephone}</p>}
                    {tut.email     && <p className="text-xs text-muted-foreground break-all">Email : {tut.email}</p>}
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">Aucun tuteur.</p>}

            {/* Infos famille (adresse + situation familiale) */}
            {(payload?.famille?.adresseFacturation || payload?.famille?.situationFamiliale) && (
              <div className="mt-3 pt-3 border-t border-border space-y-1">
                {payload?.famille?.situationFamiliale && (
                  <p className="text-xs text-muted-foreground">👨‍👩‍👧 Situation familiale : <span className="font-medium text-foreground">{payload.famille.situationFamiliale}</span></p>
                )}
                {payload?.famille?.adresseFacturation && (
                  <p className="text-xs text-muted-foreground">📍 Adresse : <span className="text-foreground">{payload.famille.adresseFacturation}</span></p>
                )}
              </div>
            )}
          </Card>

          {/* ── Dossier inscription ─────────────────────────────────────── */}
          {inscription && (
            <Card className="p-4 sm:p-5 space-y-3">
              <h2 className="text-base font-semibold">📄 Dossier d&apos;inscription</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <InfoRow label="Statut" value={inscription.statut} />
                <InfoRow label="Date" value={new Date(inscription.createdAt).toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" })} />
                {payload?.famille?.emailPrincipal && <InfoRow label="Email famille" value={payload.famille.emailPrincipal} />}
                {payload?.famille?.languePreferee && <InfoRow label="Langue" value={payload.famille.languePreferee === "fr" ? "Français" : "Arabe"} />}
              </div>

              {/* Restrictions / personnes autorisées depuis le formulaire */}
              {payload?.restrictions && (
                <div className="pt-2 border-t border-border">
                  {payload.restrictions.sansRestriction ? (
                    <p className="text-xs text-muted-foreground">✅ Toutes personnes autorisées à récupérer l&apos;enfant (sans restriction).</p>
                  ) : (
                    <>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Personnes autorisées (formulaire)</p>
                      {Array.isArray(payload.restrictions.personnesAutorisees) && payload.restrictions.personnesAutorisees.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {payload.restrictions.personnesAutorisees.map((p: { name?: string; relationship?: string; cin?: string; phone?: string }, i: number) => (
                            <div key={i} className="text-xs p-2.5 rounded-lg border border-border bg-muted/20">
                              <p className="font-medium">{p.name || "—"}</p>
                              {p.relationship && <p className="text-muted-foreground">Lien : {p.relationship}</p>}
                              {p.cin          && <p className="text-muted-foreground">CIN : {p.cin}</p>}
                              {p.phone        && <p className="text-muted-foreground">Tél : {p.phone}</p>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Aucune personne autorisée renseignée.</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </Card>
          )}

        </div>
      </div>

      {/* ── Edit modal ─────────────────────────────────────────────────────── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
              <div>
                <h2 className="font-bold text-base">Modifier la fiche enfant</h2>
                <p className="text-xs text-muted-foreground">{fullName}</p>
              </div>
              <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Prénom</label>
                  <Input value={editForm.prenom} onChange={e => setEditForm(p => ({ ...p, prenom: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Nom</label>
                  <Input value={editForm.nom} onChange={e => setEditForm(p => ({ ...p, nom: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Genre</label>
                <select className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                  value={editForm.genre} onChange={e => setEditForm(p => ({ ...p, genre: e.target.value }))}>
                  <option value="">— Non précisé —</option>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Classe assignée</label>
                <select className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                  value={editForm.classeId} onChange={e => setEditForm(p => ({ ...p, classeId: e.target.value }))}>
                  <option value="">— Aucune classe —</option>
                  {classes.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nom}{c.niveau ? ` (${c.niveau})` : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Photo</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) { alert("Image trop grande (max 5 Mo)"); return; }
                    const reader = new FileReader();
                    reader.onload = () => setEditForm(p => ({ ...p, photoUrl: reader.result as string }));
                    reader.readAsDataURL(file);
                  }}
                  className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary cursor-pointer"
                />
                {editForm.photoUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={editForm.photoUrl} alt="preview" className="w-14 h-14 rounded-xl object-cover border" />
                    <button type="button" onClick={() => setEditForm(p => ({ ...p, photoUrl: "" }))} className="text-xs text-destructive hover:underline">Supprimer</button>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Remarques admin</label>
                <textarea
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  value={editForm.remarques}
                  onChange={e => setEditForm(p => ({ ...p, remarques: e.target.value }))}
                  placeholder="Notes internes…"
                />
              </div>
              {editErr && <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{editErr}</p>}
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t bg-muted/20">
              <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>Annuler</Button>
              <Button onClick={saveEdit} disabled={saving} className="flex items-center gap-1.5">
                <Save className="w-4 h-4" />{saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">{label} : </span>
      <span className="font-medium break-all">{value}</span>
    </p>
  );
}

