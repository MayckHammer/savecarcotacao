import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  session_id: z.string().trim().min(1).max(100),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const raw = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { session_id } = parsed.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: quote, error: dbErr } = await supabase
      .from("quotes")
      .select("crm_quotation_code, inspection_link, inspection_status")
      .eq("session_id", session_id)
      .single();

    if (dbErr || !quote) {
      return new Response(JSON.stringify({ error: "Quote not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (quote.inspection_link) {
      return new Response(JSON.stringify({
        inspection_link: quote.inspection_link,
        inspection_status: quote.inspection_status,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (quote.crm_quotation_code) {
      const token = Deno.env.get("POWERCRM_API_TOKEN");

      try {
        // First check the quotation state
        const qttnRes = await fetch(`https://api.powercrm.com.br/api/quotation/${quote.crm_quotation_code}`, {
          headers: { "Authorization": `Bearer ${token}` },
        });

        let inspLink: string | null = null;
        let canOpen = false;

        if (qttnRes.ok) {
          const qttnData = await qttnRes.json();
          inspLink = qttnData?.inspectionLink || qttnData?.inspection_link
            || qttnData?.data?.inspectionLink || qttnData?.negotiation?.inspectionLink || null;
          const pv = Number(qttnData?.protectedValue ?? 0);
          const hasAddr = !!(qttnData?.addressZipcode || qttnData?.addressAddress);
          canOpen = pv > 0 && hasAddr;
          console.log("Quotation state — pv:", pv, "hasAddr:", hasAddr, "inspLink:", !!inspLink);
        }

        // Auto-recovery: if no link yet but data is complete, try opening inspection
        if (!inspLink && canOpen) {
          console.log("Auto-recovery: opening inspection for", quote.crm_quotation_code);
          try {
            const inspRes = await fetch("https://api.powercrm.com.br/api/quotation/open-inspection", {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
              body: JSON.stringify({ quotationCode: quote.crm_quotation_code }),
            });
            const inspText = await inspRes.text();
            console.log("open-inspection (recovery):", inspRes.status, inspText.substring(0, 200));

            // Re-fetch to get the link
            await new Promise((r) => setTimeout(r, 1000));
            const qttnRes2 = await fetch(`https://api.powercrm.com.br/api/quotation/${quote.crm_quotation_code}`, {
              headers: { "Authorization": `Bearer ${token}` },
            });
            if (qttnRes2.ok) {
              const qttnData2 = await qttnRes2.json();
              inspLink = qttnData2?.inspectionLink || qttnData2?.inspection_link
                || qttnData2?.data?.inspectionLink || qttnData2?.negotiation?.inspectionLink || null;
            }
          } catch (recErr) {
            console.error("Recovery open-inspection error:", recErr);
          }
        }

        if (inspLink) {
          await supabase.from("quotes").update({
            inspection_link: inspLink,
            inspection_status: "released",
            last_crm_sync_at: new Date().toISOString(),
          }).eq("session_id", session_id);

          return new Response(JSON.stringify({
            inspection_link: inspLink,
            inspection_status: "released",
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } catch (e) {
        console.error("Error polling CRM for inspection link:", e);
      }
    }

    return new Response(JSON.stringify({
      inspection_link: null,
      inspection_status: quote.inspection_status,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Unexpected error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
