"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function TeacherSummary() {
  const [summaryData] = useState({
    date: new Date().toLocaleDateString("fr-FR"),
    class: "Salle Bleue",
    totalChildren: 32,
    present: 28,
    absent: 4,
    observations: 12,
  })

  const [appetiteStats] = useState({
    "un peu": 3,
    bien: 20,
    tout: 5,
  })

  const [moodStats] = useState({
    mauvaise: 1,
    bonne: 22,
    excellente: 5,
  })

  const [participationStats] = useState({
    faible: 2,
    bonne: 20,
    excellente: 6,
  })

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Résumé de la journée</h1>
          <p className="text-gray-600 mt-1">
            {summaryData.class} • {summaryData.date}
          </p>
        </div>
        <Link href="/teacher">
          <Button variant="outline" className="rounded-lg bg-transparent">
            ← Retour
          </Button>
        </Link>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 bg-gradient-to-br from-sky-50 to-sky-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-4xl font-bold text-sky-700 mt-2">{summaryData.totalChildren}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Présents</p>
              <p className="text-4xl font-bold text-green-700 mt-2">{summaryData.present}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-red-50 to-red-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Absents</p>
              <p className="text-4xl font-bold text-red-700 mt-2">{summaryData.absent}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Observations</p>
              <p className="text-4xl font-bold text-purple-700 mt-2">{summaryData.observations}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Appetite */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-transparent pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              <span>🍽️</span> Appétit
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            {Object.entries(appetiteStats).map(([label, count]) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 capitalize">{label}</span>
                  <span className="text-lg font-bold text-gray-900">{count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-orange-400 h-2 rounded-full"
                    style={{ width: `${(count / summaryData.present) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Mood */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-transparent pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              <span>😄</span> Humeur
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            {Object.entries(moodStats).map(([label, count]) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 capitalize">{label}</span>
                  <span className="text-lg font-bold text-gray-900">{count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full"
                    style={{ width: `${(count / summaryData.present) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Participation */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-transparent pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              <span>🎯</span> Participation
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            {Object.entries(participationStats).map(([label, count]) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 capitalize">{label}</span>
                  <span className="text-lg font-bold text-gray-900">{count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-400 h-2 rounded-full"
                    style={{ width: `${(count / summaryData.present) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Daily Message */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-transparent pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
            <span>📝</span> Message de la journée
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <textarea
            placeholder="Résumez la journée pour les parents..."
            className="w-full rounded-lg border border-gray-300 p-4 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-transparent resize-none"
            rows={4}
            defaultValue="Aujourd'hui, les enfants ont travaillé sur la motricité fine et les mathématiques. Excellente participation et bonne ambiance générale dans la classe!"
          />
          <div className="mt-4 flex justify-end gap-3">
            <Button variant="outline" className="rounded-lg bg-transparent">
              Enregistrer
            </Button>
            <Button className="rounded-lg bg-sky-500 text-white hover:bg-sky-600 font-semibold px-6">
              Envoyer à tous les parents
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-center">
        <Link href="/teacher">
          <Button className="rounded-lg bg-gray-100 text-gray-900 hover:bg-gray-200 font-semibold px-8 py-3">
            Terminer la journée
          </Button>
        </Link>
      </div>
    </div>
  )
}
