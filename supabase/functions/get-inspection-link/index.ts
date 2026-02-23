import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();

    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the quote from DB
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

    // If we already have an inspection link, return it
    if (quote.inspection_link) {
      return new Response(JSON.stringify({
        inspection_link: quote.inspection_link,
        inspection_status: quote.inspection_status,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to fetch from CRM negotiation if we have the quotation code
    if (quote.crm_quotation_code) {
      const token = Deno.env.get("POWERCRM_API_TOKEN");
      
      try {
        // Try fetching negotiation info to find inspection link
        // The CRM quotation response included a negotiation code, check if there's data
        const qttnRes = await fetch(`https://api.powercrm.com.br/api/quotation/${quote.crm_quotation_code}`, {
          headers: { "Authorization": `Bearer ${token}` },
        });
        
        if (qttnRes.ok) {
          const qttnData = await qttnRes.json();
          console.log("Quotation poll data:", JSON.stringify(qttnData, null, 2));
          
          const inspLink = qttnData?.inspectionLink || qttnData?.inspection_link 
            || qttnData?.data?.inspectionLink || qttnData?.negotiation?.inspectionLink || null;
          
          if (inspLink) {
            await supabase.from("quotes").update({
              inspection_link: inspLink,
              inspection_status: "released",
            }).eq("session_id", session_id);

            return new Response(JSON.stringify({
              inspection_link: inspLink,
              inspection_status: "released",
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else {
          const errText = await qttnRes.text();
          console.log("Quotation fetch failed:", qttnRes.status, errText);
        }
      } catch (e) {
        console.error("Error polling CRM for inspection link:", e);
      }
    }

    // No link found yet
    return new Response(JSON.stringify({
      inspection_link: null,
      inspection_status: quote.inspection_status,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Unexpected error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
