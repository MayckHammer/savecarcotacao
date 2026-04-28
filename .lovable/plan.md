## Objetivo

Descobrir o formato exato da resposta do endpoint `GET /api/quotation/quotationFipeApi?quotationCode=XXX` da PowerCRM (que dispara o cálculo FIPE — equivalente API ao botão "Salvar"), pra depois integrar na `consulta-placa-crm` e finalizar o fluxo automatizado.

## Como vou fazer

### Passo 1 — Criar edge function temporária `test-crm-fipe-api`

Função única e descartável que:
1. Lê o secret `POWERCRM_API_TOKEN` (já existe no projeto)
2. Recebe um `quotationCode` via query param (default: `q11LLmpq`)
3. Chama `GET https://api.powercrm.com.br/api/quotation/quotationFipeApi?quotationCode=XXX` com `Authorization: Bearer ${POWERCRM_API_TOKEN}`
4. Devolve no response:
   - `status` HTTP da PowerCRM
   - `headers` da resposta
   - `body` completo (JSON ou texto bruto)
5. Loga tudo para inspeção via `edge_function_logs`

### Passo 2 — Executar via `curl_edge_functions`

Vou rodar 2 testes em sequência:
- `?quotationCode=q11LLmpq` (card recente que sabemos que existe)
- `?quotationCode=DnKN1l8r` (card de referência da placa `PAI0F65`)

### Passo 3 — Analisar a resposta

Procurando no JSON retornado:
- Onde vem o **valor FIPE calculado** (ex: `vhclFipeVl`, `protectedValue`, `fipeValue`)
- Onde vem o **código FIPE** confirmado (ex: `codFipe`)
- Status do cálculo (síncrono ou assíncrono)
- Se precisa de polling depois

### Passo 4 — Integrar na `consulta-placa-crm`

Com o formato em mãos, adiciono na sequência atual da edge function principal:

```text
1. POST /quotation/add                      → cria card (já fazemos)
2. POST /quotation/add-tag                  → tag "30 Seg" (já fazemos)
3. POST /quotation/update                   → preenche dados (já fazemos)
4. GET  /quotation/quotationFipeApi?...     ← NOVO: dispara cálculo FIPE
5. (opcional) polling em /quotation/{code}  → confirma vhclFipeVl > 0
6. Devolve ao app com crmFipeConfirmed=true
```

### Passo 5 — Limpar

Deletar a função `test-crm-fipe-api` após confirmar que tudo funciona.

## Detalhes técnicos

**Arquivo novo (temporário):** `supabase/functions/test-crm-fipe-api/index.ts`

```ts
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  
  const url = new URL(req.url);
  const quotationCode = url.searchParams.get("quotationCode") || "q11LLmpq";
  const token = Deno.env.get("POWERCRM_API_TOKEN")!;
  
  const crmRes = await fetch(
    `https://api.powercrm.com.br/api/quotation/quotationFipeApi?quotationCode=${quotationCode}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
  );
  
  const text = await crmRes.text();
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = text; }
  
  console.log(`quotationFipeApi(${quotationCode}) → ${crmRes.status}`);
  console.log("Headers:", JSON.stringify([...crmRes.headers.entries()]));
  console.log("Body:", text.substring(0, 2000));
  
  return new Response(JSON.stringify({
    status: crmRes.status,
    headers: Object.fromEntries(crmRes.headers.entries()),
    body,
  }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
```

**Arquivo a editar depois:** `supabase/functions/consulta-placa-crm/index.ts` — adicionar função `triggerCrmFipeCalculation(token, quotationCode)` e chamar após o `quotation/update`.

**Arquivo a deletar no final:** `supabase/functions/test-crm-fipe-api/` (via `delete_edge_functions`).

## Riscos

- Se o endpoint retornar 401/403, significa que ele também precisa de cookie de sessão (não Bearer) → caímos na Opção A original (você pega o token na PowerCRM e tentamos via "Try It!" ou outro endpoint REST).
- Se retornar 200 mas vazio, pode ser cálculo assíncrono → adiciono polling.
- Se retornar HTML (login page), confirma que `/api/...` aceita Bearer mas `/company/...` não — e esse endpoint específico pode estar no path errado.

## Resultado esperado

Em 2-3 minutos você recebe:
1. JSON completo da resposta do endpoint
2. Confirmação se Bearer funciona nele
3. Plano final para integrar na `consulta-placa-crm`

Aprovando, eu já crio a função, deploy, executo e te mando o resultado.