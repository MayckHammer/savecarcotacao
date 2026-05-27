## Objetivo

Remover a tela `/detalhes` (PlanDetails) do fluxo da cotação express. Após o submit do formulário, o usuário é levado **direto para a página oficial do PowerCRM** (`compareTables` / `newQuotation`), que já mostra COMPLETO e PREMIUM com os valores reais calculados.

## Mudanças

### 1. `src/components/CrmQuoteForm.tsx`
- Remover a chamada `pwrcrm-quote/plans` (não precisamos mais raspar valores — o CRM mostra direto).
- Remover `setCrmPlans` do contexto.
- Após receber `qttnCd` do `pwrcrm-quote/submit`, redirecionar a aba atual usando a mesma lógica do `script.pwrcrm.js`:
  - Se `redirecTo` veio na resposta → `window.location = redirecTo`
  - Senão, se `isPlan == 1` → `https://app.powercrm.com.br/compareTables?h={qttnCd}` (ou `/newQuotation?h={qttnCd}` quando `planPriority == 2` ou `specificTable`)
  - Senão → `https://app.powercrm.com.br/receivedQuotation?h={qttnCd}`
- Manter o `updatePersonal/updateVehicle/updateAddress` antes do redirect (caso o usuário volte com botão Voltar).

### 2. `src/App.tsx`
- Remover rota `/detalhes` e o import de `PlanDetails`.

### 3. Limpeza
- `src/pages/PlanDetails.tsx` pode ser apagado (não é mais usado em lugar nenhum do fluxo express). O fluxo `/cotacao-detalhada` (fallback manual) também navegava para `/detalhes` — vou redirecioná-lo também para o CRM oficial quando tiver `crmQuotationCode`, ou manter um caminho mínimo. Para não quebrar nada, mantenho `PlanDetails.tsx` como arquivo mas removo a rota; quem chamar `/detalhes` cai no NotFound. Edito `Quote.tsx` para também redirecionar ao CRM em vez de `/detalhes`.

### 4. Edge function `pwrcrm-quote`
- A action `plans` continua existindo (não custa nada), mas não é mais usada pelo front. Sem mudança de código.

## Arquivos editados

- `src/components/CrmQuoteForm.tsx`
- `src/pages/Quote.tsx` (navegar para o CRM em vez de `/detalhes` quando houver `crmQuotationCode`)
- `src/App.tsx` (remover rota e import de `PlanDetails`)
- `src/pages/PlanDetails.tsx` — deletar
- `mem://integrations/power-crm` — atualizar dizendo que o app redireciona para o CRM, sem tela intermediária

## Resultado

Cliente preenche `/cotacao` → clica "Ver meus planos" → é levado direto para `app.powercrm.com.br/compareTables?h=...` com os planos COMPLETO/PREMIUM e valores reais. Toda a continuação (escolha, contato, pagamento) acontece no próprio CRM.
