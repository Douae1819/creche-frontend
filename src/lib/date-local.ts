/**
 * Date calendrier locale YYYY-MM-DD.
 * Préférer à `d.toISOString().slice(0, 10)` pour les appels API filtrés par jour
 * (sinon décalage d’un jour selon le fuseau, ex. Maroc / Europe).
 */
export function formatLocalDateKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

const YMD = /^\d{4}-\d{2}-\d{2}$/

/**
 * Affichage parent / résumé : évite "Invalid Date" si l’API renvoie date absente,
 * format exotique ou enveloppes `{ data: … }` mal déballées.
 */
export function safeDateForLocaleDisplay(
  dateUnknown: unknown,
  requestedYmd?: string | null,
): Date | null {
  const ymd =
    typeof requestedYmd === "string" && YMD.test(requestedYmd.trim())
      ? requestedYmd.trim()
      : null
  if (ymd) {
    const d = new Date(`${ymd}T12:00:00`)
    if (!Number.isNaN(d.getTime())) return d
  }
  if (dateUnknown == null || dateUnknown === "") return ymd ? new Date(`${ymd}T12:00:00`) : null
  if (typeof dateUnknown === "number" && Number.isFinite(dateUnknown)) {
    const d = new Date(dateUnknown)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof dateUnknown === "string") {
    const t = dateUnknown.trim()
    if (!t) return null
    const d = new Date(t)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (dateUnknown instanceof Date) {
    return Number.isNaN(dateUnknown.getTime()) ? null : dateUnknown
  }
  return null
}
