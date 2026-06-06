import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Camera, Loader2, Plus, Trash2, Copy, Power, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Quote {
  id: string;
  session_id: string;
  personal_data: { name?: string; phone?: string; email?: string; cpf?: string };
  vehicle_data: { plate?: string; model?: string; brand?: string; year?: string };
  inspection_status: string;
  inspection_link: string | null;
  crm_submitted: boolean;
  crm_quotation_code: string | null;
  created_at: string;
}

interface Attendant {
  id: string;
  slug: string;
  name: string;
  phone: string;
  active: boolean;
  created_at: string;
  leads?: number;
}

const Admin = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [linkInputs, setLinkInputs] = useState<Record<string, string>>({});
  const [updating, setUpdating] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Attendants tab state
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creating, setCreating] = useState(false);

  // Report tab state
  interface ReportRow {
    slug: string; name: string; active: boolean;
    leads: number; crm: number; released: number;
    approved: number; rejected: number; pending: number; conversion: number;
  }
  const [report, setReport] = useState<ReportRow[]>([]);
  const [totals, setTotals] = useState<{ leads: number; crm: number; released: number; approved: number; rejected: number; pending: number } | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportDays, setReportDays] = useState(30);

  const handleLogin = async () => {
    setLoginError(null);
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-list-quotes", {
      body: { password },
    });
    setLoading(false);
    if (error || !data?.quotes) {
      setLoginError("Senha incorreta.");
      return;
    }
    setAuthenticated(true);
    setQuotes(data.quotes as Quote[]);
    loadAttendants();
  };

  const fetchQuotes = async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke("admin-list-quotes", {
      body: { password },
    });
    setQuotes((data?.quotes as Quote[]) || []);
    setLoading(false);
  };

  const updateStatus = async (sessionId: string, status: string, link?: string) => {
    setUpdating(sessionId);
    const body: Record<string, string> = { session_id: sessionId, inspection_status: status };
    if (link) body.inspection_link = link;
    await supabase.functions.invoke("update-inspection", { body });
    await fetchQuotes();
    setUpdating(null);
  };

  const loadAttendants = async () => {
    setAttLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-attendants", {
      body: { password, action: "list" },
    });
    setAttLoading(false);
    if (error) {
      toast.error("Falha ao carregar atendentes");
      return;
    }
    setAttendants((data?.attendants as Attendant[]) || []);
  };

  const createAttendant = async () => {
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("admin-attendants", {
      body: { password, action: "create", slug: newSlug, name: newName, phone: newPhone },
    });
    setCreating(false);
    if (error || data?.error) {
      toast.error(data?.error || "Falha ao criar");
      return;
    }
    toast.success("Atendente criado");
    setNewSlug(""); setNewName(""); setNewPhone("");
    loadAttendants();
  };

  const loadReport = async (days = reportDays) => {
    setReportLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-attendants", {
      body: { password, action: "report", days },
    });
    setReportLoading(false);
    if (error) { toast.error("Falha ao carregar relatório"); return; }
    setReport((data?.report as ReportRow[]) || []);
    setTotals(data?.totals || null);
  };

  const toggleActive = async (a: Attendant) => {
    await supabase.functions.invoke("admin-attendants", {
      body: { password, action: "update", id: a.id, active: !a.active },
    });
    loadAttendants();
  };

  const deleteAttendant = async (a: Attendant) => {
    if (!confirm(`Excluir atendente ${a.name}?`)) return;
    await supabase.functions.invoke("admin-attendants", {
      body: { password, action: "delete", id: a.id },
    });
    loadAttendants();
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado: " + url);
  };

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="p-6 space-y-4">
            <h1 className="text-lg font-bold text-foreground text-center">Admin — Save Car</h1>
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            {loginError && <p className="text-xs text-destructive text-center">{loginError}</p>}
            <Button onClick={handleLogin} disabled={loading} className="w-full">
              {loading ? "Verificando..." : "Entrar"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      pending: { label: "Pendente", className: "bg-yellow-100 text-yellow-800" },
      released: { label: "Liberada", className: "bg-blue-100 text-blue-800" },
      approved: { label: "Aprovada", className: "bg-green-100 text-green-800" },
      rejected: { label: "Reprovada", className: "bg-red-100 text-red-800" },
    };
    const config = map[status] || map.pending;
    return <span className={`text-xs font-semibold px-2 py-1 rounded-full ${config.className}`}>{config.label}</span>;
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      <h1 className="text-xl font-bold text-foreground">Admin — Save Car</h1>
      <Tabs defaultValue="vistorias">
        <TabsList>
          <TabsTrigger value="vistorias">Vistorias</TabsTrigger>
          <TabsTrigger value="atendentes">Atendentes</TabsTrigger>
          <TabsTrigger value="relatorio" onClick={() => loadReport()}>Relatório</TabsTrigger>
        </TabsList>

        <TabsContent value="vistorias" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={fetchQuotes}>Atualizar</Button>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : quotes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Nenhuma cotação encontrada.</p>
          ) : (
            quotes.map((q) => (
              <Card key={q.id} className="border-border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">{q.personal_data?.name || "Sem nome"}</p>
                      <p className="text-xs text-muted-foreground">{q.personal_data?.phone}</p>
                      <p className="text-xs text-muted-foreground">{q.vehicle_data?.model} — {q.vehicle_data?.plate}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(q.created_at).toLocaleDateString("pt-BR")} {new Date(q.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {q.crm_submitted && (
                        <p className="text-xs text-green-600 mt-1">✓ Cotação registrada {q.crm_quotation_code ? `(${q.crm_quotation_code})` : ""}</p>
                      )}
                    </div>
                    {statusBadge(q.inspection_status)}
                  </div>

                  {(q.inspection_status === "pending" || q.inspection_status === "released") && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Link da vistoria (appvisto.link/...)"
                        value={linkInputs[q.session_id] ?? q.inspection_link ?? ""}
                        onChange={(e) => setLinkInputs((prev) => ({ ...prev, [q.session_id]: e.target.value }))}
                        className="text-xs"
                      />
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {q.inspection_status === "pending" && (
                      <Button size="sm" variant="outline" disabled={updating === q.session_id}
                        onClick={() => updateStatus(q.session_id, "released", linkInputs[q.session_id] || q.inspection_link || undefined)}>
                        <Camera className="h-3 w-3 mr-1" />Liberar Vistoria
                      </Button>
                    )}
                    {(q.inspection_status === "pending" || q.inspection_status === "released") && (
                      <>
                        <Button size="sm" disabled={updating === q.session_id} onClick={() => updateStatus(q.session_id, "approved")}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />Aprovar
                        </Button>
                        <Button size="sm" variant="destructive" disabled={updating === q.session_id} onClick={() => updateStatus(q.session_id, "rejected")}>
                          <XCircle className="h-3 w-3 mr-1" />Reprovar
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="atendentes" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <h2 className="text-sm font-bold">Adicionar atendente</h2>
              <p className="text-xs text-muted-foreground">
                O link de cada atendente é: <code>{window.location.origin}/&lt;slug&gt;</code>. Tudo o que for WhatsApp no site usará o número desse atendente quando o cliente entrar pelo link dele.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="slug">Slug do link</Label>
                  <Input id="slug" placeholder="josi" value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
                </div>
                <div>
                  <Label htmlFor="att-name">Nome</Label>
                  <Input id="att-name" placeholder="Josi" value={newName} onChange={(e) => setNewName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="att-phone">WhatsApp (com DDI 55)</Label>
                  <Input id="att-phone" placeholder="5534992621339" value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ""))} />
                </div>
              </div>
              <Button onClick={createAttendant} disabled={creating || !newSlug || !newName || !newPhone}>
                {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Adicionar
              </Button>
            </CardContent>
          </Card>

          {attLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : attendants.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum atendente cadastrado.</p>
          ) : (
            attendants.map((a) => (
              <Card key={a.id} className={a.active ? "" : "opacity-60"}>
                <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold">{a.name} <span className="text-xs text-muted-foreground">/{a.slug}</span></p>
                    <p className="text-xs text-muted-foreground">WhatsApp: {a.phone}</p>
                    <p className="text-xs text-muted-foreground">Leads atribuídos: {a.leads ?? 0}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => copyLink(a.slug)}>
                      <Copy className="h-3 w-3 mr-1" />Copiar link
                    </Button>
                    <label className="flex items-center gap-1 text-xs">
                      <Switch checked={a.active} onCheckedChange={() => toggleActive(a)} />
                      <Power className="h-3 w-3" />
                    </label>
                    <Button size="sm" variant="destructive" onClick={() => deleteAttendant(a)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
