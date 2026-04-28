# Correção do preenchimento FIPE no card do PowerCRM

Aplicar as descobertas validadas via DevTools do CRM (imagens 94–97) no fluxo `consulta-placa-crm`, sem mexer no contrato com o frontend nem na lógica de planos.

## O que muda

### 1. Trocar endpoint de modelos por `cmby` (marca + ano juntos)
- Em `fetchCrmModels`, passar a aceitar `year` e chamar `GET /quotation/cmby?cb={brandId}&cy={year}` quando o ano estiver disponível.
- Manter fallback para `/quotation/cm?cb={brandId}` se o `cmby` retornar vazio.
- Em `buildCrmModelOptions`, passar `targetYear` para `fetchCrmModels` antes de pontuar candidatos.
- Ajustar a chave de cache de modelos para incluir o ano (`${brandId}:${year}`).

**Por quê:** o Network do CRM mostra que o painel oficial usa `cmby` para listar modelos filtrados por marca + ano, retornando uma lista curta e precisa. Hoje usamos `cm` (só marca) e filtramos ano em JS, gerando lista enorme e matches imprecisos.

### 2. Update enxuto: `mdl` + `mdlYr` + `protectedValue` + `cdFp`
- No bloco `if (crmQuotationCode && selectedModel)`, manter o payload já enxuto e adicionar `cdFp` (código FIPE resolvido) quando disponível.
- Continua sem aliases poluídos (`vhclFipeVl`, `vlFipe`, etc.).

**Por quê:** o campo `vhclFipeVl` é `disabled` no card e calculado pelo backend do CRM a partir de `mdl + mdlYr`. Enviar `cdFp` ajuda o backend a fechar a conta sem precisar adivinhar.

### 3. Remover `triggerCrmFipeRefresh` e `fetchFipeCodeFromCrm`
- Apagar a chamada a `triggerCrmFipeRefresh` em duas posições (linhas ~715 e ~949).
- Apagar a função `triggerCrmFipeRefresh` (~linha 576) e a função `fetchFipeCodeFromCrm` (~linha 600).
- Remover `quotationFipeApi` de qualquer outra referência.

**Por quê:** o ícone que parecia ser "lupa do FIPE" é apenas um tooltip decorativo (`<i id="tooltipFipeUpdate" aria-hidden="true">`). Não existe gatilho manual de refresh FIPE no CRM. O endpoint `quotationFipeApi` não é o correto e está "atirando no escuro". Remover elimina ruído nos logs e latência inútil (~6s).

### 4. Manter o que já funciona
- Polling `getQuotation` após o update (até ~6s) — necessário para esperar o CRM calcular `vhclFipeVl`.
- Validação Zod do body.
- CORS, vehicleType resolution, `resolveCrmIds`.
- Enriquecimento via Parallelum (`fetchFipeByModelLabel`, `enrichFromFipeByCode`) para popular as opções de modelo apresentadas ao usuário.
- `get-crm-plans` permanece intocado (já lê `protectedValue` com fallback para `vhclFipeVl`).

## O que NÃO muda

- Frontend (`Quote.tsx`, `Result.tsx`, `QuoteContext`) — contrato preservado.
- `get-crm-plans` — sem alterações.
- Outras edge functions.
- Schema do banco.

## Arquivo modificado

- `supabase/functions/consulta-placa-crm/index.ts`

## Detalhes técnicos

```ts
// fetchCrmModels com cmby (marca + ano)
async function fetchCrmModels(token: string, brandId: number, year?: string): Promise<CrmItem[]> {
  const cacheKey = `${brandId}:${year || ""}`;
  if (modelsCache.has(cacheKey)) return modelsCache.get(cacheKey)!;
  try {
    const url = year
      ? `${CRM_BASE}/quotation/cmby?cb=${brandId}&cy=${encodeURIComponent(year)}`
      : `${CRM_BASE}/quotation/cm?cb=${brandId}`;
    const r = await fetch(url, { headers: { "Authorization": `Bearer ${token}` } });
    if (!r.ok) return [];
    const data = await r.json();
    let arr: CrmItem[] = Array.isArray(data) ? data : (data?.data || []);
    // Fallback se cmby vier vazio
    if (year && arr.length === 0) {
      const r2 = await fetch(`${CRM_BASE}/quotation/cm?cb=${brandId}`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (r2.ok) {
        const d2 = await r2.json();
        arr = Array.isArray(d2) ? d2 : (d2?.data || []);
      }
    }
    modelsCache.set(cacheKey, arr);
    return arr;
  } catch (e) { console.error("fetchCrmModels error:", e); return []; }
}

// buildCrmModelOptions passa o ano
const targetYear = String(vehicle.year || "").split("/")[0].trim();
const models = await fetchCrmModels(token, brandMatch.id, targetYear);

// Update payload com cdFp
const updateBody: Record<string, unknown> = {
  code: crmQuotationCode,
  plates: plate,
  mdl: Number(selectedModel.crmModelId),
  protectedValue: recomputedFipeValue || 0,
};
if (selectedModel.crmYearId) updateBody.mdlYr = Number(selectedModel.crmYearId);
if (recomputedFipeCode) updateBody.cdFp = recomputedFipeCode;
```

## Resultado esperado

- Card do CRM passa a mostrar `vhclFipeVl` preenchido após confirmação do modelo (CRM calcula sozinho com `mdl` + `mdlYr` + `cdFp` corretos).
- Lista de modelos candidatos fica menor e mais precisa graças ao `cmby`.
- Logs mais limpos (sem 404 de `quotationFipeApi`, sem aliases ignorados).
- Latência da confirmação reduzida (~3–6s a menos).

## Não resolvido neste plano

- Problema do `city` exigido pelo `get-crm-plans` quando o usuário ainda não preencheu o endereço (Step 3). É ortogonal e fica para outra rodada.
