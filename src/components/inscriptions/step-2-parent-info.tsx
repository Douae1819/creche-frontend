"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Step2Props {
  formData: any
  updateFormData: (data: any) => void
  showErrors?: boolean
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^(0[5-7]\d{8}|\+212[5-7]\d{8}|00212[5-7]\d{8})$/
const CIN_RE   = /^[A-Za-z]{1,2}[0-9]{4,8}$/

function validateParent(prefix: "mother" | "father", f: any) {
  const errs: Record<string, string> = {}
  const p = (k: string) => `${prefix}${k.charAt(0).toUpperCase() + k.slice(1)}`

  const hasAny = f[p("firstName")] || f[p("lastName")] || f[p("Email")] || f[p("Phone")]

  if (hasAny) {
    if (f[p("Email")] && !EMAIL_RE.test(f[p("Email")]))
      errs[p("Email")] = "Adresse e-mail invalide (ex : parent@email.com)."
    if (f[p("Phone")] && !PHONE_RE.test(f[p("Phone")]))
      errs[p("Phone")] = "Numéro invalide — format marocain attendu (ex : 0612345678)."
    if (f[p("Cin")] && !CIN_RE.test(f[p("Cin")]))
      errs[p("Cin")] = "CIN invalide (ex : AB123456 ou A123456)."
  }
  return errs
}

function validateStep2(f: any) {
  const errs: Record<string, string> = {
    ...validateParent("mother", f),
    ...validateParent("father", f),
  }
  const hasEmail = f.motherEmail.trim() || f.fatherEmail.trim()
  if (!hasEmail)
    errs._global = "L'e-mail d'au moins un parent est obligatoire."
  if (!f.declarationHonneur)
    errs.declarationHonneur = "La déclaration sur l'honneur est obligatoire."
  return errs
}

