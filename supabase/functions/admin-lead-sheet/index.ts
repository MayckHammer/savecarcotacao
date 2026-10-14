import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_EMAILS = [
  "mayckhammersavecar@gmail.com",
  "karolfernandessavecar@gmail.com",
  "keduzei@gmail.com",
];

const str = (max: number) => z.string().max(max).optional();
const RowSchema = z.object({
  id: z.string().uuid().optional(),
  data_lead: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  nome: str(200), telefone: str(30), canal: str(60), campanha: str(200),
  tipo_veiculo: str(60), modelo_ano: str(200), consultora: str(100),
  status: str(40), observacoes: str(2000),
});

const Schema = z.object({
  password: z.string().min(1),
  email: z.string().default(""),
  action: z.enum(["list", "upsert", "delete"]),
  row: RowSchema.optional(),
  id: z.string().uuid().optional(),
});

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function safeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const digits = (s: unknown) => String(s ?? "").replace(/\D/g, "");
const s = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

function mapVehicleType(v: unknown): string {
  const t = s(v).toLowerCase();
  if (!t) return "";
  if (t.includes("moto")) return "Moto / Scooter";
  if (t.includes("caminh") || t.includes("vuc")) return "Caminhão / VUC";
  if (t.includes("app") || t.includes("uber")) return "Veículo de App (Uber/99)";
  return "Carro Passeio";
}

// deno-lint-ignore no-explicit-any
async function importExisting(sb: any) {
  const { data: existing } = await sb.from("lead_sheet").select("telefone, origem_ref");
  const refs = new Set((existing ?? []).map((r: { origem_ref: string | null }) => r.origem_ref).filter(Boolean));
  const phones = new Set((existing ?? []).map((r: { telefone: string }) => digits(r.telefone)).filter(Boolean));
  const rows: Record<string, unknown>[] = [];
  const add = (r: Record<string, unknown>) => {
    const p = digits(r.telefone);
    if (refs.has(r.origem_ref)) return;
    if (p && phones.has(p)) return;
    if (p) phones.add(p);
    refs.add(r.origem_ref);
    rows.push(r);
  };

  const { data: quotes } = await sb.from("quotes").select("*").order("created_at", { ascending: true }).limit(2000);
  for (const q of quotes ?? []) {
    const pd = q.personal_data ?? {}; const vd = q.vehicle_data ?? {};
    const modelo = [vd.brand ?? vd.marca, vd.model ?? vd.modelo, vd.year ?? vd.ano].filter(Boolean).join(" ") || s(vd.plate ?? vd.placa);
    add({
      origem_ref: `quote:${q.id}`, data_lead: s(q.created_at).slice(0, 10), nome: s(pd.name), telefone: s(pd.phone),
      canal: "Site", tipo_veiculo: mapVehicleType(q.vehicle_type ?? vd.type), modelo_ano: modelo,
      consultora: s(q.attendant_slug), status: q.crm_submitted ? "Cotação enviada" : "Novo",
    });
  }
  const { data: leads } = await sb.from("partial_leads").select("*").order("created_at", { ascending: true }).limit(2000);
  for (const l of leads ?? []) {
    const vi = l.vehicle_info ?? {};
    const modelo = [vi.brand ?? vi.marca, vi.model ?? vi.modelo, vi.year ?? vi.ano].filter(Boolean).join(" ") || s(vi.plate ?? vi.placa);
    add({
      origem_ref: `lead:${l.id}`, data_lead: s(l.created_at).slice(0, 10), nome: s(l.name), telefone: s(l.phone),
      canal: "Site", tipo_veiculo: mapVehicleType(vi.vehicleType ?? vi.type), modelo_ano: modelo,
      consultora: s(l.attendant_slug), status: l.converted ? "Cotação enviada" : "Novo",
    });
  }
  if (rows.length) await sb.from("lead_sheet").insert(rows);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const parsed = Schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "invalid input", details: parsed.error.flatten().fieldErrors }, 400);
    const { password, email, action, row, id } = parsed.data;
    const expected = Deno.env.get("ADMIN_PASSWORD") || "";
    if (!expected || !ALLOWED_EMAILS.includes(email.trim().toLowerCase()) || !safeEq(password, expected)) {
      return json({ error: "unauthorized" }, 401);
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (action === "list") {
      await importExisting(sb);
      const [{ data, error }, { data: atts }] = await Promise.all([
        sb.from("lead_sheet").select("*").order("data_lead", { ascending: false }).order("created_at", { ascending: false }).limit(3000),
        sb.from("attendants").select("slug, name").order("name"),
      ]);
      if (error) return json({ error: error.message }, 500);
      return json({ rows: data ?? [], attendants: atts ?? [] });
    }
    if (action === "upsert") {
      if (!row) return json({ error: "row required" }, 400);
      const { id: rid, ...fields } = row;
      const q = rid
        ? sb.from("lead_sheet").update(fields).eq("id", rid).select().single()
        : sb.from("lead_sheet").insert(fields).select().single();
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 500);
      return json({ row: data });
    }
    if (!id) return json({ error: "id required" }, 400);
    const { error } = await sb.from("lead_sheet").delete().eq("id", id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
