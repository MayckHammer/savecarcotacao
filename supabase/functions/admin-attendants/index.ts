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
  action: z.enum(["list", "create", "update", "delete"]),
  id: z.string().uuid().optional(),
  slug: z.string().optional(),
  name: z.string().min(1).max(100).optional(),
  phone: z.string().optional(),
  active: z.boolean().optional(),
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
