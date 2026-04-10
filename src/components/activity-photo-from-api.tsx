"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api"

type Props = {
  photoId: string
  alt?: string
  /** Classes CSS pour la balise <img> (ex. w-full h-32 object-cover) */
  imgClassName?: string
  /** Lien vers l’image en plein écran (blob URL, même onglet autorisé par le navigateur) */
  linkToFull?: boolean
}

/**
 * Charge une photo d’activité via l’API (JWT) ; les listes ne renvoient plus d’URL publique.
 */
export function ActivityPhotoFromApi({ photoId, alt = "", imgClassName, linkToFull }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null
    ;(async () => {
      try {
        const res = await apiClient.getClassActivityPhotoFile(photoId)
        const ct =
          (res.headers["content-type"] as string | undefined) ??
          (res.headers["Content-Type"] as string | undefined) ??
          "image/jpeg"
        const blob = new Blob([res.data], { type: ct })
        objectUrl = URL.createObjectURL(blob)
        if (!cancelled) setUrl(objectUrl)
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [photoId])

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 text-gray-400 text-xs ${imgClassName ?? ""}`}
        role="img"
        aria-label={alt || "Photo indisponible"}
      >
        —
      </div>
    )
  }

  if (!url) {
    return <div className={`animate-pulse bg-gray-100 ${imgClassName ?? ""}`} aria-hidden />
  }

  const img = <img src={url} alt={alt} className={imgClassName} />
  if (linkToFull) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        {img}
      </a>
    )
  }
  return img
}
