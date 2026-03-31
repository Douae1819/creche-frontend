"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function ChildAttendancePage() {
  const router = useRouter()
  const params = useParams()
  const childId = params.id
  const locale = (params?.locale as string) ?? "fr"

  // Mock child data
  const [formData, setFormData] = useState({
    status: "present",
    checkInTime: new Date().toLocaleTimeString("fr-FR"),
    appetite: "bien",
    mood: "bonne",
    nap: "1h",
    participation: "bonne",
    notes: "",
  })

  const [milestones, setMilestones] = useState([
    { id: 1, name: "Social", completed: false },
    { id: 2, name: "Langage", completed: false },
    { id: 3, name: "Préhension", completed: false },
    { id: 4, name: "Motricité fine 4", completed: false },
  ])

  const childData = {
    id: childId,
    name: "Laila T.",
    age: "4 ans",
    class: "Salle Bleue",
    allergies: ["Arachides"],
  }

  const handleMilestoneChange = (id: number) => {
    setMilestones((prev) => prev.map((m) => (m.id === id ? { ...m, completed: !m.completed } : m)))
  }

  const handleSubmit = () => {
    // Save to API
    console.log("[v0] Submitting attendance data:", { formData, milestones })
    router.push(`/${locale}/teacher`)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href={`/${locale}/teacher`}>
          <Button variant="outline" className="rounded-lg bg-transparent">
            ← Retour
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{childData.name}</h1>
        <div className="w-16"></div>
      </div>

      {/* Child Info */}
      <Card className="border border-gray-200 shadow-sm bg-gradient-to-r from-sky-50 to-transparent">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-600 uppercase">Âge</p>
              <p className="font-bold text-gray-900">{childData.age}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 uppercase">Classe</p>
              <p className="font-bold text-gray-900">{childData.class}</p>
            </div>
            {childData.allergies.length > 0 && (
              <div className="col-span-2">
                <p className="text-xs font-medium text-red-600 uppercase">Allergies</p>
                <p className="font-bold text-red-600">{childData.allergies.join(", ")}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Attendance Status */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-transparent pb-4">
          <CardTitle className="text-base font-bold text-gray-900">Présence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="flex gap-3">
            <Button
              onClick={() => setFormData({ ...formData, status: "present" })}
              className={`flex-1 rounded-lg font-semibold py-3 ${
                formData.status === "present"
                  ? "bg-green-500 text-white hover:bg-green-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              ✓ Présent
            </Button>
            <Button
              onClick={() => setFormData({ ...formData, status: "absent" })}
              className={`flex-1 rounded-lg font-semibold py-3 ${
                formData.status === "absent"
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              ✕ Absent
            </Button>
          </div>
          {formData.status === "present" && (
            <p className="text-sm text-gray-600">Heure d'arrivée: {formData.checkInTime}</p>
          )}
        </CardContent>
      </Card>

      {/* Educational Milestones */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-transparent pb-4">
          <CardTitle className="text-base font-bold text-gray-900">Jalons éducatifs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-6">
          {milestones.map((milestone) => (
            <label
              key={milestone.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={milestone.completed}
                onChange={() => handleMilestoneChange(milestone.id)}
                className="w-5 h-5 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
              />
              <span className="font-medium text-gray-900">{milestone.name}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Daily Summary */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-transparent pb-4">
          <CardTitle className="text-base font-bold text-gray-900">Résumé de la journée</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Appétit</label>
            <div className="flex gap-2">
              {["un peu", "bien", "tout"].map((option) => (
                <Button
                  key={option}
                  onClick={() => setFormData({ ...formData, appetite: option })}
                  className={`rounded-full font-medium ${
                    formData.appetite === option
                      ? "bg-green-400 text-white hover:bg-green-500"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Humeur</label>
            <div className="flex gap-2">
              {["mauvaise", "bonne", "excellente"].map((option) => (
                <Button
                  key={option}
                  onClick={() => setFormData({ ...formData, mood: option })}
                  className={`rounded-full font-medium ${
                    formData.mood === option
                      ? "bg-sky-400 text-white hover:bg-sky-500"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sieste</label>
            <input
              type="text"
              placeholder="ex: 1h30"
              value={formData.nap}
              onChange={(e) => setFormData({ ...formData, nap: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Participation</label>
            <div className="flex gap-2">
              {["faible", "bonne", "excellente"].map((option) => (
                <Button
                  key={option}
                  onClick={() => setFormData({ ...formData, participation: option })}
                  className={`rounded-full font-medium ${
                    formData.participation === option
                      ? "bg-green-400 text-white hover:bg-green-500"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observations particulières..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Link href={`/${locale}/teacher`}>
          <Button variant="outline" className="rounded-lg bg-transparent">
            Annuler
          </Button>
        </Link>
        <Button onClick={handleSubmit} className="rounded-lg bg-sky-500 text-white hover:bg-sky-600 font-semibold px-8">
          Valider et continuer
        </Button>
      </div>
    </div>
  )
}
