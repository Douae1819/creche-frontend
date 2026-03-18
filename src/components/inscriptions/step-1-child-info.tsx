"use client"

import { useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Step1Props {
  formData: any
  updateFormData: (data: any) => void
  classes?: { id: string; nom: string; complet?: boolean; nbEnfants?: number; capacite?: number }[]
  showErrors?: boolean
}

const NAME_RE = /^[\u00C0-\u017Ea-zA-Z' -]+$/

function validateStep1(f: any) {
  const errs: Record<string, string> = {}

  if (!f.childFirstName.trim())
    errs.childFirstName = "Le prénom de l'enfant est obligatoire."
  else if (!NAME_RE.test(f.childFirstName.trim()))
    errs.childFirstName = "Prénom invalide — lettres et espaces uniquement."

  if (!f.childLastName.trim())
    errs.childLastName = "Le nom de l'enfant est obligatoire."
  else if (!NAME_RE.test(f.childLastName.trim()))
    errs.childLastName = "Nom invalide — lettres et espaces uniquement."

  if (!f.dateOfBirth) {
    errs.dateOfBirth = "La date de naissance est obligatoire."
  } else {
    const dob = new Date(f.dateOfBirth)
    const ageYears = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    if (isNaN(dob.getTime()))
      errs.dateOfBirth = "Date invalide."
    else if (ageYears < 0.5)
      errs.dateOfBirth = "L'enfant doit avoir au moins 6 mois."
    else if (ageYears > 7)
      errs.dateOfBirth = "Âge trop élevé pour une inscription en crèche/maternelle (max 6 ans)."
  }

  if (!f.classeIdSouhaitee)
    errs.classeIdSouhaitee = "Veuillez sélectionner une classe."

  if (f.fraternity && !/^\d+$/.test(f.fraternity))
    errs.fraternity = "Nombre entier uniquement (ex : 2)."

  if (f.rankInFraternity && !/^\d+$/.test(f.rankInFraternity))
    errs.rankInFraternity = "Nombre entier uniquement (ex : 1)."
  else if (
    f.rankInFraternity && f.fraternity &&
    parseInt(f.rankInFraternity) > parseInt(f.fraternity)
  )
    errs.rankInFraternity = `Le rang ne peut pas dépasser la taille de la fratrie (${f.fraternity}).`

  return errs
}

async function compressImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const MAX = 800
      let { width, height } = img
      if (width > MAX) { height = Math.round(height * MAX / width); width = MAX }
      if (height > MAX) { width = Math.round(width * MAX / height); height = MAX }
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL("image/jpeg", 0.72))
    }
    img.src = dataUrl
  })
}

