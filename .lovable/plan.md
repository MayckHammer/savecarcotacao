## Diagnóstico

A imagem do CRM mostra a cidade ("Uberlândia / Minas Gerais") preenchida visualmente, mas o backend do Power CRM **não persistiu** o `cityId` na cotação `EjKeb2wq`. Por isso `get-crm-plans` respondeu `{"plans":[],"warning":"Cotação incompleta no CRM (faltando: cidade)"}` e o card mostra "Aguardando CRM".

A causa exata está nos logs de rede:

1. Na 1ª chamada (`consulta-placa-crm` sem endereço) a resposta veio com `"quotationId": null` — o CRM criou a cotação mas não devolveu o ID numérico.
2. Na 2ª chamada (com endereço), o frontend reenviou `"crmQuotationId": null`.
3. No bloco que faz o "Salvar" no CRM (`updateQuotationVehicleData`) o código **só executa se `resolvedQuotationId` existir**. Como veio `null` e o fallback `getQuotation` também não conseguiu resolver o ID numérico, o "Salvar" foi pulado.
4. Sem o "Salvar", o CRM nunca recebeu `city`, `addressZipcode`, `addressCity`, etc. — então `plansQuotation` retorna sem planos e o `get-crm-plans` adiciona o warning.

Adicionalmente: o `fipeCheck.mismatches` confirmou `"CRM ainda não persistiu o valor FIPE"`, sintoma do mesmo problema raiz.

## Correções

### 1. `supabase/functions/consulta-placa-crm/index.ts` — sempre garantir o `quotationId` numérico

- Logo após criar a cotação (linha ~1392), se `quotationId` veio `null`, chamar **imediatamente** `getQuotation(token, quotationCode)` em retry (até 3 tentativas com backoff de 800ms) para extrair `id`/`quotationId`/`idQuotation`. Logar o resultado.
- Persistir esse ID resolvido na resposta JSON da 1ª chamada (`quotationId` no body de retorno) para o frontend reenviar na 2ª chamada.
- No bloco do "Selected model" (linha ~1204), antes de pular o `saveCrmVehicleData`, fazer o mesmo fallback (já existe parcial, mas com 1 tentativa só) — transformar em loop com retry.
- **Crítico:** se mesmo após retries o `quotationId` continuar nulo, ainda assim chamar `/quotation/update` com cidade + endereço (já é feito) **mas também** repetir o `/quotation/update` específico do payload de cidade após o `triggerCrmFipeCalculation` para forçar persistência.

### 2. `supabase/functions/consulta-placa-crm/index.ts` — desacoplar cidade do "Salvar"

Mesmo quando o `updateQuotationVehicleData` falha, o `/quotation/update` plano (linha ~1191) já envia `city` + `addressCity` + `addressState`. Garantir:

- Logar `resolvedCityId` resolvido por `resolveCrmCityId` para confirmar que ele é numérico (Power CRM exige número).
- Se `resolveCrmCityId` retornar `null`, fazer fallback adicional para o endpoint público `utilities.powercrm.com.br/cities?state=...&name=...` (mesmo usado em `get-crm-plans`).
- Após `triggerCrmFipeCalculation`, fazer **um segundo PATCH** `/quotation/update` só com `{ code, city: resolvedCityId }` para reforçar a persistência (alguns campos do CRM são sobrescritos pelo cálculo FIPE).

### 3. `supabase/functions/get-crm-plans/index.ts` — auto-cura

Se receber a cotação sem `city` mas tiver `address.state` + `address.city` no body, **antes** de retornar warning:

- Resolver `cityId` via `resolveCityCode` (já faz).
- Chamar `/quotation/update` com `{ code: quotationCode, city: cityId, addressState, addressCity, addressZipcode, addressAddress, addressNumber, addressNeighborhood }` para fechar o gap.
- Esperar 1.5s e tentar `plansQuotation` de novo.
- Só então, se ainda vier vazio, retornar o warning.

Isso torna o `get-crm-plans` resiliente a estados intermediários do CRM, igual o operador faria manualmente clicando "Salvar" na tela.

### 4. Frontend `src/pages/PlanDetails.tsx` — retry automático

- Quando `plans=[]` + `warning` vem com "faltando", em vez de só mostrar "Aguardando CRM", agendar **1 retry automático** após 4s antes de exibir o estado de espera ao usuário. Reduz o caso em que o operador só precisa esperar a propagação do CRM.

## Validação

Após o deploy:

1. Refazer a cotação com a placa PSY0764 + CEP 38400-112.
2. Verificar nos logs de `consulta-placa-crm` que `Quotation created: code=... numericId=<número>` (não mais `missing`).
3. Verificar `updateQuotationVehicleData payload:` aparecendo nos logs com `city: "<id>"`.
4. Confirmar que o `get-crm-plans` retorna `plans` populado com COMPLETO/PREMIUM e seus preços reais (sem warning).
5. Conferir no print do CRM que "Cidade de circulação" e "Valor FIPE" agora ficam preenchidos e os planos aparecem na cotação.

## Resumo do que muda

```text
Antes:                              Depois:
────────                            ────────
1. Cria cotação                     1. Cria cotação + retry getQuotation p/ ID
2. quotationId=null → pula Salvar   2. Sempre resolve quotationId (retries)
3. CRM sem cidade nem FIPE          3. Salvar SEMPRE roda (com city)
4. get-crm-plans: warning           4. get-crm-plans: auto-PATCH cidade se faltar
5. Frontend: "Aguardando CRM"       5. Frontend: retry silencioso 1x antes de avisar
```

Nenhuma alteração de schema do banco. Apenas Edge Functions + um pequeno ajuste no `PlanDetails.tsx`.