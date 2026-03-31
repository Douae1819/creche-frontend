"use client"

import { use, useState, FormEvent } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
import { AxiosError } from "axios"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { useTranslations } from "next-intl"
import { Locale } from "@/lib/i18n/config"
import { Mail, Lock, LogIn } from "lucide-react"
import { apiClient } from "@/lib/api"
import { useAuthStore } from "@/modules/auth/store"

export default function Home({ params }: { params: Promise<{ locale: Locale }> }) {
  const resolvedParams = use(params)
  const currentLocale = resolvedParams.locale
  const t = useTranslations("home")
  const router = useRouter()
  const clearAuthStore = useAuthStore((s) => s.logout)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)

    const emailValue = email.trim()

    try {
      // 1) Essayer d'abord le login ADMIN
      try {
        const { data } = await apiClient.loginAdmin(emailValue, password)

        const { accessToken, refreshToken } = data as {
          accessToken: string
          refreshToken?: string
        }
        clearAuthStore() // Purge previous session from localStorage
        Cookies.set("token", accessToken, { expires: 7 })
        Cookies.set("auth_token", accessToken, { expires: 7 })
        if (refreshToken) Cookies.set("refresh_token", refreshToken, { expires: 7 })

        router.push(`/${currentLocale}/admin`)
        return
      } catch (error) {
        // Si ce n'est pas une erreur "auth" claire, on la remonte
        const status = (error as AxiosError).response?.status
        if (status && status !== 400 && status !== 401 && status !== 403) {
          throw error
        }
        // Sinon on continue avec loginUser
      }

      // 2) Essayer le loginUser (parent / enseignant / admin via cet endpoint)
      const { data } = await apiClient.loginUser(emailValue, password)

      const { accessToken, refreshToken, role } = data as {
        accessToken: string
        refreshToken?: string
        role?: string
      }
      const normalizedRole = String(role || "").toUpperCase()

      clearAuthStore() // Purge previous session from localStorage
      Cookies.set("token", accessToken, { expires: 7 })
      Cookies.set("auth_token", accessToken, { expires: 7 })
      if (refreshToken) Cookies.set("refresh_token", refreshToken, { expires: 7 })

      // Redirection selon le rôle
      if (normalizedRole === "PARENT") {
        router.push(`/${currentLocale}/parent`)
      } else if (normalizedRole === "ENSEIGNANT") {
        router.push(`/${currentLocale}/teacher`)
      } else if (normalizedRole === "ADMIN" || normalizedRole === "SUPER_ADMIN") {
        router.push(`/${currentLocale}/admin`)
      } else {
        // Fallback : page d accueil locale
        router.push(`/${currentLocale}`)
      }
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? ((error.response?.data as { message?: string })?.message || "Identifiants invalides")
          : "Impossible de se connecter."
      // eslint-disable-next-line no-alert
      alert(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#AEDFF7]/30 via-[#FFF7ED] to-[#FF6F61]/25 flex items-center justify-center px-4 py-8">
      <div className="container mx-auto">
        <div className="flex justify-end mb-6">
          <LanguageSwitcher currentLocale={currentLocale} />
        </div>

        <div className="max-w-md mx-auto">
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-full overflow-hidden mb-4 shadow-md bg-white">
              <Image
                src="/Group 13.svg"
                alt="Logo PetitsPas"
                width={80}
                height={80}
              />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-1 tracking-tight">
              {t("title")}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground text-center max-w-xs">
              {t("subtitle")}
            </p>
          </div>

          <Card className="p-6 md:p-7 bg-white shadow-md rounded-2xl">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2 text-left">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                    placeholder="exemple@thepetitspas.com"
                  />
                </div>
              </div>

              <div className="space-y-2 text-left">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full mt-2 bg-[#FF6F61] hover:bg-[#e45f54] text-white font-semibold rounded-xl py-2.5"
                disabled={isSubmitting}
              >
                <><LogIn className="w-4 h-4 mr-2" />{isSubmitting ? "Connexion…" : "Se connecter"}</>
              </Button>
            </form>

            <div className="mt-4 text-center text-xs md:text-sm text-muted-foreground">
              <span>Pas encore inscrit ? </span>
              <Link
                href={`/${currentLocale}/inscriptions`}
                className="text-primary hover:underline"
              >
                Accéder au formulaire d inscription
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </main>
  )
}
