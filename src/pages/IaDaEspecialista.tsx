import { useEffect, useState } from "react"
import { Bot, Send, Sparkles, FileText } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePatientStore } from "@/stores/usePatientStore"

type Conversation = {
  id: string
  title: string
  patientId?: string | null
  patient?: { name: string } | null
}

type Message = {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  sources?: string[] | null
}

export default function IaDaEspecialista() {
  const patients = usePatientStore((state) => state.patients)
  const loadPatients = usePatientStore((state) => state.loadPatients)

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])

  const [selectedPatientId, setSelectedPatientId] = useState<string>("none")
  const [inputMsg, setInputMsg] = useState("")
  const [sending, setSending] = useState(false)

  useEffect(() => {
    loadPatients()
  }, [loadPatients])

  useEffect(() => {
    async function loadConversations() {
      try {
        const res = await fetch("/api/ai/conversations")
        if (res.ok) {
          const data = await res.json()
          setConversations(data.conversations || [])
          if (data.conversations?.[0]) {
            setActiveConversationId(data.conversations[0].id)
          }
        }
      } catch {
        // ignore
      }
    }
    loadConversations()
  }, [])

  useEffect(() => {
    async function loadMessages() {
      if (!activeConversationId) return
      try {
        const res = await fetch(`/api/ai/conversations/${activeConversationId}`)
        if (res.ok) {
          const data = await res.json()
          setMessages(data.conversation.messages || [])
        }
      } catch {
        // ignore
      }
    }
    loadMessages()
  }, [activeConversationId])

  async function startNewConversation() {
    try {
      const patientId = selectedPatientId !== "none" ? selectedPatientId : undefined
      const targetPatient = patients.find((p) => p.id === patientId)
      const title = targetPatient ? `Consulta · ${targetPatient.name}` : "Consulta Clínica"

      const res = await fetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, patientId }),
      })

      if (res.ok) {
        const data = await res.json()
        setConversations((prev) => [data.conversation, ...prev])
        setActiveConversationId(data.conversation.id)
        setMessages([])
      }
    } catch {
      // ignore
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!inputMsg.trim() || sending) return

    let conversationId = activeConversationId
    if (!conversationId) {
      const patientId = selectedPatientId !== "none" ? selectedPatientId : undefined
      const targetPatient = patients.find((p) => p.id === patientId)
      const title = targetPatient ? `Consulta · ${targetPatient.name}` : "Consulta Clínica"

      const resConv = await fetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, patientId }),
      })

      if (!resConv.ok) return
      const dataConv = await resConv.json()
      conversationId = dataConv.conversation.id
      setConversations((prev) => [dataConv.conversation, ...prev])
      setActiveConversationId(conversationId)
    }

    const currentText = inputMsg.trim()
    setInputMsg("")
    setSending(true)

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: currentText }])

    try {
      const res = await fetch(`/api/ai/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: currentText }),
      })

      if (res.ok) {
        const data = await res.json()
        setMessages((prev) => [
          ...prev.filter((m) => m.content !== currentText),
          data.userMessage,
          data.assistantMessage,
        ])
      }
    } catch {
      toast.error("Erro ao comunicar com a IA da Especialista.")
    } finally {
      setSending(false)
    }
  }

  function handleAddToRecord(_content: string) {
    toast.success("Orientação copiada e pronta para adicionar ao prontuário da paciente.")
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="IA da Especialista Ana Corso"
        description="Assistente clínica curada baseada em anatomia avançada, consensos estéticos e segurança em Harmonização Facial."
        actions={
          <div className="flex items-center gap-3">
            <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Contexto de paciente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem paciente (Geral)</SelectItem>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" variant="outline" onClick={startNewConversation}>
              <Sparkles className="mr-1.5 size-4 text-primary" /> Nova Consulta
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Lista de Conversas */}
        <div className="flex flex-col gap-2">
          <h3 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Consultas Anteriores
          </h3>
          <div className="flex flex-col gap-1.5">
            {conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveConversationId(c.id)}
                className={`flex items-center justify-between rounded-xl p-3 text-left transition-colors border ${
                  activeConversationId === c.id
                    ? "border-primary/40 bg-primary/10 text-primary font-medium"
                    : "border-border/60 hover:bg-accent/50 text-muted-foreground"
                }`}
              >
                <div className="truncate">
                  <p className="truncate text-[12px] font-semibold">{c.title}</p>
                  {c.patient && <p className="text-[10px] opacity-75">{c.patient.name}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat de Conversa */}
        <Card className="flex h-[600px] flex-col overflow-hidden border-border/70 py-0 shadow-[var(--shadow-soft)] lg:col-span-3">
          <CardHeader className="border-b border-border/70 p-4">
            <div className="flex items-center gap-2">
              <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <Bot className="size-5" />
              </div>
              <div>
                <CardTitle className="font-display text-sm font-semibold">Dra. Ana Corso AI</CardTitle>
                <p className="text-[11px] text-muted-foreground">Assistente clínica autorizada · Protocolos de anatomia e segurança</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="grid h-full place-items-center text-center p-8 text-muted-foreground">
                <div>
                  <Sparkles className="mx-auto size-8 text-primary opacity-60" />
                  <p className="mt-2 text-sm font-semibold text-foreground">Como posso auxiliar seu atendimento clínico hoje?</p>
                  <p className="mt-1 text-xs max-w-sm mx-auto">
                    Faça perguntas sobre vetores de aplicação, doses de toxina, manejo de intercorrências ou orientações pós-procedimento.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((m) => {
                const isUser = m.role === "user"
                return (
                  <div key={m.id} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                    {!isUser && (
                      <div className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary mt-1">
                        <Bot className="size-4" />
                      </div>
                    )}

                    <div className={`max-w-[80%] rounded-2xl p-4 text-[13px] leading-relaxed ${
                      isUser ? "bg-primary text-primary-foreground" : "bg-muted/70 text-foreground border border-border/60"
                    }`}>
                      <p className="whitespace-pre-wrap">{m.content}</p>

                      {!isUser && (
                        <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-[10px]">
                          <span className="text-muted-foreground opacity-80">Requer confirmação humana</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => handleAddToRecord(m.content)}
                          >
                            <FileText className="mr-1 size-3" /> Adicionar ao Prontuário
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>

          <form onSubmit={handleSendMessage} className="border-t border-border/70 p-3 flex gap-2">
            <Input
              placeholder="Digite sua dúvida clínica ou solicite orientação de protocolo..."
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              disabled={sending}
              className="flex-1"
            />
            <Button type="submit" disabled={sending || !inputMsg.trim()}>
              <Send className="size-4" />
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
