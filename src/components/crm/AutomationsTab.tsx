import { useEffect, useState } from "react"
import { Copy, Loader2, Plus, RefreshCw, ShoppingBag, Tags, Trash2, Zap } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { crmApi, type CrmAutomations } from "@/lib/crm-api"

type RuleForm = { keywords: string; tag: string }

const DEFAULT_WELCOME =
  "Olá, {nome}! Aqui é a equipe da Dra. Ana Corso. Recebemos sua mensagem e já vamos te atender. Enquanto isso, conta pra gente: o que você procura?"

/** Configuração das automações do CRM (vendas, apresentação e etiquetas). Só dona/administrador. */
export function AutomationsTab() {
  const [data, setData] = useState<CrmAutomations | null>(null)
  const [welcomeEnabled, setWelcomeEnabled] = useState(false)
  const [welcomeMessage, setWelcomeMessage] = useState("")
  const [skipPatients, setSkipPatients] = useState(true)
  const [rules, setRules] = useState<RuleForm[]>([])
  const [saving, setSaving] = useState<"welcome" | "rules" | "token" | null>(null)

  function apply(next: CrmAutomations) {
    setData(next)
    setWelcomeEnabled(next.welcomeEnabled)
    setWelcomeMessage(next.welcomeMessage || DEFAULT_WELCOME)
    setSkipPatients(next.welcomeSkipPatients)
    setRules(next.tagRules.map((r) => ({ keywords: r.keywords.join(", "), tag: r.tag })))
  }

  useEffect(() => {
    crmApi
      .getAutomations()
      .then(({ automations }) => apply(automations))
      .catch(() => toast.error("Não foi possível carregar as automações."))
  }, [])

  async function saveWelcome() {
    if (welcomeEnabled && !welcomeMessage.trim()) return toast.error("Escreva a mensagem de apresentação.")
    setSaving("welcome")
    try {
      const { automations } = await crmApi.saveAutomations({ welcomeEnabled, welcomeMessage, welcomeSkipPatients: skipPatients })
      apply(automations)
      toast.success(welcomeEnabled ? "Mensagem de apresentação ativada." : "Mensagem de apresentação salva (desativada).")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.")
    } finally {
      setSaving(null)
    }
  }

  async function saveRules() {
    const tagRules = rules
      .map((r) => ({
        keywords: r.keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        tag: r.tag.trim(),
      }))
      .filter((r) => r.keywords.length || r.tag)
    if (tagRules.some((r) => !r.keywords.length || !r.tag)) {
      return toast.error("Cada regra precisa de palavras-chave e de uma etiqueta.")
    }
    setSaving("rules")
    try {
      const { automations } = await crmApi.saveAutomations({ tagRules })
      apply(automations)
      toast.success("Etiquetas automáticas salvas.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.")
    } finally {
      setSaving(null)
    }
  }

  async function regenerate() {
    if (!window.confirm("Gerar um novo link? O link atual para de funcionar e precisa ser trocado na Hotmart/Kiwify.")) return
    setSaving("token")
    try {
      const { automations } = await crmApi.regenerateSalesToken()
      apply(automations)
      toast.success("Novo link gerado.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar o link.")
    } finally {
      setSaving(null)
    }
  }

  if (!data) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader2 className="animate-spin" />
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <ShoppingBag className="size-4 text-primary" />
            <h3 className="font-display text-base font-semibold">Compradoras entram no CRM</h3>
          </div>
          <p className="text-[13px] text-muted-foreground">
            Cole este link no webhook da Hotmart ou da Kiwify. A cada venda aprovada a compradora vira contato, ganha a
            etiqueta do produto e o card vai para a etapa de ganho do pipeline de produtos digitais. Carrinho abandonado
            entra na primeira etapa e reembolso vai para "Perdido". O destino de cada produto é ajustado em Funil →
            Produtos.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input readOnly value={data.salesWebhookUrl} className="font-mono text-[12px]" onFocus={(e) => e.target.select()} />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  navigator.clipboard
                    .writeText(data.salesWebhookUrl)
                    .then(() => toast.success("Link copiado."))
                    .catch(() => toast.error("Copie manualmente."))
                }
              >
                <Copy /> Copiar
              </Button>
              <Button variant="ghost" onClick={regenerate} disabled={saving === "token"} title="Gerar novo link">
                {saving === "token" ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              </Button>
            </div>
          </div>
          <ul className="list-disc space-y-1 pl-5 text-[12px] text-muted-foreground">
            <li>
              <strong>Hotmart:</strong> Ferramentas → Webhook (API e notificações) → Cadastrar webhook → versão 2.0.0,
              eventos de compra aprovada, completa, cancelada, reembolsada, chargeback e abandono de carrinho.
            </li>
            <li>
              <strong>Kiwify:</strong> Apps → Webhooks → Criar webhook, eventos Compra aprovada, Reembolso, Chargeback e
              Carrinho abandonado.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Zap className="size-4 text-primary" />
              <h3 className="font-display text-base font-semibold">Mensagem de apresentação</h3>
            </div>
            <Switch checked={welcomeEnabled} onCheckedChange={setWelcomeEnabled} aria-label="Ativar mensagem de apresentação" />
          </div>
          <p className="text-[13px] text-muted-foreground">
            Enviada automaticamente quando alguém manda a primeira mensagem para o WhatsApp da clínica. Use{" "}
            <code className="rounded bg-muted px-1">{"{nome}"}</code> para o primeiro nome.
          </p>
          <Textarea
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            className="min-h-[120px]"
            maxLength={2000}
          />
          <label className="flex items-center gap-2 text-[13px]">
            <Switch checked={skipPatients} onCheckedChange={setSkipPatients} /> Não enviar para quem já é paciente
          </label>
          <div className="flex justify-end">
            <Button onClick={saveWelcome} disabled={saving === "welcome"}>
              {saving === "welcome" && <Loader2 className="animate-spin" />} Salvar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <Tags className="size-4 text-primary" />
            <h3 className="font-display text-base font-semibold">Etiquetas automáticas</h3>
          </div>
          <p className="text-[13px] text-muted-foreground">
            Quando a mensagem recebida contém uma das palavras, o contato ganha a etiqueta. Não diferencia acentos nem
            maiúsculas.
          </p>
          <div className="space-y-2">
            {rules.length === 0 && (
              <p className="py-3 text-center text-[13px] text-muted-foreground">Nenhuma regra ainda.</p>
            )}
            {rules.map((rule, index) => (
              <div key={index} className="grid grid-cols-[1fr_130px_auto] items-end gap-2">
                <div>
                  {index === 0 && <Label className="text-[11px] text-muted-foreground">Palavras (separe por vírgula)</Label>}
                  <Input
                    value={rule.keywords}
                    placeholder="curso, mentoria, imersão"
                    onChange={(e) => setRules((rs) => rs.map((r, i) => (i === index ? { ...r, keywords: e.target.value } : r)))}
                  />
                </div>
                <div>
                  {index === 0 && <Label className="text-[11px] text-muted-foreground">Etiqueta</Label>}
                  <Input
                    value={rule.tag}
                    placeholder="interesse curso"
                    maxLength={40}
                    onChange={(e) => setRules((rs) => rs.map((r, i) => (i === index ? { ...r, tag: e.target.value } : r)))}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remover regra"
                  onClick={() => setRules((rs) => rs.filter((_, i) => i !== index))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={() => setRules((rs) => [...rs, { keywords: "", tag: "" }])}>
              <Plus /> Nova regra
            </Button>
            <Button onClick={saveRules} disabled={saving === "rules"}>
              {saving === "rules" && <Loader2 className="animate-spin" />} Salvar regras
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
