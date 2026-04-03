import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const events = [
  { title: "Réunion parents-enseignants", date: "28/09/2025", action: "Envoyé" },
  { title: "Sortie au parc", date: "05/10/2025", action: "Rappel WhatsApp" },
  { title: "Journée portes ouvertes", date: "15/10/2025", action: "Rappel WhatsApp" },
]




export function AnnouncementsEvents() {
  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <span>📢</span> Annonces & Événements
      </h3>
      <div className="space-y-3">
        {events.map((event, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div>
              <p className="font-medium text-foreground">{event.title}</p>
              <p className="text-xs text-muted-foreground">{event.date}</p>
            </div>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              {event.action}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  )
}
