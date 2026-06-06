import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const slugRe = /^[a-z0-9][a-z0-9-]{1,40}$/;

const ActionSchema = z.object({
  password: z.string().min(1),
  action: z.enum(["list", "create", "update", "delete", "report"]),
  id: z.string().uuid().optional(),
  slug: z.string().optional(),
  name: z.string().min(1).max(100).optional(),
  phone: z.string().optional(),
  active: z.boolean().optional(),
  days: z.number().int().min(1).max(365).optional(),
});

const normalizePhone = (s: string) => s.replace(/\D/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const raw = await req.json().catch(() => null);
    const parsed = ActionSchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "invalid input", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const adminPwd = Deno.env.get("ADMIN_PASSWORD");
    if (!adminPwd || parsed.data.password !== adminPwd) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { action } = parsed.data;

    if (action === "list") {
      const { data, error } = await supabase
        .from("attendants")
        .select("id, slug, name, phone, active, created_at, updated_at")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // count leads per attendant
      const { data: counts } = await supabase
        .from("quotes")
        .select("attendant_slug")
        .not("attendant_slug", "is", null);
      const tally: Record<string, number> = {};
      (counts || []).forEach((q: { attendant_slug: string | null }) => {
        if (q.attendant_slug) tally[q.attendant_slug] = (tally[q.attendant_slug] || 0) + 1;
      });

      return new Response(
        JSON.stringify({
          attendants: (data || []).map((a) => ({ ...a, leads: tally[a.slug] || 0 })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "create") {
      const slug = (parsed.data.slug || "").trim().toLowerCase();
      const name = (parsed.data.name || "").trim();
      const phone = normalizePhone(parsed.data.phone || "");
      if (!slugRe.test(slug)) {
        return new Response(JSON.stringify({ error: "slug inválido (use letras minúsculas, números e -)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!name) {
        return new Response(JSON.stringify({ error: "nome obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!/^[0-9]{10,15}$/.test(phone)) {
        return new Response(JSON.stringify({ error: "telefone inválido (somente dígitos, com DDD)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await supabase
        .from("attendants")
        .insert({ slug, name, phone, active: parsed.data.active ?? true })
        .select()
        .single();
      if (error) {
        const msg = error.message?.includes("attendants_slug_key") ? "slug já existe" : error.message;
        return new Response(JSON.stringify({ error: msg }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ attendant: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      if (!parsed.data.id) {
        return new Response(JSON.stringify({ error: "id obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const patch: Record<string, unknown> = {};
      if (parsed.data.name !== undefined) patch.name = parsed.data.name.trim();
      if (parsed.data.phone !== undefined) {
        const phone = normalizePhone(parsed.data.phone);
        if (!/^[0-9]{10,15}$/.test(phone)) {
          return new Response(JSON.stringify({ error: "telefone inválido" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        patch.phone = phone;
      }
      if (parsed.data.active !== undefined) patch.active = parsed.data.active;
      const { data, error } = await supabase
        .from("attendants")
        .update(patch)
        .eq("id", parsed.data.id)
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ attendant: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      if (!parsed.data.id) {
        return new Response(JSON.stringify({ error: "id obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase.from("attendants").delete().eq("id", parsed.data.id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "report") {
      const days = parsed.data.days ?? 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const [{ data: atts }, { data: rows }] = await Promise.all([
        supabase.from("attendants").select("slug, name, phone, active"),
        supabase
          .from("quotes")
          .select("attendant_slug, crm_submitted, inspection_status, created_at")
          .gte("created_at", since),
      ]);

      type Stat = {
        slug: string;
        name: string;
        active: boolean;
        leads: number;
        crm: number;
        released: number;
        approved: number;
        rejected: number;
        pending: number;
        conversion: number; // approved / leads
      };

      const byKey: Record<string, Stat> = {};
      const ensure = (slug: string, name: string, active = true): Stat => {
        if (!byKey[slug]) {
          byKey[slug] = {
            slug, name, active,
            leads: 0, crm: 0, released: 0, approved: 0, rejected: 0, pending: 0, conversion: 0,
          };
        }
        return byKey[slug];
      };

      (atts || []).forEach((a) => ensure(a.slug, a.name, a.active));
      // bucket for leads without attendant
      ensure("__direct__", "Sem atendente (link direto)", true);

      (rows || []).forEach((q: any) => {
        const slug = q.attendant_slug || "__direct__";
        const stat = ensure(slug, slug === "__direct__" ? "Sem atendente (link direto)" : slug);
        stat.leads++;
        if (q.crm_submitted) stat.crm++;
        const s = q.inspection_status;
        if (s === "approved") stat.approved++;
        else if (s === "rejected") stat.rejected++;
        else if (s === "released") stat.released++;
        else stat.pending++;
      });

      const report = Object.values(byKey)
        .map((s) => ({ ...s, conversion: s.leads ? Math.round((s.approved / s.leads) * 1000) / 10 : 0 }))
        .sort((a, b) => b.leads - a.leads);

      const totals = report.reduce(
        (acc, s) => {
          acc.leads += s.leads; acc.crm += s.crm; acc.released += s.released;
          acc.approved += s.approved; acc.rejected += s.rejected; acc.pending += s.pending;
          return acc;
        },
        { leads: 0, crm: 0, released: 0, approved: 0, rejected: 0, pending: 0 },
      );

      return new Response(
        JSON.stringify({ report, totals, days, since }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-attendants error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
