## Objetivo

Voltar ao fluxo simples e estável: o app envia os dados do cliente ao CRM (via campo de observações internas) e o **operador preenche manualmente** os planos e valores. Sem tentar buscar planos automaticamente, sem auto-cura de cidade, sem simular cliques na lupa/salvar.

O cliente segue direto da tela de detalhes → aguardando (mini game) → pagamento, sem depender de retorno do CRM.

## Mudanças

### 1. `src/pages/PlanDetails.tsx`
- Remover todo o `useEffect` que invoca `get-crm-plans` e seus retries.
- Remover estados `loadingPlans`, `planWarning` e a renderização do alerta amarelo "CRM ainda calculando os planos…".
- Cards COMPLETO/PREMIUM passam a mostrar apenas o nome do plano + selo "Valor confirmado pelo consultor" (sem "Aguardando CRM" nem "Calculando…"). Sem preço dinâmico.
- Botão **Continuar** deixa de depender de `crmPlans.length > 0` — fica habilitado assim que o usuário escolhe forma de pagamento.
- `handleContinue` continua chamando `submit-to-crm` com `skipCrm: true` para sincronizar dados/observações no card do CRM, mas sem `crmPlanName/crmMonthlyPrice` (deixa em branco — o operador preenche).

### 2. `src/pages/Quote.tsx`
- Em `handleNext` (step 3), remover o bloco que reinvoca `consulta-placa-crm` com `selectedModel + address` para "liberar planos". Manter apenas o `submit-to-crm` (cria/atualiza o card no CRM com observações).
- Em `handleCrmModelConfirm`, remover o uso de `data.crmPlans` (não vamos mais consumir planos). Manter o resto (atualização de FIPE recomputado e toast de sucesso).
- Remover `setCrmPlans` dos imports/uso onde só servia para popular planos automáticos.

### 3. `supabase/functions/submit-to-crm/index.ts`
- Ajustar montagem das observações (`internalNote` e `observation`): quando não houver plano CRM confirmado, gravar:
  - `► PLANO CRM: Aguardar definição do consultor`
  - `► VALOR CRM: Aguardar definição do consultor`
- Remover qualquer lógica que tente forçar um valor placeholder.

### 4. `supabase/functions/get-crm-plans/index.ts`
- **Não chamar mais do frontend.** A função pode permanecer no projeto desativada (não removida) para evitar quebrar logs/históricos, mas nenhum componente fará invoke nela. Não precisa editar o arquivo.

### 5. `supabase/functions/consulta-placa-crm/index.ts`
- **Manter como está.** A consulta de placa + criação da cotação no CRM continua funcionando normalmente (esse é o fluxo manual que o operador espera). Não precisa editar.

## Resultado para o usuário

1. Cliente preenche dados → consulta placa → endereço.
2. Card é criado no CRM com todas as informações nas observações internas.
3. Cliente vê tela de planos (COMPLETO/PREMIUM) sem preço, escolhe um e a forma de pagamento.
4. Clica Continuar → vai para `/aguardando` (mini game) → `/pagamento`.
5. Operador abre o card no CRM, lê as observações, preenche o plano e o valor manualmente, e dá seguimento.

Sem mais erros de "missing city", sem espera de planos, sem 500 do `getQuotation`.

## Arquivos editados

- `src/pages/PlanDetails.tsx`
- `src/pages/Quote.tsx`
- `supabase/functions/submit-to-crm/index.ts`