function ParentSection({
  title, prefix, formData, updateFormData, isResponsable, onSetResponsable,
  touched, touch, showErrors,
}: {
  title: string
  prefix: "mother" | "father"
  formData: any
  updateFormData: (data: any) => void
  isResponsable: boolean
  onSetResponsable: () => void
  touched: Record<string, boolean>
  touch: (field: string) => void
  showErrors?: boolean
}) {
  const p = (k: string) => `${prefix}${k.charAt(0).toUpperCase() + k.slice(1)}`
  const errs = { ...validateParent("mother", formData), ...validateParent("father", formData) }
  const show = (field: string) => touched[field] || !!showErrors
  const FieldError = ({ field }: { field: string }) =>
    show(field) && errs[field] ? <p className="text-xs text-red-500 mt-1">{errs[field]}</p> : null
  const inputCls = (field: string) =>
    `mt-1 ${show(field) && errs[field] ? "border-red-400 focus-visible:ring-red-300" : ""}`

  return (
    <div className="space-y-4 pb-6 border-b border-border last:border-0 last:pb-0">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="responsablePrincipal"
            checked={isResponsable}
            onChange={onSetResponsable}
            className="w-4 h-4 accent-primary"
          />
          <span className={`text-xs font-medium ${isResponsable ? "text-primary" : "text-muted-foreground"}`}>
            {isResponsable ? "✓ Responsable principal" : "Définir comme responsable principal"}
          </span>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Prénom</Label>
          <Input
            placeholder="Ex : Amina"
            value={formData[p("firstName")] ?? ""}
            onChange={(e) => updateFormData({ [p("firstName")]: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-sm font-medium">Nom</Label>
          <Input
            placeholder="Ex : Tazi"
            value={formData[p("lastName")] ?? ""}
            onChange={(e) => updateFormData({ [p("lastName")]: e.target.value })}
            className="mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">CIN</Label>
          <Input
            placeholder="Ex : AB123456"
            value={formData[p("Cin")] ?? ""}
            onChange={(e) => updateFormData({ [p("Cin")]: e.target.value })}
            onBlur={() => touch(p("Cin"))}
            className={inputCls(p("Cin"))}
          />
          <FieldError field={p("Cin")} />
        </div>
        <div>
          <Label className="text-sm font-medium">Téléphone</Label>
          <Input
            placeholder="Ex : 0612345678"
            inputMode="tel"
            value={formData[p("Phone")] ?? ""}
            onChange={(e) => updateFormData({ [p("Phone")]: e.target.value })}
            onBlur={() => touch(p("Phone"))}
            className={inputCls(p("Phone"))}
          />
          <FieldError field={p("Phone")} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">
            E-mail {prefix === "mother" ? <span className="text-red-500">*</span> : null}
          </Label>
          <Input
            type="email"
            placeholder="Ex : parent@email.com"
            value={formData[p("Email")] ?? ""}
            onChange={(e) => updateFormData({ [p("Email")]: e.target.value })}
            onBlur={() => touch(p("Email"))}
            className={inputCls(p("Email"))}
          />
          <FieldError field={p("Email")} />
        </div>
        <div>
          <Label className="text-sm font-medium">Profession</Label>
          <Input
            placeholder="Ex : Médecin"
            value={formData[p("Profession")] ?? ""}
            onChange={(e) => updateFormData({ [p("Profession")]: e.target.value })}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Adresse</Label>
        <Input
          placeholder="Ex : 123 Rue de la Paix, Casablanca"
          value={formData[p("Address")] ?? ""}
          onChange={(e) => updateFormData({ [p("Address")]: e.target.value })}
          className="mt-1"
        />
      </div>
    </div>
  )
}

export default function Step2ParentInfo({ formData, updateFormData, showErrors }: Step2Props) {
  const familySituations = ["Mariés", "Divorcés", "Séparés", "Union libre"]
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const touch = (field: string) => setTouched(prev => ({ ...prev, [field]: true }))

  const errs = validateStep2(formData)
  const showDecl = touched.declarationHonneur || !!showErrors

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-1">
          <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
          </svg>
          Informations des parents / tuteurs
        </h2>
        <p className="text-sm text-muted-foreground">
          Au moins un parent doit avoir un e-mail. Les champs <span className="text-red-500">*</span> sont obligatoires.
        </p>
      </div>

      {showErrors && errs._global && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {errs._global}
        </div>
      )}

      <ParentSection
        title="Mère"
        prefix="mother"
        formData={formData}
        updateFormData={updateFormData}
        isResponsable={formData.responsablePrincipal === "mother"}
        onSetResponsable={() => updateFormData({ responsablePrincipal: "mother" })}
        touched={touched}
        touch={touch}
        showErrors={showErrors}
      />

      <ParentSection
        title="Père"
        prefix="father"
        formData={formData}
        updateFormData={updateFormData}
        isResponsable={formData.responsablePrincipal === "father"}
        onSetResponsable={() => updateFormData({ responsablePrincipal: "father" })}
        touched={touched}
        touch={touch}
        showErrors={showErrors}
      />

      {/* Situation familiale */}
      <div>
        <Label className="text-sm font-medium">Situation familiale</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
          {familySituations.map((situation) => (
            <label
              key={situation}
              className={`flex items-center justify-center p-2.5 rounded-lg border cursor-pointer transition-all text-sm font-medium text-center ${
                formData.familySituation === situation
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-background border-border hover:border-primary/50"
              }`}
            >
              <input
                type="radio"
                name="familySituation"
                value={situation}
                checked={formData.familySituation === situation}
                onChange={(e) => updateFormData({ familySituation: e.target.value })}
                className="sr-only"
              />
              {situation}
            </label>
          ))}
        </div>
      </div>

      {/* Déclaration sur l'honneur */}
      <div className={`p-4 rounded-xl border-2 space-y-3 ${
        showDecl && errs.declarationHonneur
          ? "border-red-300 bg-red-50"
          : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20"
      }`}>
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-2">
          <span>⚖️</span> Déclaration sur l'honneur
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-500 leading-relaxed">
          Cette déclaration est requise pour valider votre dossier d'inscription.
        </p>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={formData.declarationHonneur ?? false}
            onChange={(e) => {
              updateFormData({ declarationHonneur: e.target.checked })
              touch("declarationHonneur")
            }}
            onBlur={() => touch("declarationHonneur")}
            className="w-5 h-5 rounded accent-amber-600 mt-0.5 flex-shrink-0"
          />
          <span className="text-sm font-medium text-amber-800 dark:text-amber-400 leading-relaxed">
            Je soussigné(e), représentant(e) légal(e) de l'enfant, déclare sur l'honneur l'exactitude
            des informations fournies dans ce formulaire d'inscription.{" "}
            <span className="text-red-500">*</span>
          </span>
        </label>
        {showDecl && errs.declarationHonneur && (
          <p className="text-xs text-red-600 font-medium">{errs.declarationHonneur}</p>
        )}
      </div>
    </div>
  )
}
