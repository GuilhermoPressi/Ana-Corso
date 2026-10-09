import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  ContactRound,
  Loader2,
  MessageCircle,
  Plus,
  Search,
  Trash2,
  Settings2,
  TrendingUp,
  UserRoundCheck,
} from "lucide-react"
import { toast } from "sonner"

import { ContactTagsEditor } from "@/components/crm/ContactTagsEditor"
import { ContactAvatar } from "@/components/crm/ConversationsTab"
import { ManageTagsDialog } from "@/components/crm/ManageTagsDialog"
import { TagChip } from "@/components/crm/TagChip"
import { tagColorStyle } from "@/lib/tag-colors"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { crmApi, formatPhone, relativeTime, type Contact } from "@/lib/crm-api"
import { parseDecimal } from "@/lib/number"
import { cn } from "@/lib/utils"
import { usePatientStore } from "@/stores/usePatientStore"
import { useTagStore } from "@/stores/useTagStore"

const leadStageLabel: Record<string, string> = {
  NEW_CONTACT: "Novo contato",
  EVALUATION_SCHEDULED: "Avaliação agendada",
  PROPOSAL_SENT: "Proposta enviada",
  WON: "Fechado",
  LOST: "Perdido",
}

const ALL_TAGS = "__all__"

export function ContactsTab({
  focusContactId,
  onFocusHandled,
  onOpenConversation,
}: {
  focusContactId: string | null
  onFocusHandled: () => void
  onOpenConversation: (conversationId: string) => void
}) {
  const [search, setSearch] = useState("")
  const [tag, setTag] = useState(ALL_TAGS)
  const tags = useTagStore((s) => s.tags)
  const loadTagStore = useTagStore((s) => s.load)
  const [manageTags, setManageTags] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await crmApi.listContacts(search, tag === ALL_TAGS ? undefined : tag)
      setContacts(data.contacts)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar contatos.")
    } finally {
      setLoading(false)
    }
  }, [search, tag])

  const loadTags = useCallback(() => {
    loadTagStore().catch(() => {})
  }, [loadTagStore])
  const colorOf = new Map(tags.map((t) => [t.name, t.color]))

  useEffect(() => {
    const timer = setTimeout(load, 250)
    return () => clearTimeout(timer)
  }, [load])

  useEffect(loadTags, [loadTags])

  useEffect(() => {
    if (focusContactId) {
      setSelectedId(focusContactId)
      onFocusHandled()
    }
  }, [focusContactId, onFocusHandled])

  function onContactChanged(contact: Contact) {
    setContacts((current) => current.map((c) => (c.id === contact.id ? contact : c)))
    loadTags()
  }

  async function openConversation(contact: Contact) {
    try {
      const { conversation } = await crmApi.openConversation(contact.id)
      onOpenConversation(conversation.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível abrir a conversa.")
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, telefone ou e-mail"
            className="h-9 pl-8"
          />
        </div>
        <Select value={tag} onValueChange={setTag}>
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue placeholder="Etiqueta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TAGS}>Todas as etiquetas</SelectItem>
            {tags.map((item) => (
              <SelectItem key={item.id} value={item.name}>
                <span className={cn("size-2 rounded-full", tagColorStyle(item.color).dot)} />
                {item.name} ({item.count ?? 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" className="h-9" onClick={() => setManageTags(true)}>
          <Settings2 /> Etiquetas
        </Button>
        <span className="text-[12px] text-muted-foreground">{contacts.length} contato(s)</span>
        <Button size="sm" className="ml-auto rounded-full" onClick={() => setCreating(true)}>
          <Plus /> Novo contato
        </Button>
      </div>

      <Card className="overflow-hidden py-0">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Carregando…
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <ContactRound className="mx-auto mb-2 size-8 opacity-40" />
            {search || tag !== ALL_TAGS
              ? "Nenhum contato encontrado com esses filtros."
              : "Os contatos aparecem aqui automaticamente quando alguém manda mensagem no WhatsApp."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden sm:table-cell">Telefone</TableHead>
                <TableHead className="hidden lg:table-cell">Vínculos</TableHead>
                <TableHead className="hidden md:table-cell">Etiquetas</TableHead>
                <TableHead className="hidden md:table-cell">Última mensagem</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact.id} className="cursor-pointer" onClick={() => setSelectedId(contact.id)}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <ContactAvatar name={contact.name} url={contact.avatarUrl} className="size-8" />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{contact.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground sm:hidden">{formatPhone(contact.phone)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden tabular-nums sm:table-cell">{formatPhone(contact.phone)}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {contact.patient && (
                        <Badge variant="outline" className="rounded-full border-success/30 text-[10px] text-success">
                          Paciente
                        </Badge>
                      )}
                      {contact.lead && (
                        <Badge variant="outline" className="rounded-full text-[10px]">
                          Lead · {leadStageLabel[contact.lead.stage] ?? contact.lead.stage}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.map((t) => (
                        <TagChip key={t} name={t} color={colorOf.get(t)} size="xs" />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-[12px] text-muted-foreground md:table-cell">
                    {contact.conversation?.lastMessageAt ? relativeTime(contact.conversation.lastMessageAt) : "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label="Abrir conversa"
                      onClick={(event) => {
                        event.stopPropagation()
                        openConversation(contact)
                      }}
                    >
                      <MessageCircle className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <ManageTagsDialog
        open={manageTags}
        onOpenChange={setManageTags}
        onRenamed={() => load()}
        onDeleted={(name) => {
          if (tag === name) setTag(ALL_TAGS)
          load()
        }}
      />

      <NewContactDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(contact) => {
          setContacts((current) => [contact, ...current])
          loadTags()
        }}
      />

      <ContactSheet
        contactId={selectedId}
        contacts={contacts}
        onClose={() => setSelectedId(null)}
        onChanged={onContactChanged}
        onDeleted={(id) => {
          setContacts((current) => current.filter((c) => c.id !== id))
          setSelectedId(null)
          loadTags()
        }}
        onOpenConversation={openConversation}
      />
    </div>
  )
}

function NewContactDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (contact: Contact) => void
}) {
  const [form, setForm] = useState({ name: "", phone: "", email: "" })
  const [saving, setSaving] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const { contact } = await crmApi.createContact({
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
      })
      onCreated(contact)
      toast.success(`${contact.name} adicionado aos contatos.`)
      setForm({ name: "", phone: "", email: "" })
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível criar o contato.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="font-display">Novo contato</DialogTitle>
            <DialogDescription>Cadastre um número para iniciar uma conversa pelo WhatsApp.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="nc-name" className="text-[13px]">
                Nome
              </Label>
              <Input
                id="nc-name"
                value={form.name}
                onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <Label htmlFor="nc-phone" className="text-[13px]">
                WhatsApp (com DDD)
              </Label>
              <Input
                id="nc-phone"
                value={form.phone}
                onChange={(event) => setForm((f) => ({ ...f, phone: event.target.value }))}
                placeholder="(51) 99999-0000"
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <Label htmlFor="nc-email" className="text-[13px]">
                E-mail (opcional)
              </Label>
              <Input
                id="nc-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((f) => ({ ...f, email: event.target.value }))}
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving || !form.name.trim() || form.phone.replace(/\D/g, "").length < 10}>
              {saving && <Loader2 className="animate-spin" />} Salvar contato
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ContactSheet({
  contactId,
  contacts,
  onClose,
  onChanged,
  onDeleted,
  onOpenConversation,
}: {
  contactId: string | null
  contacts: Contact[]
  onClose: () => void
  onChanged: (contact: Contact) => void
  onDeleted: (id: string) => void
  onOpenConversation: (contact: Contact) => void
}) {
  const fetchLeads = usePatientStore((s) => s.fetchLeads)
  const [contact, setContact] = useState<Contact | null>(null)
  const [form, setForm] = useState({ name: "", email: "", notes: "" })
  const [saving, setSaving] = useState(false)
  const [patientSearch, setPatientSearch] = useState("")
  const [patientOptions, setPatientOptions] = useState<{ id: string; name: string; phone: string | null }[]>([])
  const [leadForm, setLeadForm] = useState<{ interest: string; value: string } | null>(null)

  // Carrega da lista; se o contato não estiver nela (ex.: veio da conversa com filtro ativo), busca no servidor.
  useEffect(() => {
    if (!contactId) {
      setContact(null)
      return
    }
    const fromList = contacts.find((c) => c.id === contactId)
    if (fromList) {
      setContact(fromList)
      return
    }
    crmApi
      .getContact(contactId)
      .then((data) => setContact(data.contact))
      .catch(() => setContact(null))
  }, [contactId, contacts])

  useEffect(() => {
    if (contact) setForm({ name: contact.name, email: contact.email ?? "", notes: contact.notes ?? "" })
    setLeadForm(null)
    setPatientSearch("")
    setPatientOptions([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact?.id])

  useEffect(() => {
    if (patientSearch.trim().length < 2) {
      setPatientOptions([])
      return
    }
    const timer = setTimeout(() => {
      crmApi
        .searchPatients(patientSearch.trim())
        .then((data) => setPatientOptions(data.options))
        .catch(() => setPatientOptions([]))
    }, 250)
    return () => clearTimeout(timer)
  }, [patientSearch])

  async function patch(update: Parameters<typeof crmApi.updateContact>[1], success?: string) {
    if (!contact) return
    setSaving(true)
    try {
      const { contact: saved } = await crmApi.updateContact(contact.id, update)
      setContact(saved)
      onChanged(saved)
      if (success) toast.success(success)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.")
    } finally {
      setSaving(false)
    }
  }

  async function createLead() {
    if (!contact || !leadForm) return
    setSaving(true)
    try {
      const { contact: saved } = await crmApi.createLeadFromContact(contact.id, {
        interest: leadForm.interest,
        value: parseDecimal(leadForm.value) || 0,
      })
      setContact(saved)
      onChanged(saved)
      setLeadForm(null)
      fetchLeads()
      toast.success("Lead criado na coluna Novos contatos do funil.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível criar o lead.")
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!contact) return
    if (!window.confirm(`Excluir ${contact.name}? A conversa e o histórico de mensagens também serão apagados.`)) return
    try {
      await crmApi.deleteContact(contact.id)
      toast.success("Contato excluído.")
      onDeleted(contact.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir.")
    }
  }

  const dirty =
    contact &&
    (form.name.trim() !== contact.name || (form.email || "") !== (contact.email ?? "") || (form.notes || "") !== (contact.notes ?? ""))

  return (
    <Sheet open={Boolean(contactId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {!contact ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Carregando…
          </div>
        ) : (
          <>
            <SheetHeader>
              <div className="flex items-center gap-3">
                <ContactAvatar name={contact.name} url={contact.avatarUrl} className="size-12" />
                <div className="min-w-0">
                  <SheetTitle className="truncate font-display">{contact.name}</SheetTitle>
                  <SheetDescription>{formatPhone(contact.phone)}</SheetDescription>
                </div>
              </div>
              <Button size="sm" className="mt-3 w-full" onClick={() => onOpenConversation(contact)}>
                <MessageCircle /> Abrir conversa
              </Button>
            </SheetHeader>

            <div className="space-y-6 px-4 pb-6">
              {/* Dados */}
              <section className="space-y-3">
                <div>
                  <Label htmlFor="cs-name" className="text-[13px]">
                    Nome
                  </Label>
                  <Input
                    id="cs-name"
                    value={form.name}
                    onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
                    className="mt-1.5"
                  />
                  {contact.pushName && contact.pushName !== contact.name && (
                    <p className="mt-1 text-[11px] text-muted-foreground">Nome no WhatsApp: {contact.pushName}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="cs-email" className="text-[13px]">
                    E-mail
                  </Label>
                  <Input
                    id="cs-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((f) => ({ ...f, email: event.target.value }))}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="cs-notes" className="text-[13px]">
                    Observações
                  </Label>
                  <Textarea
                    id="cs-notes"
                    value={form.notes}
                    onChange={(event) => setForm((f) => ({ ...f, notes: event.target.value }))}
                    rows={3}
                    className="mt-1.5"
                  />
                </div>
                {dirty && (
                  <Button
                    size="sm"
                    disabled={saving || !form.name.trim()}
                    onClick={() =>
                      patch(
                        { name: form.name.trim(), email: form.email.trim() || null, notes: form.notes.trim() || null },
                        "Contato atualizado.",
                      )
                    }
                  >
                    Salvar alterações
                  </Button>
                )}
              </section>

              {/* Etiquetas */}
              <section>
                <p className="mb-2 text-[13px] font-medium">Etiquetas</p>
                <ContactTagsEditor
                  contactId={contact.id}
                  tags={contact.tags}
                  size="sm"
                  onSaved={(tags) => {
                    const next = { ...contact, tags }
                    setContact(next)
                    onChanged(next)
                  }}
                />
              </section>

              {/* Paciente */}
              <section>
                <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium">
                  <UserRoundCheck className="size-4 text-success" /> Paciente
                </p>
                {contact.patient ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm">
                    <Link to={`/pacientes/${contact.patient.id}`} className="font-medium text-primary hover:underline">
                      {contact.patient.name}
                    </Link>
                    <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => patch({ patientId: null })}>
                      Desvincular
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Input
                      value={patientSearch}
                      onChange={(event) => setPatientSearch(event.target.value)}
                      placeholder="Buscar paciente para vincular"
                      className="h-8 text-[12px]"
                    />
                    {patientOptions.length > 0 && (
                      <div className="mt-1 overflow-hidden rounded-lg border">
                        {patientOptions.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            className="block w-full px-3 py-2 text-left text-[12px] hover:bg-muted"
                            onClick={() => patch({ patientId: option.id }, "Paciente vinculado.")}
                          >
                            <span className="font-medium">{option.name}</span>
                            {option.phone && <span className="ml-2 text-muted-foreground">{formatPhone(option.phone)}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Lead */}
              <section>
                <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium">
                  <TrendingUp className="size-4 text-primary" /> Funil comercial
                </p>
                {contact.lead ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm">
                    <span>
                      Lead em <strong>{leadStageLabel[contact.lead.stage] ?? contact.lead.stage}</strong>
                    </span>
                    <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => patch({ leadId: null })}>
                      Desvincular
                    </Button>
                  </div>
                ) : leadForm ? (
                  <div className="space-y-2 rounded-lg border p-3">
                    <Input
                      value={leadForm.interest}
                      onChange={(event) => setLeadForm((f) => f && { ...f, interest: event.target.value })}
                      placeholder="Interesse (ex.: Toxina botulínica)"
                      className="h-8 text-[12px]"
                    />
                    <Input
                      value={leadForm.value}
                      onChange={(event) => setLeadForm((f) => f && { ...f, value: event.target.value })}
                      placeholder="Valor estimado (R$)"
                      inputMode="decimal"
                      className="h-8 text-[12px]"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setLeadForm(null)}>
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={createLead} disabled={saving || !leadForm.interest.trim()}>
                        Criar lead
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setLeadForm({ interest: "", value: "" })}>
                    <Plus /> Criar lead no funil
                  </Button>
                )}
              </section>

              <section className="border-t pt-4 text-[11px] text-muted-foreground">
                <p>
                  Origem: {contact.source === "manual" ? "cadastro manual" : "WhatsApp"} · criado em{" "}
                  {new Date(contact.createdAt).toLocaleDateString("pt-BR")}
                </p>
                <Button variant="ghost" size="sm" className="mt-3 h-8 text-destructive hover:text-destructive" onClick={remove}>
                  <Trash2 /> Excluir contato
                </Button>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
