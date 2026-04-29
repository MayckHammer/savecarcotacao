## Resumo

Aproveitar a doc V2 do PowerCRM (`/api/quotation/plansQuotation`) para liberar os dois planos (COMPLETO/PREMIUM) com valores reais logo após o "Salvar", e refletir a escolha do usuário no campo "Observações no termo" do card.

## Mudanças

### 1. `supabase/functions/get-crm-plans/index.ts`
- Tratar **HTTP 404** ("Cotação não encontrada") como retry transitório, não como erro definitivo. Igual ao já existente para "Nenhum plano disponível": faz retry com backoff e cai no fallback `/api/plans` POST.
- Reduzir retries de 4→3 (delays 2s/4s/6s = ~12s) já que o `consulta-placa-crm` agora vai pré-aquecer.

### 2. `supabase/functions/consulta-placa-crm/index.ts`
- Nova função `fetchCrmPlansInline(token, quotationCode)`:
  - Chama `GET /api/quotation/plansQuotation?quotationCode=…` com `Authorization: Bearer` + `Accept: application/json` (V2 confirmada na doc).
  - Trata 200 com array, 404 com 1 retry (3s), 500 com 1 retry (3s).
  - Se vazio, fallback `POST /api/plans/` com `{ carModelId, carModelYearId, cityId, quotationWorkVehicle, protectedValue, token }` lido do `getQuotation`.
  - Normaliza para `{ id, name, monthlyPrice, annualPrice, coverages }`.
- Chamar `fetchCrmPlansInline` em **dois pontos**:
  1. No fluxo `selectedModel` (handleCrmModelConfirm), após `triggerCrmFipeCalculation` e o polling do FIPE.
  2. Quando endereço completo for enviado (mesmo bloco — já passa pelo update de `city` e `addressZipcode`).
- Adicionar `crmPlans: CrmPlan[]` ao JSON de resposta do bloco `selectedModel`.

### 3. `src/pages/Quote.tsx`
- Importar `setCrmPlans` do `useQuote()`.
- Em `handleCrmModelConfirm`: se `data?.crmPlans?.length`, chamar `setCrmPlans(data.crmPlans)`.
- No step 3 `handleNext` (envio de endereço): mesma coisa — se a resposta trouxer `crmPlans`, salvar no contexto.

### 4. `src/pages/PlanDetails.tsx`
- O `useEffect` que chama `get-crm-plans` só dispara se `crmPlans.length === 0` (evita refetch desnecessário, já que o Quote pré-carregou).
- Mostrar abaixo do nome de cada card de plano o `monthlyPrice` real (formatado em BRL) quando disponível.
- Manter fallback hardcoded quando `crmPlans` continuar vazio.

### 5. `submit-to-crm` — sincronização de "Observações no termo"
- Sem alterações estruturais. O bloco que monta `noteContract` (linhas 154-165) já inclui `► PLANO SELECIONADO: ${planName}`, `► USO DO VEÍCULO`, `► PRETENSÃO DE PAGAMENTO`. Esse envio já acontece quando o usuário clica "Continuar" em `PlanDetails`.
- Confirmar que `handleContinue` em `PlanDetails` está enviando o plano escolhido com `monthlyPrice`/`annualPrice` reais (do `crmPlans`) — já está, só precisa do `crmPlans` populado.

## Diagrama do fluxo final

```text
Quote step 2 (placa + modelo)
  └─► consulta-placa-crm (selectedModel)
        ├─ updateQuotationVehicleData  (Salvar)
        ├─ quotationFipeApi             (calcula FIPE)
        ├─ pollCrmFipeValue             (confirma persistência)
        └─ fetchCrmPlansInline V2       ◄── NOVO
              └─► retorna crmPlans no JSON

Quote step 3 (endereço)
  └─► consulta-placa-crm (com address.city)
        └─ atualiza city no card + refetch crmPlans

PlanDetails
  └─ usa crmPlans do contexto (sem refetch)
  └─ usuário escolhe COMPLETO ou PREMIUM
  └─ Continuar ─► submit-to-crm
        └─ noteContract += "► PLANO SELECIONADO: PREMIUM"
                           "► PRETENSÃO DE PAGAMENTO: Cartão (Adesão+11x)"
```

## Risco residual
Se a V2 e o fallback `/api/plans` falharem juntos (ambos retornam erro), o app continua funcionando com preços hardcoded e mostra toast informativo. Logs ficam disponíveis para debug.