export default function Step1ChildInfo({ formData, updateFormData, classes, showErrors }: Step1Props) {
  const activities = ["Garderie de 16h45 à 18h", "Atelier du mercredi"]
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [photoError, setPhotoError] = useState<string | null>(null)

  const touch = (field: string) => setTouched(prev => ({ ...prev, [field]: true }))
  const show = (field: string) => touched[field] || !!showErrors
  const errs = validateStep1(formData)

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoError(null)

    const allowed = ["image/jpeg", "image/png", "image/webp"]
    if (!allowed.includes(file.type)) {
      setPhotoError("Format non supporté — utilisez JPEG, PNG ou WEBP.")
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setPhotoError("Photo trop volumineuse (max 8 Mo avant compression).")
      return
    }

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const raw = ev.target?.result as string
      const compressed = await compressImage(raw)
      // Rough size check on base64 (~0.75 ratio)
      const approxKB = Math.round((compressed.length * 0.75) / 1024)
      if (approxKB > 800) {
        setPhotoError(`Photo encore trop grande après compression (${approxKB} Ko). Choisissez une image plus petite.`)
        return
      }
      updateFormData({ childPhotoBase64: compressed, childPhotoFile: file.name })
    }
    reader.readAsDataURL(file)
  }

  const FieldError = ({ field }: { field: string }) =>
    show(field) && errs[field]
      ? <p className="text-xs text-red-500 mt-1">{errs[field]}</p>
      : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-1">
          <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
          </svg>
          Informations de l'enfant
        </h2>
        <p className="text-sm text-muted-foreground">Les champs <span className="text-red-500">*</span> sont obligatoires.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="childFirstName" className="text-sm font-medium">
            Prénom <span className="text-red-500">*</span>
          </Label>
          <Input
            id="childFirstName"
            placeholder="Ex: Mohammed Amine"
            value={formData.childFirstName}
            onChange={(e) => updateFormData({ childFirstName: e.target.value })}
            onBlur={() => touch("childFirstName")}
            className={`mt-2 ${show("childFirstName") && errs.childFirstName ? "border-red-400 focus-visible:ring-red-300" : ""}`}
          />
          <FieldError field="childFirstName" />
        </div>
        <div>
          <Label htmlFor="childLastName" className="text-sm font-medium">
            Nom <span className="text-red-500">*</span>
          </Label>
          <Input
            id="childLastName"
            placeholder="Ex: Bennani"
            value={formData.childLastName}
            onChange={(e) => updateFormData({ childLastName: e.target.value })}
            onBlur={() => touch("childLastName")}
            className={`mt-2 ${show("childLastName") && errs.childLastName ? "border-red-400 focus-visible:ring-red-300" : ""}`}
          />
          <FieldError field="childLastName" />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="dateOfBirth" className="text-sm font-medium">
            Date de naissance <span className="text-red-500">*</span>
          </Label>
          <Input
            id="dateOfBirth"
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => updateFormData({ dateOfBirth: e.target.value })}
            onBlur={() => touch("dateOfBirth")}
            className={`mt-2 ${show("dateOfBirth") && errs.dateOfBirth ? "border-red-400 focus-visible:ring-red-300" : ""}`}
          />
          <FieldError field="dateOfBirth" />
        </div>
        <div>
          <Label htmlFor="fraternity" className="text-sm font-medium">Taille de la fratrie</Label>
          <Input
            id="fraternity"
            placeholder="Ex: 3"
            inputMode="numeric"
            value={formData.fraternity}
            onChange={(e) => updateFormData({ fraternity: e.target.value })}
            onBlur={() => touch("fraternity")}
            className={`mt-2 ${show("fraternity") && errs.fraternity ? "border-red-400" : ""}`}
          />
          <FieldError field="fraternity" />
        </div>
        <div>
          <Label htmlFor="rankInFraternity" className="text-sm font-medium">Rang dans la fratrie</Label>
          <Input
            id="rankInFraternity"
            placeholder="Ex: 1"
            inputMode="numeric"
            value={formData.rankInFraternity}
            onChange={(e) => updateFormData({ rankInFraternity: e.target.value })}
            onBlur={() => touch("rankInFraternity")}
            className={`mt-2 ${show("rankInFraternity") && errs.rankInFraternity ? "border-red-400" : ""}`}
          />
          <FieldError field="rankInFraternity" />
        </div>
      </div>

      {/* Photo */}
      <div>
        <Label className="text-sm font-medium">Photo de l'enfant</Label>
        <div className="mt-2 flex items-start gap-4">
          <div
            className="w-24 h-24 rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center cursor-pointer overflow-hidden hover:border-primary/50 transition-colors flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
          >
            {formData.childPhotoBase64 ? (
              <img src={formData.childPhotoBase64} alt="Photo enfant" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-2">
                <svg className="w-8 h-8 text-muted-foreground mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-xs text-muted-foreground">Ajouter</span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-primary hover:underline font-medium"
            >
              {formData.childPhotoBase64 ? "Changer la photo" : "Choisir une photo"}
            </button>
            <p className="text-xs text-muted-foreground mt-1">
              JPEG, PNG ou WEBP · Max 8 Mo · Réduite automatiquement avant envoi
            </p>
            {formData.childPhotoFile && !photoError && (
              <p className="text-xs text-green-600 mt-1">✓ {formData.childPhotoFile}</p>
            )}
            {photoError && (
              <p className="text-xs text-red-500 mt-1">{photoError}</p>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>
      </div>

      {/* Classe */}
      <div>
        <Label htmlFor="classeIdSouhaitee" className="text-sm font-medium">
          Classe souhaitée <span className="text-red-500">*</span>
        </Label>
        <select
          id="classeIdSouhaitee"
          className={`mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm ${
            show("classeIdSouhaitee") && errs.classeIdSouhaitee ? "border-red-400" : "border-border"
          }`}
          value={formData.classeIdSouhaitee}
          onChange={(e) => { updateFormData({ classeIdSouhaitee: e.target.value }); touch("classeIdSouhaitee") }}
          onBlur={() => touch("classeIdSouhaitee")}
        >
          <option value="" disabled>Choisir une classe</option>
          {classes && classes.length > 0 ? (
            classes.map((c) => (
              <option key={c.id} value={c.id} disabled={c.complet}>
                {c.nom}{c.complet ? " — Complet" : c.capacite ? ` (${c.nbEnfants ?? 0}/${c.capacite})` : ""}
              </option>
            ))
          ) : (
            <>
              <option value="TPS">TPS — Toute Petite Section (18 mois – 2 ans)</option>
              <option value="PS">PS — Petite Section (2 – 3 ans)</option>
              <option value="MS">MS — Moyenne Section (3 – 4 ans)</option>
              <option value="GS">GS — Grande Section (4 – 5 ans)</option>
            </>
          )}
        </select>
        <FieldError field="classeIdSouhaitee" />
      </div>

      {/* Activités */}
      <div>
        <h3 className="font-medium text-foreground mb-3">Activités sélectionnées</h3>
        <div className="space-y-2">
          {activities.map((activity) => (
            <label
              key={activity}
              className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border cursor-pointer hover:border-primary/50 transition-colors"
            >
              <input
                type="checkbox"
                checked={formData.selectedActivities.includes(activity)}
                onChange={(e) => {
                  updateFormData({
                    selectedActivities: e.target.checked
                      ? [...formData.selectedActivities, activity]
                      : formData.selectedActivities.filter((a: string) => a !== activity),
                  })
                }}
                className="w-4 h-4 rounded accent-secondary"
              />
              <span className="text-sm font-medium">{activity}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
