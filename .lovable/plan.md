## Problema identificado

Analisando o print do PowerCRM e os logs atuais, a cotação está sendo criada e a "lupa" da placa já é disparada, mas **três coisas estão quebrando** o cálculo final dos planos COMPLETO/PREMIUM:

1. **Cidade/Estado de circulação nunca são enviados ao CRM.** No `saveCrmVehicleData` o campo `city` está hardcoded como `null`. Sem cidade, o CRM responde `"Cotação incompleta no CRM (faltando: cidade)"` ao pedir os planos.
2. **`quotationId` numérico não vem na criação** (`numericId=missing` nos logs), então o `updateQuotationVehicleData` aborta e cai no fallback `/quotation/update` que retorna 412.
3. **`quotationFipeApi` está dando 502** seguidamente porque é chamado antes do save real ter ocorrido.

Resultado: hoje o cliente termina o fluxo, mas o CRM nunca recebe os dados completos para calcular o valor real do plano sobre o FIPE — o sistema mostra preços de fallback locais, não os valores oficiais da Savecar.

## O que vai mudar

### 1. Reordenar o fluxo para coletar endereço ANTES de salvar no CRM

Hoje o `consulta-placa-crm` é chamado logo na primeira tela (placa + nome). Vou:

- Manter a primeira chamada (criar cotação + lupa) como está, para já abrir o card no CRM.
- Adicionar uma **segunda chamada** após o cliente preencher o endereço (CEP/cidade/estado), que envia o endereço completo + modelo escolhido para o CRM. Essa segunda chamada é a que dispara o cálculo dos planos reais.

### 2. Edge function `consulta-placa-crm` — passar cidade/estado e resolver IDs do CRM

- Adicionar campo `address` no schema de entrada (`cep`, `state`, `city`, `street`, `neighborhood`, `number`).
- Antes de salvar, resolver o `cityId` numérico do CRM via `GET /api/quotation/cities?uf={UF}` (ou endpoint equivalente que o CRM usa no dropdown da imagem) e fazer match por nome normalizado.
- No payload do `updateQuotationVehicleData` substituir `city: null` pelo `cityId` resolvido, e enviar também `addressZipcode`, `addressAddress`, `addressNumber`, `addressNeighborhood`, `addressState`, `addressCity` (chaves observadas no log do `fetchPlansByModelRequest`).
- Buscar `quotationId` numérico via `getQuotation` **imediatamente após** criar o card (já existe lógica em 4c, mas hoje só roda em condições específicas — sempre rodar).

### 3. Disparar o save real depois do endereço

Quando o cliente clicar em "Avançar" na tela de endereço (`Quote.tsx`), a chamada ao `consulta-placa-crm` deve enviar:
- `crmQuotationCode` (já criado na primeira etapa)
- `selectedModel` (escolhido na tela de modelo)
- `address` (novo)

A edge function detecta esses três e executa o caminho do "salvar" (replica passo 4 do print): `updateQuotationVehicleData` com cidade + `quotationFipeApi` para forçar o cálculo. Só depois disso `get-crm-plans` consegue retornar valores reais.

### 4. Frontend — exibir os planos reais do CRM

- `PlanDetails.tsx` já consome `crmPlans` do contexto. Garantir que após a etapa de endereço o frontend chame `get-crm-plans` com o `quotationCode` e popule o estado.
- Manter os preços de fallback locais apenas como segurança em caso de timeout — mas a fonte primária passa a ser o CRM.

## Detalhes técnicos

```text
Fluxo novo (resumo)
-------------------
Tela 1: nome + placa
  → consulta-placa-crm (cria cotação, lupa, FIPE Parallelum, retorna modelOptions)

Tela 2: confirmar modelo (se múltiplas opções)
  → seleciona crmModelId/crmYearId

Tela 3: endereço (CEP, estado, cidade, rua…)
  → consulta-placa-crm de novo, agora com {crmQuotationCode, selectedModel, address}
     → resolve cityId no CRM
     → updateQuotationVehicleData com city + endereço completo + modelo
     → quotationFipeApi para forçar cálculo
     → retorna FIPE confirmado pelo CRM

Tela 4: planos
  → get-crm-plans → valores REAIS do CRM (COMPLETO / PREMIUM)
```

Arquivos afetados:

- `supabase/functions/consulta-placa-crm/index.ts` — schema, resolver cidade, atualizar payload do save, forçar busca do quotationId numérico.
- `src/pages/Quote.tsx` — adicionar segunda invocação após validar endereço.
- `src/pages/PlanDetails.tsx` — garantir refetch dos planos quando voltar com `crmFipeConfirmed=true`.
- `src/contexts/QuoteContext.tsx` — campo opcional para guardar `cityId` resolvido (debug).

## Pontos em aberto (vou descobrir durante a implementação)

- O endpoint exato do CRM para listar cidades por UF não está documentado nos arquivos atuais. Vou tentar `GET /api/quotation/cities?uf=XX` primeiro; se não funcionar, capturo o endpoint real e ajusto.
- O CRM pode rejeitar `city` se a UF/cidade não casarem. Vou logar o `cityId` resolvido e retornar warning no response para podermos debugar pela primeira execução.

## O que NÃO muda

- Visual das telas (sem mudanças de UI).
- Estrutura da tabela `quotes` no banco.
- Fluxo de pagamento e vistoria.
