## Objetivo

Fazer com que, ao colocar a placa no nosso app, o backend execute exatamente os mesmos 4 passos que o operador faz no PowerCRM (lupa, estado, cidade, salvar) — usando os endpoints e payloads **confirmados nos prints do DevTools**. Resultado: os planos COMPLETO e PREMIUM passam a vir com valor FIPE real do CRM.

## O que os prints confirmaram

1. **Salvar do card** (`updateQuotationVehicleData`) usa o payload exato:
   - `quotationId` (numérico, ex: 41338865)
   - `plates`, `chassi`, `engineNumber` (vindos da lupa)
   - `carModel` (ID interno do modelo no CRM, ex: "603" — não é FIPE code)
   - `carModelYear` (ex: "2015")
   - `city` (ID numérico da cidade, ex: "2389" para Uberlândia)
   - `protectedValue: null` (CRM calcula sozinho)
   - `fuel: null`, `shift: null`, `workVehicle: false`

2. **Cidades por estado**: `GET /company/ct?st={stateId}` (ex: `st=11` = Minas Gerais) retorna a lista pré-carregada — não há autocomplete por digitação.

3. **Estado**: precisa virar **stateId numérico** (MG=11, SP=26 etc.) antes da chamada `ct?st=`.

## Mudanças no `consulta-placa-crm`

### 1. Adicionar tabela fixa UF → stateId do CRM

O CRM usa IDs próprios para os estados (visto que `st=11` retornou cidades de MG). Cabe uma constante no edge function:

```ts
const CRM_STATE_IDS: Record<string, number> = {
  AC: 1, AL: 2, AP: 3, AM: 4, BA: 5, CE: 6, DF: 7, ES: 8, GO: 9,
  MA: 10, MG: 11, MS: 12, MT: 13, PA: 14, PB: 15, PR: 16, PE: 17,
  PI: 18, RJ: 19, RN: 20, RS: 21, RO: 22, RR: 23, SC: 24, SE: 25,
  SP: 26, TO: 27,
};
```

(Vou validar com 1-2 chamadas reais de teste durante a implementação chamando `ct?st=N` para diferentes números até casar com cidades conhecidas, e ajustar a tabela se necessário.)

### 2. Trocar `fetchCrmCities` para usar **stateId numérico**

Hoje o código tenta `ct?st=MG` (sigla). O CRM espera o ID. Substituir por:
```
GET https://app.powercrm.com.br/company/ct?st={CRM_STATE_IDS[uf]}&_={timestamp}
```
com tentativa Bearer + Cookie como já fazemos. Isso faz `resolveCrmCityId` finalmente devolver IDs reais (ex: 2389 para Uberlândia).

### 3. Corrigir `saveCrmVehicleData` — passar `city` numérico

No payload atual está enviando `city: null` fixo. Trocar para receber o `cityId` resolvido e enviar:
```ts
city: resolvedCityId != null ? String(resolvedCityId) : null,
```

### 4. Chamar `saveCrmVehicleData` no fluxo do modelo selecionado

Hoje `saveCrmVehicleData` está definida mas **não é chamada** no branch `selectedModel` (linhas 920-1062). É chamada só no fluxo automático. Vou:
- Resolver `cityId` via `resolveCrmCityId(token, address.state, address.city)` 
- Chamar `saveCrmVehicleData(token, quotationCode, quotationId, vehicle, ids, plate, lupaData)` **logo após** o `/quotation/update` enxuto, antes do `triggerCrmFipeCalculation`
- Garantir que o `quotationId` numérico seja recuperado via `getQuotation` se ainda não estiver disponível no contexto (precisa ser persistido junto com `crmQuotationCode` no app — ver passo 6)

### 5. Persistir `quotationId` numérico

Hoje o app guarda só `crmQuotationCode` (alfanumérico). O endpoint `/company/updateQuotationVehicleData` precisa do **ID numérico** (`quotationId`). Vou:
- Adicionar `crmQuotationId: number | null` ao `QuoteContext`
- Salvar na tabela `quotes` (coluna nova `crm_quotation_id bigint nullable` via migration)
- Devolver `quotationId` na resposta da primeira chamada do `consulta-placa-crm` (já é capturado, só não retornado)
- Re-enviar do frontend na segunda chamada (quando o usuário escolhe o modelo)

### 6. Garantir que `get-crm-plans` veja `cityId`

O `fetchPlansByModelRequest` (fallback) já lê `qData.city`. Com o `updateQuotationVehicleData` setando o `city` corretamente, o CRM vai persistir e os planos virão com FIPE real. O caminho principal (`plansQuotation`) também passa a funcionar porque a cotação fica completa.

## Resumo do fluxo final

```text
1. Usuário digita placa
   → consulta-placa-crm cria quotation (quotationCode + quotationId)
   → lupa CRM (pltVrfyQttn) traz chassi/engineNumber
   → resolveCrmIds traz crmModelId
   → devolve modelOptions + quotationId pro frontend

2. Usuário escolhe modelo (Quote.tsx) e endereço
   → consulta-placa-crm (segunda chamada com selectedModel + address)
     a. resolveCrmCityId(state, city) → cityId numérico
     b. /quotation/update enxuto (mdl + mdlYr)
     c. /company/updateQuotationVehicleData (payload exato dos prints, com city)
     d. quotationFipeApi → fipeRealCode + valor
   → devolve recomputed FIPE pro frontend

3. PlanDetails monta → get-crm-plans
   → plansQuotation devolve COMPLETO/PREMIUM com valores reais
```

## Arquivos a editar

- `supabase/functions/consulta-placa-crm/index.ts` — itens 1-4 acima
- `src/contexts/QuoteContext.tsx` — adicionar `crmQuotationId`
- `src/pages/Quote.tsx` — re-enviar `crmQuotationId` na segunda chamada
- Migration nova: `ALTER TABLE quotes ADD COLUMN crm_quotation_id bigint;`

## Validação

Após implementar, vou:
1. Deploy do edge function
2. Tail dos logs (`supabase--edge_function_logs consulta-placa-crm`)
3. Testar com a placa PAI0F65 + MG/Uberlândia via curl direto do edge function
4. Confirmar que `updateQuotationVehicleData` retorna 200, `getQuotation` mostra `city: 2389`, e `plansQuotation` devolve COMPLETO/PREMIUM com valor

Se algum stateId estiver errado na tabela hardcoded, ajusto na hora com mais 1-2 testes.

## Risco / observação

A tabela `CRM_STATE_IDS` é a única parte chutada — todos os outros valores vêm direto dos prints. Se o CRM usar IDs diferentes, valido durante testes e ajusto. Pior caso (bem improvável): preciso descobrir os IDs chamando `ct?st=N` para N=1..27 e mapeando pelas cidades retornadas.
