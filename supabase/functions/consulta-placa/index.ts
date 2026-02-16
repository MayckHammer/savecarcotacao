import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FIPE_BASE = 'https://fipe.parallelum.com.br/api/v2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get('FIPE_ONLINE_TOKEN');
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token FIPE não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, brandCode, modelCode, yearCode } = await req.json();
    const headers = { 'X-Subscription-Token': token };

    let url = '';

    switch (action) {
      case 'brands':
        url = `${FIPE_BASE}/cars/brands`;
        break;
      case 'models':
        if (!brandCode) throw new Error('brandCode é obrigatório');
        url = `${FIPE_BASE}/cars/brands/${brandCode}/models`;
        break;
      case 'years':
        if (!brandCode || !modelCode) throw new Error('brandCode e modelCode são obrigatórios');
        url = `${FIPE_BASE}/cars/brands/${brandCode}/models/${modelCode}/years`;
        break;
      case 'price':
        if (!brandCode || !modelCode || !yearCode) throw new Error('brandCode, modelCode e yearCode são obrigatórios');
        url = `${FIPE_BASE}/cars/brands/${brandCode}/models/${modelCode}/years/${yearCode}`;
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Ação inválida. Use: brands, models, years ou price' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`FIPE API error (${response.status}):`, errorText);
      return new Response(
        JSON.stringify({ error: 'Erro ao consultar API FIPE. Tente novamente.' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao consultar API FIPE. Tente novamente.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
