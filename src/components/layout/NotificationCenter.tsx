import { useEffect, useState } from "react"
import { Bell, CheckCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatDate } from "@/lib/utils"

type AppNotification = {
  id: string
  type: string
  title: string
  message: string
  readAt: string | null
  createdAt: string
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications")
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  async function markAllAsRead() {
    try {
      await fetch("/api/notifications/read-all", { method: "POST" })
      setUnreadCount(0)
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })))
    } catch {
      // ignore
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full" aria-label="Notificações">
          <Bell />
          {unreadCount > 0 && (
            <Badge className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 shadow-lg">
        <div className="flex items-center justify-between border-b border-border/70 p-3">
          <div className="flex items-center gap-2">
            <h4 className="font-display text-xs font-semibold">Notificações</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="rounded-full text-[10px]">
                {unreadCount} novas
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={markAllAsRead}>
              <CheckCheck className="mr-1 size-3" /> Lidas
            </Button>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-border/50">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Nenhuma notificação recente.
            </div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className={`p-3 text-left transition-colors ${!n.readAt ? "bg-muted/40 font-medium" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-semibold text-foreground">{n.title}</p>
                  <span className="text-[9px] text-muted-foreground">{formatDate(n.createdAt)}</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{n.message}</p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
