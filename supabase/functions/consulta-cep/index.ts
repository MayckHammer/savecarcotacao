const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (res.ok) return res;
    if (i < retries - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
  }
  throw new Error('All retries failed');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cep } = await req.json();
    const clean = (cep || '').replace(/\D/g, '');

    if (clean.length !== 8) {
      return new Response(JSON.stringify({ error: 'CEP inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try ViaCEP first
    try {
      const res = await fetchWithRetry(`https://viacep.com.br/ws/${clean}/json/`);
      const text = await res.text();
      const data = JSON.parse(text);
      if (!data.erro) {
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (e) {
      console.error('ViaCEP failed:', e.message);
    }

    // Fallback: BrasilAPI
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${clean}`);
      if (res.ok) {
        const d = await res.json();
        const mapped = {
          logradouro: d.street || '',
          bairro: d.neighborhood || '',
          localidade: d.city || '',
          uf: d.state || '',
          cep: d.cep || clean,
        };
        return new Response(JSON.stringify(mapped), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      await res.text(); // consume body
    } catch (e) {
      console.error('BrasilAPI failed:', e.message);
    }

    return new Response(JSON.stringify({ erro: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
