"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SidebarNew } from "@/components/layout/sidebar-new"
import { apiClient } from "@/lib/api"
import type { Locale } from "@/lib/i18n/config"

type ClasseItem = { id: string; nom: string; niveau?: string | null }

const LIEN_LABELS: Record<string, string> = {
  Mere: "Mère", Pere: "Père", Tuteur: "Tuteur/Tutrice",
  GrandMere: "Grand-mère", GrandPere: "Grand-père", Autre: "Autre",
}
const formatLien = (lien?: string | null): string =>
  (lien && LIEN_LABELS[lien]) ? LIEN_LABELS[lien] : (lien ?? "—")

interface AdminInscriptionDetailProps {
  params: Promise<{ locale: Locale; id: string }>
}

export default function AdminInscriptionDetailPage({ params }: AdminInscriptionDetailProps) {
  const resolvedParams = use(params)
  const { id, locale } = resolvedParams
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inscription, setInscription] = useState<any | null>(null)
  const [classes, setClasses] = useState<ClasseItem[]>([])

  useEffect(() => {
    let cancelled = false
    async function fetchAll() {
      try {
        setLoading(true)
        setError(null)
        const [inscRes, classesRes] = await Promise.all([
          apiClient.getAdminInscription(id),
          apiClient.listClasses().catch(() => ({ data: [] })),
        ])
        if (!cancelled) {
          setInscription(inscRes.data)
          const raw = classesRes.data
          const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : (raw?.items ?? []))
          setClasses(list)
        }
      } catch (err: any) {
        console.error("[Admin/InscriptionDetail] Error loading inscription", err)
        if (!cancelled) setError("Impossible de charger le détail de l'inscription.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchAll()
    return () => { cancelled = true }
  }, [id])

  const goBack = () => router.push(`/${locale}/admin/inscriptions`)

  const statusColors: Record<string, string> = {
    ACTIF: "bg-green-100 text-green-700 border-green-200",
    CANDIDATURE: "bg-yellow-100 text-yellow-700 border-yellow-200",
    EN_COURS: "bg-blue-100 text-blue-700 border-blue-200",
    REJETEE: "bg-red-100 text-red-700 border-red-200",
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    )
  }

  if (error || !inscription) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center flex-col gap-4">
        <p className="text-sm text-destructive">{error ?? "Inscription introuvable."}</p>
        <Button variant="outline" onClick={goBack}>← Retour aux inscriptions</Button>
      </div>
    )
  }

  const statut = inscription.statut as string | undefined
  const badgeClass = statusColors[statut ?? ""] ?? "bg-gray-100 text-gray-700 border-gray-200"

  const payload = inscription.payload ?? {}
  const enfant = payload.enfant ?? {}
  const photo = payload.childPhotoBase64 ?? null
  const famille = payload.famille ?? {}
  const sante = payload.sante ?? {}
  const restrictions = payload.restrictions ?? {}
  const personnesAutorisees: any[] = restrictions.personnesAutorisees ?? []
  const sansRestriction: boolean = restrictions.sansRestriction ?? false
  const parents = inscription.parents ?? []
  type TuteurRow = { prenom?: string; nom?: string; lien?: string; email?: string; telephone?: string; cin?: string; profession?: string; adresse?: string; principal?: boolean }
  const payloadTuteurs: TuteurRow[] = payload.tuteurs ?? []

  // Résoudre l'ID de classe en nom
  const classeIdSouhaitee: string | undefined = payload.classeIdSouhaitee ?? enfant.classeIdSouhaitee
  const classeFound = classeIdSouhaitee ? classes.find((c) => c.id === classeIdSouhaitee) : undefined
  const classeNom = classeFound
    ? `${classeFound.nom}${classeFound.niveau ? ` (${classeFound.niveau})` : ""}`
    : classeIdSouhaitee

  const tagsMaladies: string[] = sante.tagsMaladies ?? []
  const tagsAllergies: string[] = sante.tagsAllergies ?? []
  const tagsIntolerances: string[] = sante.tagsIntolerances ?? []
  const tagsSuivi: string[] = sante.tagsSuivi ?? []
  const restrictionAlimentaire: string | null = sante.restrictionAlimentaire ?? payload.restrictionAlimentaire ?? null
  const hasHealthTags = tagsMaladies.length + tagsAllergies.length + tagsIntolerances.length + tagsSuivi.length > 0

  const TagList = ({ tags, colorClass }: { tags: string[]; colorClass: string }) => (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span key={tag} className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
          {tag}
        </span>
      ))}
    </div>
  )

  const Field = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="flex justify-between gap-4 py-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%] break-words">{value || "—"}</span>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SidebarNew currentLocale={locale} />

      <div className="flex-1 md:ml-64 p-4 md:p-8 pt-16 md:pt-8">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dossier d'inscription</h1>
              <p className="text-xs text-muted-foreground mt-1">ID: {inscription.id}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border uppercase ${badgeClass}`}>
                {statut ?? "Inconnu"}
              </span>
              <Button variant="outline" size="sm" onClick={goBack}>← Retour</Button>
            </div>
          </div>

          {/* Enfant — Photo + infos de base */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Enfant
            </h2>
            <div className="flex items-start gap-5 flex-wrap">
              {/* Photo */}
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-muted flex-shrink-0 border">
                {photo ? (
                  <img src={photo} alt="Photo enfant" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-muted-foreground bg-sky-50">
                    {enfant.prenom?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="text-xl font-bold text-foreground">
                  {`${enfant.prenom ?? ""} ${enfant.nom ?? ""}`.trim() || "Nom inconnu"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Inscrit le {new Date(inscription.createdAt).toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" })}
                </p>
                <div className="mt-3 divide-y divide-border">
                  <Field label="Date de naissance" value={enfant.dateNaissance} />
                  <Field label="Genre" value={enfant.genre} />
                  {enfant.fraternity && <Field label="Fratrie" value={enfant.fraternity} />}
                  {enfant.rankInFraternity && <Field label="Rang dans la fratrie" value={enfant.rankInFraternity} />}
                  <Field label="Classe souhaitée" value={classeNom} />
                  {famille.adresseFacturation && (
                    <Field label="Adresse facturation" value={famille.adresseFacturation} />
                  )}
                  {famille.languePreferee && (
                    <Field label="Langue préférée" value={famille.languePreferee} />
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Parents / Tuteurs */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Parents / Tuteurs
            </h2>
            {/* Utilise les tuteurs du payload (CANDIDATURE) ou les parents DB (ACTIF) */}
            {(payloadTuteurs.length > 0 ? payloadTuteurs : parents).length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun parent associé à ce dossier.</p>
            ) : (
              <div className="space-y-4">
                {(payloadTuteurs.length > 0 ? payloadTuteurs : parents as TuteurRow[]).map((p, idx) => (
                  <div key={idx} className="rounded-lg border bg-background p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <p className="font-semibold text-foreground">
                        {`${p.prenom ?? ""} ${p.nom ?? ""}`.trim() || "—"}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">{formatLien(p.lien)}</span>
                        {p.principal && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            Responsable principal
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="divide-y divide-border">
                      <Field label="Email" value={p.email} />
                      <Field label="Téléphone" value={p.telephone} />
                      {p.cin && <Field label="CIN" value={p.cin} />}
                      <Field label="Profession" value={p.profession} />
                      <Field label="Adresse" value={p.adresse} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Santé */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Profil Santé
            </h2>
            {!hasHealthTags && !restrictionAlimentaire ? (
              <p className="text-xs text-muted-foreground">Aucune information de santé déclarée.</p>
            ) : (
              <div className="space-y-4">
                {tagsMaladies.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Maladies / Antécédents</p>
                    <TagList tags={tagsMaladies} colorClass="bg-red-50 text-red-700 border-red-200" />
                  </div>
                )}
                {tagsAllergies.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Allergies</p>
                    <TagList tags={tagsAllergies} colorClass="bg-orange-50 text-orange-700 border-orange-200" />
                  </div>
                )}
                {tagsIntolerances.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Intolérances</p>
                    <TagList tags={tagsIntolerances} colorClass="bg-amber-50 text-amber-700 border-amber-200" />
                  </div>
                )}
                {tagsSuivi.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Suivi médical</p>
                    <TagList tags={tagsSuivi} colorClass="bg-blue-50 text-blue-700 border-blue-200" />
                  </div>
                )}
                {restrictionAlimentaire && (
                  <div className="pt-2 divide-y divide-border">
                    <Field label="Restriction alimentaire" value={restrictionAlimentaire} />
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Personnes autorisées */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Personnes autorisées à récupérer l'enfant
            </h2>
            {sansRestriction ? (
              <p className="text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200 inline-block">
                ✓ Sans restriction — tout représentant légal peut récupérer l'enfant
              </p>
            ) : personnesAutorisees.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucune personne autorisée déclarée.</p>
            ) : (
              <div className="space-y-3">
                {personnesAutorisees.map((p: any, idx: number) => (
                  <div key={idx} className="rounded-lg border bg-background p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="font-semibold text-foreground text-sm">{p.nom ?? "—"}</p>
                      {p.relation && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {p.relation}
                        </span>
                      )}
                    </div>
                    <div className="divide-y divide-border">
                      {p.cin && <Field label="CIN" value={p.cin} />}
                      {p.telephone && <Field label="Téléphone" value={p.telephone} />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Déclarations */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Déclarations & Confirmations
            </h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`w-4 h-4 flex-shrink-0 rounded text-xs flex items-center justify-center font-bold ${payload.declarationHonneur ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
                  {payload.declarationHonneur ? "✓" : "—"}
                </span>
                <span className="text-sm">Déclaration sur l'honneur signée</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-4 h-4 flex-shrink-0 rounded text-xs flex items-center justify-center font-bold ${payload.confirmationExacte ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
                  {payload.confirmationExacte ? "✓" : "—"}
                </span>
                <span className="text-sm">Règlement intérieur accepté</span>
              </div>
            </div>
          </Card>

          {/* Notes admin */}
          {inscription.notes && (
            <Card className="p-6">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Notes administratives
              </h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{inscription.notes}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
