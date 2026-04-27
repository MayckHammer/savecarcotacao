## Validação FIPE

Confirmei direto na **API oficial da FIPE** (Parallelum) com os dados do veículo:

```text
SHINERAY XY 125 JET SS — 2025 — Gasolina
Código FIPE: 850036-3
Mês de referência: abril/2026
Valor oficial: R$ 9.136,00
```

Resposta crua:
```json
{"Valor":"R$ 9.136,00","Marca":"SHINERAY","Modelo":"XY 125 JET SS",
 "AnoModelo":2025,"CodigoFipe":"850036-3","MesReferencia":"abril de 2026"}
```

✅ O valor que apareceu no app está **100% correto** com a FIPE oficial.

## Por que apareceu "Nenhum plano disponível"

O CRM Power retornou planos vazios porque o card foi criado sem `mdl/mdlYr` (IDs internos do modelo/ano). O endpoint `/api/quotation/plansQuotation` precisa que o card já tenha o veículo identificado pelos IDs do CRM para calcular preços. Hoje:

- O `protectedValue` (R$ 9.136) chega no card ✅
- Mas `mdl=null, mdlYr=null` (visto no log do `submit-to-crm`) ❌
- Sem isso, o CRM responde "Nenhum plano disponível" → app cai no fallback estimado.

## Plano

### 1. Resolver `mdl/mdlYr` no `consulta-placa-crm`

Após a consulta da placa (que já entrega marca/modelo/ano via FIPE), chamar os endpoints do CRM para mapear nome → ID interno:

- `GET /api/quotation/cb?type={vehicleTypeId}` → marcas (id + nome)
- `GET /api/quotation/cm?cb={brandId}` → modelos da marca
- `GET /api/quotation/cmy?cm={modelId}` → anos disponíveis

Estratégia de match:
- **Marca**: normalização case-insensitive + remoção de sufixos (ex: `SHINERAY XY150-8` → `SHINERAY`).
- **Modelo**: substring + score (Levenshtein simples) entre nome FIPE (`XY 125 JET SS`) e nomes do CRM.
- **Ano**: match exato (`2025`); fallback para o ano mais próximo.

Cachear resultados em memória (já existe padrão `vehicleTypesCache`).

Retornar adicionalmente no JSON:
```json
"vehicle": { ...,
  "crmBrandId": 134,
  "crmModelId": 9876,
  "crmYearId": 2025014
}
```

### 2. Persistir os IDs no estado

- `src/contexts/QuoteContext.tsx`: adicionar `crmBrandId`, `crmModelId`, `crmYearId` ao tipo Vehicle.
- `src/pages/Quote.tsx`: gravar esses IDs no `updateVehicle` quando vierem do retorno.

### 3. Enviar `mdl/mdlYr` no `submit-to-crm`

No `updatePayload` do `/api/quotation/update`:
```typescript
if (vehicle.crmModelId) {
  updatePayload.mdl = Number(vehicle.crmModelId);
  updatePayload.carModel = Number(vehicle.crmModelId);
}
if (vehicle.crmYearId) {
  updatePayload.mdlYr = Number(vehicle.crmYearId);
  updatePayload.carModelYear = Number(vehicle.crmYearId);
}
if (vehicle.year) {
  const yr = parseInt(String(vehicle.year).split("/")[0], 10);
  if (yr) updatePayload.fabricationYear = yr;
}
if (vehicle.color) updatePayload.color = vehicle.color;
```

Fallback: se o frontend não tiver os IDs (caso manual), o `submit-to-crm` chama `cb/cm/cmy` para resolver antes do update.

Ampliar `verifyUpdate` para conferir `mdl != null` no retorno e logar quando persistir nulo.

### 4. Aplicar o plano com valores reais

Depois que `mdl/mdlYr` estiverem no card, o `get-crm-plans` deve voltar com planos reais. Hoje o retry já existe (4 tentativas, ~24s). Vou apenas:

- No `Result.tsx`: quando os planos chegam, mostrar toast "Plano calculado com valor FIPE oficial: R$ 9.136,00".
- No `PlanDetails.tsx`: o `FinancialSummary` já consome `crmPlans` via `getSubtotalWithoutDiscount` — vai pegar o COMPLETO automaticamente.
- Garantir que o `setPlanName("COMPLETO")` seja default ao chegar em `/detalhes` (já é).

### 5. Teste

Refazer cotação com placa `TEV3H48`:
- Logs do `consulta-placa-crm` devem mostrar `crmBrandId/crmModelId/crmYearId` resolvidos.
- Logs do `submit-to-crm` devem mostrar `mdl, mdlYr, color, fabricationYear` no payload.
- Logs do `get-crm-plans` devem retornar pelo menos um plano com preço.
- Tela `/resultado` deve mostrar o plano COMPLETO com valor real do CRM.

## Arquivos a alterar

- `supabase/functions/consulta-placa-crm/index.ts` — resolver IDs CRM (cb/cm/cmy) e retornar.
- `supabase/functions/submit-to-crm/index.ts` — incluir `mdl/mdlYr/color/fabricationYear` + fallback.
- `src/contexts/QuoteContext.tsx` — campos `crmBrandId/crmModelId/crmYearId`.
- `src/pages/Quote.tsx` — propagar IDs do retorno da placa.
- `src/pages/Result.tsx` — toast confirmando FIPE oficial quando planos chegam.

## Resultado esperado

1. Card no CRM preenchido com marca, modelo, ano modelo, ano fabricação, cor, placa, FIPE R$ 9.136 e tipo Moto.
2. `get-crm-plans` retorna planos reais (não cai em "Nenhum plano disponível").
3. Tela de resultado mostra o plano COMPLETO calculado com base na FIPE oficial confirmada.
