import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  FileText,
  Loader2,
  Lock,
  MapPin,
  MessageSquareText,
  Paperclip,
  RotateCcw,
  Search,
  Send,
  StickyNote,
  UserRound,
  Zap,
} from "lucide-react"
import { toast } from "sonner"

import { ContactTagsEditor } from "@/components/crm/ContactTagsEditor"
import { TagChip } from "@/components/crm/TagChip"
import { QuickRepliesDialog } from "@/components/crm/QuickRepliesDialog"
import { WhatsAppConnectionCard } from "@/components/crm/WhatsAppConnectionCard"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { usePolling } from "@/hooks/usePolling"
import {
  crmApi,
  fileToBase64,
  formatPhone,
  relativeTime,
  type Conversation,
  type ConversationCounts,
  type ConversationFilter,
  type Message,
  type QuickReply,
  type TeamMember,
  type WhatsAppStatus,
} from "@/lib/crm-api"
import { cn, initials } from "@/lib/utils"
import { useAuthStore } from "@/stores/useAuthStore"
import { useInboxStore } from "@/stores/useInboxStore"
import { useTagStore } from "@/stores/useTagStore"

const filters: { id: ConversationFilter; label: string; count?: keyof ConversationCounts }[] = [
  { id: "open", label: "Abertas", count: "open" },
  { id: "unread", label: "Não lidas", count: "unread" },
  { id: "mine", label: "Minhas", count: "mine" },
  { id: "unassigned", label: "Sem responsável", count: "unassigned" },
  { id: "closed", label: "Finalizadas" },
]

const MAX_FILE_BYTES = 10 * 1024 * 1024

