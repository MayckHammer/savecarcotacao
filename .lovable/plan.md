## Objetivo

Fazer com que **USO DO VEÍCULO**, **PLANO SELECIONADO** e **PRETENSÃO DE PAGAMENTO** apareçam no campo amarelo **"Observações internas"** do card no PowerCRM (visível só para a equipe), em vez de ficarem somente no campo "Observação" geral.

## Causa do problema

Hoje a edge function `submit-to-crm` envia toda a informação consolidada apenas no campo `observation`. O campo amarelo "Observações internas" do PowerCRM corresponde a outra propriedade da API: **`noteContractInternal`** (confirmado no swagger do CRM — `QuotationAddRequest` aceita `noteContractInternal` e `QuotationUpdateRequest` aceita `noteContract`/`noteContractInternal`). Como nunca enviamos esse campo, ele aparece em branco.

## Mudanças

### 1. `supabase/functions/submit-to-crm/index.ts`

- Construir uma string `internalNote` curta e direta com o destaque pedido:
  ```
  ► USO DO VEÍCULO: Particular
  ► PLANO SELECIONADO: PREMIUM
  ► PRETENSÃO DE PAGAMENTO: Cartão de Crédito (Adesão + 11x)
  ```
  (usando os mesmos labels já mapeados em `usageMap` e `paymentMethodLabel`).
- No payload de **criação** (`crmPayload` enviado em `quotation/add`), adicionar:
  - `noteContractInternal: internalNote`
- No payload de **atualização** (`updatePayload` enviado em `quotation/update` quando `skipCrm=true`), adicionar:
  - `noteContractInternal: internalNote`
- Manter o campo `observation` atual intacto (continua tendo o bloco completo para histórico).

### 2. Sem alterações em frontend

Os dados (`usage`, `planName`, `paymentMethod`) já são enviados pelo cliente para a edge function — só precisamos roteá-los para o campo certo no PowerCRM.

### 3. Sem alterações de banco

Nenhuma migração necessária — é só campo do CRM externo.

## Validação

Após a alteração:
1. Fazer uma cotação completa de teste.
2. Abrir o card no PowerCRM e confirmar que o campo amarelo **"Observações internas"** mostra as 3 linhas do destaque.
3. O campo "Observação" continuará com o bloco completo (associado, veículo, endereço, coberturas).

## Arquivos a editar

- `supabase/functions/submit-to-crm/index.ts`
