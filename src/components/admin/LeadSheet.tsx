import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Row = {
  id?: string; data_lead: string; nome: string; telefone: string; canal: string; campanha: string;
  tipo_veiculo: string; modelo_ano: string; consultora: string; status: string; observacoes: string;
};
type Field = keyof Omit<Row, "id">;

const CANAIS = ["Site", "Meta Ads", "Google Ads", "Orgânico", "Indicação", "WhatsApp", "Outro"];
const TIPOS = ["Carro Passeio", "Moto / Scooter", "Caminhão / VUC", "Veículo de App (Uber/99)", "Outro"];
const STATUS = ["Novo", "Em contato", "Cotação enviada", "Fechado", "Perdido"];

const today = () => new Date().toISOString().slice(0, 10);
const blank = (): Row => ({ data_lead: today(), nome: "", telefone: "", canal: "Site", campanha: "", tipo_veiculo: "", modelo_ano: "", consultora: "", status: "Novo", observacoes: "" });

export default function LeadSheet({ password, email }: { password: string; email: string }) {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [draft, setDraft] = useState<Row>(blank());
  const [consultoras, setConsultoras] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [fCons, setFCons] = useState("");
  const [fStatus, setFStatus] = useState("");

  const call = (body: Record<string, unknown>) =>
    supabase.functions.invoke("admin-lead-sheet", { body: { password, email, ...body } });

  const load = async () => {
    setLoading(true);
    const { data, error } = await call({ action: "list" });
    setLoading(false);
    if (error || data?.error) return toast({ title: "Erro ao carregar planilha", variant: "destructive" });
    setRows(data.rows);
    const names = new Set<string>((data.attendants ?? []).map((a: { name: string }) => a.name));
    data.rows.forEach((r: Row) => r.consultora && names.add(r.consultora));
    setConsultoras([...names]);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const save = async (row: Row) => {
    const key = row.id ?? "new";
    setSaving(key);
    const { data, error } = await call({ action: "upsert", row });
    setSaving(null);
    if (error || data?.error) { toast({ title: "Não foi possível salvar", variant: "destructive" }); return null; }
    setSavedAt(new Date().toLocaleTimeString("pt-BR"));
    return data.row as Row;
  };

  const editCell = (id: string, field: Field, value: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  const commit = (id: string) => { const r = rows.find((x) => x.id === id); if (r) save(r); };

  const commitDraft = async () => {
    if (!draft.nome.trim() && !draft.telefone.trim()) return;
    const saved = await save(draft);
    if (saved) { setRows((rs) => [saved, ...rs]); setDraft(blank()); }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta linha?")) return;
    const { data, error } = await call({ action: "delete", id });
    if (error || data?.error) return toast({ title: "Erro ao excluir", variant: "destructive" });
    setRows((rs) => rs.filter((r) => r.id !== id));
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) =>
      (!fCons || r.consultora === fCons) && (!fStatus || r.status === fStatus) &&
      (!q || [r.nome, r.telefone, r.modelo_ano, r.campanha, r.observacoes].some((v) => v?.toLowerCase().includes(q))));
  }, [rows, search, fCons, fStatus]);

  const exportCsv = () => {
    const head = ["Data do Lead", "Nome do Lead", "Telefone / WhatsApp", "Canal / Origem", "Campanha / Criativo", "Tipo de Veículo", "Modelo / Ano Veículo", "Consultora Responsável", "Status", "Observações"];
    const fields: Field[] = ["data_lead", "nome", "telefone", "canal", "campanha", "tipo_veiculo", "modelo_ano", "consultora", "status", "observacoes"];
    const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
    const csv = [head.map(esc).join(";"), ...filtered.map((r) => fields.map((f) => esc(r[f])).join(";"))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = `leads-${today()}.csv`; a.click();
  };

  const cell = "border border-border px-0 py-0 align-middle";
  const inp = "w-full bg-transparent px-2 py-1.5 text-sm outline-none focus:bg-primary/5 focus:ring-2 focus:ring-primary focus:ring-inset";
  const sel = "w-full bg-muted/60 rounded-full mx-1 my-1 px-2 py-0.5 text-xs outline-none focus:ring-2 focus:ring-primary cursor-pointer";

  const renderRow = (r: Row, idx: number | string, onChange: (f: Field, v: string) => void, onCommit: () => void, isDraft = false) => {
    const text = (f: Field, w: string, type = "text") => (
      <td className={`${cell} ${w}`}><input type={type} className={inp} value={r[f] ?? ""} onChange={(e) => onChange(f, e.target.value)} onBlur={onCommit} placeholder={isDraft && f === "nome" ? "Novo lead..." : ""} /></td>
    );
    const select = (f: Field, opts: string[], w: string) => (
      <td className={`${cell} ${w}`}>
        <select className={sel} value={r[f] ?? ""} onChange={(e) => { onChange(f, e.target.value); if (!isDraft && r.id) save({ ...r, [f]: e.target.value }); }}>
          <option value="">—</option>
          {[...new Set([...opts, r[f]].filter(Boolean))].map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </td>
    );
    return (
      <tr key={r.id ?? "draft"} className={isDraft ? "bg-primary/5" : "hover:bg-muted/30"}>
        <td className={`${cell} sticky left-0 bg-muted text-center text-xs text-muted-foreground w-10`}>{idx}</td>
        {text("data_lead", "min-w-[130px]", "date")}
        {text("nome", "min-w-[200px]")}
        {text("telefone", "min-w-[140px]")}
        {select("canal", CANAIS, "min-w-[140px]")}
        {text("campanha", "min-w-[180px]")}
        {select("tipo_veiculo", TIPOS, "min-w-[180px]")}
        {text("modelo_ano", "min-w-[200px]")}
        {select("consultora", consultoras, "min-w-[170px]")}
        {select("status", STATUS, "min-w-[140px]")}
        {text("observacoes", "min-w-[240px]")}
        <td className={`${cell} w-10 text-center`}>
          {isDraft ? (
            <button onClick={commitDraft} className="p-1 text-primary" aria-label="Adicionar"><Plus className="h-4 w-4" /></button>
          ) : (
            <button onClick={() => r.id && remove(r.id)} className="p-1 text-destructive" aria-label="Excluir"><Trash2 className="h-4 w-4" /></button>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Buscar nome, telefone, veículo..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={fCons} onChange={(e) => setFCons(e.target.value)}>
          <option value="">Todas as consultoras</option>
          {consultoras.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {STATUS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Atualizar
        </Button>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4" /> Exportar Excel</Button>
        <span className="ml-auto text-xs text-muted-foreground">
          {saving ? "Salvando..." : savedAt ? `Salvo às ${savedAt}` : ""} · {filtered.length} leads
        </span>
      </div>

      <div className="max-h-[70vh] overflow-auto rounded-md border border-border bg-card">
        <table className="w-max min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-primary text-primary-foreground">
              {["", "Data do Lead", "Nome do Lead", "Telefone / WhatsApp", "Canal / Origem", "Campanha / Criativo", "Tipo de Veículo", "Modelo / Ano Veículo", "Consultora Responsável", "Status", "Observações", ""].map((h, i) => (
                <th key={i} className="border border-border/30 px-2 py-2 text-center text-xs font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {renderRow(draft, "+", (f, v) => setDraft((d) => ({ ...d, [f]: v })), () => {}, true)}
            {filtered.map((r, i) => renderRow(r, i + 1, (f, v) => editCell(r.id!, f, v), () => commit(r.id!)))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