export function ConversationsTab({
  selectedId,
  onSelect,
  onOpenContact,
  onUnreadChange,
}: {
  selectedId: string | null
  onSelect: (id: string | null) => void
  onOpenContact: (contactId: string) => void
  onUnreadChange?: (count: number) => void
}) {
  const [filter, setFilter] = useState<ConversationFilter>("open")
  const [search, setSearch] = useState("")
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [counts, setCounts] = useState<ConversationCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [whatsapp, setWhatsapp] = useState<WhatsAppStatus | null>(null)
  const [connectMode, setConnectMode] = useState<boolean | null>(null)
  const [team, setTeam] = useState<TeamMember[]>([])
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])

  const loadList = useCallback(async () => {
    try {
      const data = await crmApi.listConversations(filter, search)
      setConversations(data.conversations)
      setCounts(data.counts)
      onUnreadChange?.(data.counts.unread)
    } catch (err) {
      if (loading) toast.error(err instanceof Error ? err.message : "Erro ao carregar conversas.")
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, search, onUnreadChange])

  usePolling(loadList, 5000, [filter, search])

  const loadWhatsapp = useCallback(async () => {
    const data = await crmApi.whatsappStatus().catch(() => null)
    setWhatsapp(data?.configured === false ? "DISCONNECTED" : (data?.instance?.status ?? "DISCONNECTED"))
  }, [])

  usePolling(loadWhatsapp, 30000)

  const loadQuickReplies = useCallback(() => {
    crmApi
      .listQuickReplies()
      .then((data) => setQuickReplies(data.quickReplies))
      .catch(() => {})
  }, [])

  useEffect(() => {
    crmApi
      .listTeam()
      .then((data) => setTeam(data.members.filter((m) => m.status === "ACTIVE")))
      .catch(() => {})
    loadQuickReplies()
    useTagStore.getState().load().catch(() => {})
  }, [loadQuickReplies])

  // Decidido uma única vez (ou ao clicar em "Conectar"): o cartão do QR não pode
  // sumir sozinho por causa das consultas periódicas enquanto a pessoa lê o código.
  const showConnectCard =
    connectMode ?? (whatsapp !== null && !loading && whatsapp !== "CONNECTED" && conversations.length === 0)
  if (connectMode === null && whatsapp !== null && !loading) setConnectMode(showConnectCard)

  if (showConnectCard) {
    return (
      <div className="space-y-3 py-6">
        {conversations.length > 0 && (
          <div className="mx-auto max-w-xl">
            <Button variant="ghost" size="sm" onClick={() => setConnectMode(false)}>
              <ArrowLeft /> Voltar para as conversas
            </Button>
          </div>
        )}
        <WhatsAppConnectionCard
          compact
          onConnected={() => {
            setWhatsapp("CONNECTED")
            setConnectMode(false)
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {whatsapp && whatsapp !== "CONNECTED" && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-[13px] text-warning-foreground">
          <AlertCircle className="size-4 shrink-0" />
          <span className="flex-1">
            O WhatsApp da clínica está desconectado. Você ainda pode consultar o histórico, mas não envia nem recebe mensagens.
          </span>
          <Button size="sm" variant="outline" className="h-7" onClick={() => setConnectMode(true)}>
            Conectar WhatsApp
          </Button>
        </div>
      )}

      <Card className="grid h-[calc(100dvh-230px)] min-h-[540px] gap-0 overflow-hidden py-0 md:grid-cols-[340px_minmax(0,1fr)]">
        {/* Lista */}
        <div className={cn("flex min-h-0 flex-col border-r", selectedId && "hidden md:flex")}>
          <div className="space-y-2.5 border-b p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome ou telefone"
                className="h-9 pl-8"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {filters.map((item) => {
                const count = item.count && counts ? counts[item.count] : null
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilter(item.id)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                      filter === item.id
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {item.label}
                    {count ? <span className="tabular-nums opacity-70">{count}</span> : null}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Carregando…
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <MessageSquareText className="mx-auto mb-2 size-8 opacity-40" />
                Nenhuma conversa {filter === "closed" ? "finalizada" : "por aqui"}.
              </div>
            ) : (
              conversations.map((conversation) => (
                <ConversationRow
                  key={conversation.id}
                  conversation={conversation}
                  active={conversation.id === selectedId}
                  onClick={() => onSelect(conversation.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Conversa */}
        <div className={cn("flex min-h-0 flex-col", !selectedId && "hidden md:flex")}>
          {selectedId ? (
            <ConversationThread
              key={selectedId}
              conversationId={selectedId}
              team={team}
              quickReplies={quickReplies}
              onQuickRepliesChanged={loadQuickReplies}
              canSend={whatsapp === "CONNECTED"}
              onBack={() => onSelect(null)}
              onChanged={loadList}
              onOpenContact={onOpenContact}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <MessageSquareText className="size-10 opacity-30" />
              Selecione uma conversa para começar o atendimento.
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

function waitingLabel(conversation: Conversation) {
  if (conversation.status !== "OPEN" || conversation.unreadCount === 0 || !conversation.lastInboundAt) return null
  const minutes = Math.floor((Date.now() - new Date(conversation.lastInboundAt).getTime()) / 60_000)
  if (minutes < 5) return null
  const text = minutes < 60 ? `${minutes}min` : minutes < 1440 ? `${Math.floor(minutes / 60)}h` : `${Math.floor(minutes / 1440)}d`
  return { text, urgent: minutes >= 60 }
}

function ConversationRow({
  conversation,
  active,
  onClick,
}: {
  conversation: Conversation
  active: boolean
  onClick: () => void
}) {
  const waiting = waitingLabel(conversation)
  const tags = useTagStore((s) => s.tags)
  const colorOf = useMemo(() => new Map(tags.map((t) => [t.name, t.color])), [tags])
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 border-b border-border/60 px-3 py-3 text-left transition-colors hover:bg-muted/60",
        active && "bg-accent/70 hover:bg-accent/70",
      )}
    >
      <ContactAvatar name={conversation.contact.name} url={conversation.contact.avatarUrl} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className={cn("truncate text-[13px]", conversation.unreadCount > 0 ? "font-semibold" : "font-medium")}>
            {conversation.contact.name}
          </p>
          <span className="ml-auto shrink-0 text-[10px] tabular-nums text-muted-foreground">
            {relativeTime(conversation.lastMessageAt)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <p className="truncate text-[12px] text-muted-foreground">
            {conversation.lastMessagePreview || formatPhone(conversation.contact.phone)}
          </p>
          {conversation.unreadCount > 0 && (
            <span className="ml-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
              {conversation.unreadCount}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
          {waiting && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-px font-medium",
                waiting.urgent ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-warning-foreground",
              )}
            >
              <Clock className="size-2.5" /> aguarda {waiting.text}
            </span>
          )}
          {conversation.assignedUser && (
            <span className="inline-flex items-center gap-0.5">
              <UserRound className="size-2.5" /> {conversation.assignedUser.name.split(" ")[0]}
            </span>
          )}
          {conversation.contact.tags.slice(0, 2).map((tag) => (
            <TagChip key={tag} name={tag} color={colorOf.get(tag)} size="xs" />
          ))}
        </div>
      </div>
    </button>
  )
}

export function ContactAvatar({ name, url, className }: { name: string; url: string | null; className?: string }) {
  return (
    <Avatar className={cn("size-10 shrink-0", className)}>
      {url && <AvatarImage src={url} alt="" referrerPolicy="no-referrer" />}
      <AvatarFallback className="bg-primary/10 text-[12px] font-semibold text-primary">{initials(name)}</AvatarFallback>
    </Avatar>
  )
}

function ConversationThread({
  conversationId,
  team,
  quickReplies,
  onQuickRepliesChanged,
  canSend,
  onBack,
  onChanged,
  onOpenContact,
}: {
  conversationId: string
  team: TeamMember[]
  quickReplies: QuickReply[]
  onQuickRepliesChanged: () => void
  canSend: boolean
  onBack: () => void
  onChanged: () => void
  onOpenContact: (contactId: string) => void
}) {
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [notFound, setNotFound] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)
  const markingRead = useRef(false)

  const load = useCallback(async () => {
    try {
      const data = await crmApi.getConversation(conversationId)
      setConversation(data.conversation)
      setMessages(data.messages)
      if (data.conversation.unreadCount > 0 && !markingRead.current) {
        markingRead.current = true
        const readCount = data.conversation.unreadCount
        crmApi
          .markRead(conversationId)
          .then(() => {
            useInboxStore.getState().markConversationRead(readCount)
            onChanged()
          })
          .catch(() => {})
          .finally(() => {
            markingRead.current = false
          })
      }
    } catch (err) {
      if (err instanceof Error && "status" in err && (err as { status: number }).status === 404) setNotFound(true)
    }
  }, [conversationId, onChanged])

  usePolling(load, 4000, [conversationId])

  useEffect(() => {
    const el = scrollRef.current
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight
  }, [messages])

  function onScroll() {
    const el = scrollRef.current
    if (!el) return
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120
  }

  function appendMessage(message: Message) {
    stickToBottom.current = true
    setMessages((current) => [...current.filter((m) => m.id !== message.id), message])
  }

  async function update(patch: { status?: "OPEN" | "CLOSED"; assignedUserId?: string | null }) {
    try {
      const data = await crmApi.updateConversation(conversationId, patch)
      setConversation(data.conversation)
      onChanged()
      if (patch.status === "CLOSED") toast.success("Atendimento finalizado.")
      if (patch.status === "OPEN") toast.success("Conversa reaberta.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar a conversa.")
    }
  }

  async function retry(message: Message) {
    try {
      const result = await crmApi.retryMessage(message.id)
      appendMessage(result.message)
      if (result.error) toast.error(result.error)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao reenviar.")
    }
  }

  const grouped = useMemo(() => groupByDay(messages), [messages])

  if (notFound) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-sm text-muted-foreground">
        Conversa não encontrada.
        <Button variant="outline" size="sm" onClick={onBack}>
          Voltar
        </Button>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Carregando conversa…
      </div>
    )
  }

  const { contact } = conversation

  return (
    <>
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center gap-3 border-b px-3 py-2.5">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack} aria-label="Voltar">
          <ArrowLeft />
        </Button>
        <button type="button" className="flex min-w-0 items-center gap-3 text-left" onClick={() => onOpenContact(contact.id)}>
          <ContactAvatar name={contact.name} url={contact.avatarUrl} className="size-9" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold hover:underline">{contact.name}</p>
            <p className="text-[11px] text-muted-foreground">{formatPhone(contact.phone)}</p>
          </div>
        </button>
        <ContactTagsEditor
          contactId={contact.id}
          tags={contact.tags}
          onSaved={(tags) => setConversation((c) => (c ? { ...c, contact: { ...c.contact, tags } } : c))}
        />

        <div className="ml-auto flex items-center gap-2">
          <Select
            value={conversation.assignedUserId ?? "none"}
            onValueChange={(value) => update({ assignedUserId: value === "none" ? null : value })}
          >
            <SelectTrigger size="sm" className="h-8 w-[170px] text-[12px]">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem responsável</SelectItem>
              {team.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {conversation.status === "OPEN" ? (
            <Button size="sm" variant="outline" onClick={() => update({ status: "CLOSED" })}>
              <Check /> Finalizar
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => update({ status: "OPEN" })}>
              <RotateCcw /> Reabrir
            </Button>
          )}
        </div>
      </div>

      {/* Mensagens */}
      <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto bg-muted/30 px-3 py-4 sm:px-6">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma mensagem ainda. Envie a primeira mensagem para iniciar o atendimento.
          </p>
        ) : (
          grouped.map((group) => (
            <div key={group.day} className="space-y-1.5">
              <div className="sticky top-0 z-10 flex justify-center py-2">
                <span className="rounded-full bg-background/90 px-3 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">
                  {group.day}
                </span>
              </div>
              {group.messages.map((message) => (
                <MessageBubble key={message.id} message={message} onRetry={() => retry(message)} />
              ))}
            </div>
          ))
        )}
      </div>

      <Composer
        conversationId={conversationId}
        canSend={canSend}
        quickReplies={quickReplies}
        onQuickRepliesChanged={onQuickRepliesChanged}
        contactFirstName={contact.name.split(" ")[0]}
        onSent={(message) => {
          appendMessage(message)
          onChanged()
        }}
      />
    </>
  )
}

function groupByDay(messages: Message[]) {
  const groups: { day: string; messages: Message[] }[] = []
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86_400_000).toDateString()
  for (const message of messages) {
    const date = new Date(message.sentAt)
    const key = date.toDateString()
    const day =
      key === today
        ? "Hoje"
        : key === yesterday
          ? "Ontem"
          : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    const last = groups[groups.length - 1]
    if (last && last.day === day) last.messages.push(message)
    else groups.push({ day, messages: [message] })
  }
  return groups
}

function StatusIcon({ status }: { status: Message["status"] }) {
  if (status === "QUEUED") return <Clock className="size-3" />
  if (status === "SENT") return <Check className="size-3" />
  if (status === "DELIVERED") return <CheckCheck className="size-3" />
  if (status === "READ") return <CheckCheck className="size-3 text-sky-500" />
  if (status === "FAILED") return <AlertCircle className="size-3 text-destructive" />
  return null
}

function MessageBubble({ message, onRetry }: { message: Message; onRetry: () => void }) {
  const outbound = message.direction === "OUTBOUND"
  const note = message.kind === "NOTE"
  const time = new Date(message.sentAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

  return (
    <div className={cn("flex", outbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-3 py-2 text-[13px] shadow-sm",
          note
            ? "border border-dashed border-warning/50 bg-warning/10"
            : outbound
              ? "rounded-br-sm bg-primary/12 dark:bg-primary/20"
              : "rounded-bl-sm bg-background",
          message.status === "FAILED" && "border border-destructive/40",
        )}
      >
        {note && (
          <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-warning-foreground">
            <Lock className="size-2.5" /> Nota interna
          </p>
        )}
        <MessageMedia message={message} />
        {message.text && message.kind !== "DOCUMENT" && (
          <p className="whitespace-pre-wrap break-words leading-relaxed">
            {message.kind === "LOCATION" && <MapPin className="mr-1 inline size-3.5" />}
            {message.text}
          </p>
        )}
        <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
          {outbound && message.sentBy && <span>{message.sentBy.name.split(" ")[0]} ·</span>}
          <span className="tabular-nums">{time}</span>
          {outbound && !note && <StatusIcon status={message.status} />}
        </div>
        {message.status === "FAILED" && (
          <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-destructive/20 pt-1.5 text-[11px] text-destructive">
            <span className="truncate" title={message.errorReason ?? undefined}>
              Não enviada{message.errorReason ? `: ${message.errorReason}` : ""}
            </span>
            <button type="button" onClick={onRetry} className="shrink-0 font-semibold underline-offset-2 hover:underline">
              Reenviar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function MessageMedia({ message }: { message: Message }) {
  const placeholder: Partial<Record<Message["kind"], string>> = {
    IMAGE: "📷 Imagem",
    AUDIO: "🎤 Áudio",
    VIDEO: "🎬 Vídeo",
    DOCUMENT: "📄 Documento",
    STICKER: "Figurinha",
  }
  if (!placeholder[message.kind]) return null
  if (!message.hasMedia) {
    return message.kind === "DOCUMENT" ? (
      <p className="text-muted-foreground">📄 {message.text || message.mediaFileName || "Documento"}</p>
    ) : (
      <p className="italic text-muted-foreground">{placeholder[message.kind]} (indisponível)</p>
    )
  }

  const url = crmApi.mediaUrl(message.id)
  switch (message.kind) {
    case "IMAGE":
    case "STICKER":
      return (
        <a href={url} target="_blank" rel="noreferrer" className="mb-1 block">
          <img
            src={url}
            alt=""
            loading="lazy"
            className={cn("rounded-lg object-cover", message.kind === "STICKER" ? "size-32" : "max-h-72 w-full max-w-xs")}
          />
        </a>
      )
    case "VIDEO":
      return <video src={url} controls preload="metadata" className="mb-1 max-h-72 w-full max-w-xs rounded-lg" />
    case "AUDIO":
      return <audio src={url} controls preload="none" className="mb-1 h-10 w-64 max-w-full" />
    case "DOCUMENT":
      return (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mb-1 flex items-center gap-2 rounded-lg bg-muted/70 px-2.5 py-2 hover:bg-muted"
        >
          <FileText className="size-5 shrink-0 text-primary" />
          <span className="truncate font-medium">{message.mediaFileName || message.text || "Documento"}</span>
        </a>
      )
    default:
      return null
  }
}

function Composer({
  conversationId,
  canSend,
  quickReplies,
  onQuickRepliesChanged,
  contactFirstName,
  onSent,
}: {
  conversationId: string
  canSend: boolean
  quickReplies: QuickReply[]
  onQuickRepliesChanged: () => void
  contactFirstName: string
  onSent: (message: Message) => void
}) {
  const userName = useAuthStore((s) => s.user?.name ?? "")
  const [text, setText] = useState("")
  const [noteMode, setNoteMode] = useState(false)
  const [sending, setSending] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const slashQuery = text.startsWith("/") && !text.includes(" ") && !text.includes("\n") ? text.slice(1).toLowerCase() : null
  const suggestions = useMemo(
    () => (slashQuery === null ? [] : quickReplies.filter((q) => q.shortcut.includes(slashQuery)).slice(0, 6)),
    [slashQuery, quickReplies],
  )

  function applyQuickReply(reply: QuickReply) {
    const content = reply.content
      .replaceAll("{nome}", contactFirstName)
      .replaceAll("{atendente}", userName.split(" ")[0] ?? "")
    setText(content)
    setHighlight(0)
    textareaRef.current?.focus()
  }

  async function send() {
    const body = text.trim()
    if (!body || sending) return
    if (!noteMode && !canSend) {
      toast.error("Conecte o WhatsApp para enviar mensagens.")
      return
    }
    setSending(true)
    try {
      const result = await crmApi.sendText(conversationId, body, noteMode)
      onSent(result.message)
      if (result.error) toast.error(result.error)
      else setText("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar.")
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  async function sendFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      toast.error("O arquivo precisa ter no máximo 10 MB.")
      return
    }
    if (!canSend) {
      toast.error("Conecte o WhatsApp para enviar arquivos.")
      return
    }
    setSending(true)
    try {
      const base64 = await fileToBase64(file)
      const caption = text.trim() || undefined
      const result = await crmApi.sendMedia(conversationId, {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        base64,
        caption,
      })
      onSent(result.message)
      if (result.error) toast.error(result.error)
      else if (caption) setText("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar o arquivo.")
    } finally {
      setSending(false)
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (suggestions.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault()
        setHighlight((h) => (h + 1) % suggestions.length)
        return
      }
      if (event.key === "ArrowUp") {
        event.preventDefault()
        setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length)
        return
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault()
        applyQuickReply(suggestions[Math.min(highlight, suggestions.length - 1)])
        return
      }
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      send()
    }
  }

  return (
    <div className={cn("relative border-t p-3", noteMode && "bg-warning/5")}>
      {suggestions.length > 0 && (
        <div className="absolute inset-x-3 bottom-full mb-2 overflow-hidden rounded-lg border bg-popover shadow-lg">
          {suggestions.map((reply, index) => (
            <button
              key={reply.id}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault()
                applyQuickReply(reply)
              }}
              className={cn("block w-full px-3 py-2 text-left text-[12px]", index === highlight && "bg-accent")}
            >
              <span className="font-semibold text-primary">/{reply.shortcut}</span>
              <span className="ml-2 text-muted-foreground">{reply.content.slice(0, 90)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mb-2 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setNoteMode(false)}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-medium",
            !noteMode ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
          )}
        >
          Mensagem
        </button>
        <button
          type="button"
          onClick={() => setNoteMode(true)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
            noteMode ? "bg-warning/15 text-warning-foreground" : "text-muted-foreground hover:bg-muted",
          )}
        >
          <StickyNote className="size-3" /> Nota interna
        </button>
        <div className="ml-auto">
          <QuickRepliesDialog
            quickReplies={quickReplies}
            onChanged={onQuickRepliesChanged}
            onPick={applyQuickReply}
            trigger={
              <Button variant="ghost" size="sm" className="h-7 text-[11px]">
                <Zap className="size-3.5" /> Respostas rápidas
              </Button>
            }
          />
        </div>
      </div>

      <div className="flex items-end gap-2">
        {!noteMode && (
          <>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ""
                if (file) sendFile(file)
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileRef.current?.click()}
              disabled={sending}
              aria-label="Anexar arquivo"
            >
              <Paperclip />
            </Button>
          </>
        )}
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setHighlight(0)
          }}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={
            noteMode
              ? "Nota visível apenas para a equipe…"
              : canSend
                ? "Digite uma mensagem — use / para respostas rápidas"
                : "WhatsApp desconectado"
          }
          className="max-h-40 min-h-10 resize-none"
        />
        <Button onClick={send} disabled={sending || !text.trim()} size="icon" aria-label="Enviar">
          {sending ? <Loader2 className="animate-spin" /> : noteMode ? <StickyNote /> : <Send />}
        </Button>
      </div>
      <p className="mt-1.5 text-[10px] text-muted-foreground">
        Enter envia · Shift+Enter quebra linha
        {noteMode && <Badge variant="outline" className="ml-2 h-4 rounded-full px-1.5 text-[9px]">não vai para o paciente</Badge>}
      </p>
    </div>
  )
}
