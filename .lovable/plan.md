## Causa raiz confirmada pelo print + swagger

O endpoint `GET /api/quotation/quotationFipeApi?quotationCode=...` que aparece no print está sendo chamado corretamente. O problema **não é a "lupa"** — é o **payload do `/quotation/update`**.

O schema oficial `QuotationUpdateRequest` (em `tmp/swagger.json`) aceita **apenas 3 campos** ligados ao veículo/FIPE:

| Campo | Tipo | Significado |
|---|---|---|
| `mdl` | integer | ID do modelo no CRM |
| `mdlYr` | integer | ID do ano no CRM |
| `protectedValue` | number | **Valor da FIPE (campo oficial)** |

Hoje a função `consulta-placa-crm` envia 9 aliases (`vhclFipeVl`, `vlFipe`, `fipeValue`, `cdFp`, `codFipe`, etc.). O CRM **ignora silenciosamente** todos eles e por isso o card nunca recebe o valor.

## Correção

### 1. `supabase/functions/consulta-placa-crm/index.ts` — limpar payload de update

Substituir o `updateBody` (linhas ~690–740) por **somente os 3 campos do schema oficial**, mais os campos de placa/identificação que a função já usa hoje:

```ts
const updateBody: Record<string, unknown> = {
  code: crmQuotationCode,
  plates: vehicle.plate,
  mdl: selectedModel.crmModelId,            // ID modelo CRM
  mdlYr: selectedModel.crmYearId,            // ID ano CRM
  protectedValue: recomputedFipeValue || 0,  // valor FIPE oficial
};
```

Remover o segundo update "FIPE-only" (com `cdFp`, `codFipe`, `vhclFipeVl`, etc.) — esses campos não existem no schema e poluem logs.

### 2. Sequência correta de chamadas (ordem importa)

Após o `update` enxuto, o CRM precisa calcular o `cdFp` internamente. A sequência válida é:

```text
1. POST /api/quotation/update    { code, plates, mdl, mdlYr, protectedValue }
2. GET  /api/quotation/quotationFipeApi?quotationCode={code}   ← dispara cálculo FIPE
3. GET  /api/quotation/{code}     ← polling até confirmar persistência
```

### 3. Polling de verificação — ler o campo correto

Em `getQuotation`, ler `protectedValue` (campo oficial) como fonte primária. Manter leitura dos aliases apenas como fallback de exibição:

```ts
crmFipeValue = parseFipeValue(verify.protectedValue ?? verify.vhclFipeVl ?? verify.vlFipe);
```

### 4. `get-crm-plans` — usar `protectedValue` como base de cálculo

Quando o plano vier do CRM, validar consistência com `protectedValue` da cotação em vez de `vhclFipeVl`.

### 5. Logs

Adicionar log explícito antes do update mostrando exatamente os 3 campos enviados, para confirmar nos próximos testes que o CRM agora recebe `protectedValue` corretamente.

## Arquivos a alterar

- `supabase/functions/consulta-placa-crm/index.ts` — payload de update + sequência de chamadas
- `supabase/functions/get-crm-plans/index.ts` — leitura via `protectedValue`

## Verificação após deploy

1. Refazer cotação com placa real.
2. Confirmar nos logs: 1 chamada `update` (200), 1 `quotationFipeApi` (200), polling com `protectedValue > 0`.
3. Abrir o card no Power CRM e confirmar que o campo "Valor FIPE" aparece preenchido.
