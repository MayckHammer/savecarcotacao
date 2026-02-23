

# Reestruturar Fluxo de Cotacao com Integracao Completa ao Power CRM

## Resumo

Reestruturar a aplicacao para que o CRM seja o centro do fluxo: criar a cotacao no CRM logo no inicio (com tag "30 seg"), buscar os planos do CRM, capturar apenas a preferencia de pagamento (sem dados de cartao), e obter o link de vistoria diretamente do CRM.

---

## 1. Enviar dados ao CRM imediatamente apos o preenchimento da cotacao

**Situacao atual:** Os dados so sao enviados ao CRM quando o usuario clica "Contratar" na pagina de detalhes do plano (PlanDetails.tsx).

**Mudanca:** Mover o envio ao CRM para o final do passo 3 (Endereco) na pagina Quote.tsx. Quando o usuario clicar "Continuar" apos preencher o endereco, os dados ja sao enviados ao CRM e o `session_id` e `crm_quotation_code` ficam disponiveis para os proximos passos.

**Tag "30 seg":** Adicionar o campo de tag no payload do CRM. Investigar se a API aceita um campo `tag` ou similar no `QuotationAddRequest`. Caso nao aceite como campo estruturado, incluir "TAG: 30 seg" no campo `observation`.

### Arquivo: `supabase/functions/submit-to-crm/index.ts`
- Adicionar "TAG: 30 seg" no texto de `observation`
- Manter o mesmo payload ja corrigido

### Arquivo: `src/pages/Quote.tsx`
- No `handleNext` do step 3, apos validar o endereco, chamar `submit-to-crm` antes de navegar para `/resultado`
- Mostrar loading enquanto envia
- Salvar o `session_id` no contexto

### Arquivo: `src/pages/PlanDetails.tsx`
- Remover a chamada ao `submit-to-crm` do botao "Contratar" (ja foi feita no step anterior)
- O botao "Contratar" agora apenas navega para `/vistoria`

---

## 2. Consulta de placa com retorno FIPE

**Situacao atual:** Ja funciona -- a selecao em cascata (tipo > marca > modelo > ano) consulta a API FIPE via edge function `consulta-placa` e retorna o valor FIPE formatado.

**Mudanca:** Nenhuma. Ja esta implementado corretamente.

---

## 3. Planos COMPLETO e PREMIUM

**Situacao atual:** Ja existem os dois planos (COMPLETO e PREMIUM) com coberturas definidas no `QuoteContext.tsx`.

**Mudanca:** Nenhuma estrutural. Os planos ja correspondem ao que o CRM oferece.

---

## 4. Pagamento: apenas preferencia, sem dados de cartao

**Situacao atual:** A pagina PlanDetails mostra o `CardForm` quando o metodo e "credit", coletando numero, validade, CVV e nome do titular. A pagina Payment tambem tem `CardForm`.

**Mudancas:**

### Arquivo: `src/pages/PlanDetails.tsx`
- Remover o componente `CardForm` da renderizacao
- Manter o `PaymentMethodSelector` para capturar apenas a **preferencia** (cartao ou PIX/boleto)
- Quando "cartao" for selecionado, mostrar apenas texto informativo ("O pagamento sera processado apos aprovacao da vistoria") em vez de campos de cartao

### Arquivo: `src/pages/Payment.tsx`
- Remover a coleta de dados de cartao
- Transformar em pagina de confirmacao de preferencia/resumo
- Remover validacao de campos de cartao do `isFormValid`

### Arquivo: `src/contexts/QuoteContext.tsx`
- Manter os campos de cartao na interface por compatibilidade, mas nao serao mais obrigatorios

---

## 5. Link de vistoria do CRM

**Situacao atual:** O link de vistoria e inserido manualmente pelo admin no painel (`/admin`). A pagina `/vistoria` faz polling na tabela `quotes` para verificar o status e exibir o link.

**Mudanca:** Apos criar a cotacao no CRM, consultar a API do CRM para obter o link de vistoria automaticamente. Isso requer:

### Nova edge function: `supabase/functions/get-inspection-link/index.ts`
- Recebe o `crm_quotation_code`
- Consulta a API do Power CRM para buscar o link de vistoria da cotacao
- Retorna o link para o frontend
- Se a API do CRM tiver um endpoint para isso (ex: `GET /api/quotation/{code}`), usar diretamente
- Caso contrario, manter o fluxo manual via admin como fallback

### Arquivo: `src/pages/Inspection.tsx`
- Apos montar a pagina, tentar buscar o link de vistoria automaticamente via a nova edge function
- Se encontrar, exibir direto sem precisar do admin
- Manter o polling como fallback

### Arquivo: `supabase/functions/submit-to-crm/index.ts`
- Salvar o `crm_quotation_code` no banco (ja faz isso)
- Apos criar a cotacao, tentar buscar o link de vistoria imediatamente e salvar no campo `inspection_link` da tabela `quotes`

---

## Fluxo revisado

```text
Landing (/) 
  -> Cotacao (/cotacao) [3 steps: dados pessoais, veiculo+FIPE, endereco]
     -> Ao concluir step 3: ENVIA AO CRM com tag "30 seg"
  -> Resultado (/resultado) [mostra valor FIPE]
  -> Detalhes (/detalhes) [plano + preferencia pagamento, SEM dados cartao]
     -> Clique "Contratar" -> navega direto para /vistoria
  -> Vistoria (/vistoria) [busca link do CRM automaticamente]
     -> Aprovada -> Pagamento (/pagamento) [resumo, sem coleta de cartao]
```

---

## Detalhes tecnicos

### Arquivos modificados:
1. `supabase/functions/submit-to-crm/index.ts` -- adicionar tag "30 seg" na observation + tentar buscar link de vistoria
2. `src/pages/Quote.tsx` -- chamar submit-to-crm no final do step 3
3. `src/pages/PlanDetails.tsx` -- remover CardForm e submit-to-crm, manter apenas preferencia
4. `src/pages/Payment.tsx` -- remover CardForm, simplificar para resumo
5. `src/pages/Inspection.tsx` -- buscar link automaticamente
6. `src/components/FinancialSummary.tsx` -- sem mudancas
7. `src/contexts/QuoteContext.tsx` -- sem mudancas estruturais

### Possivel nova edge function:
- `supabase/functions/get-inspection-link/index.ts` -- buscar link de vistoria do CRM (se a API suportar)

### Dependencia critica:
- Precisamos verificar se a API do Power CRM tem endpoint para consultar dados da cotacao (link de vistoria). Se nao tiver, o link continuara sendo inserido manualmente pelo admin, mas a cotacao ja sera criada automaticamente no CRM com a tag.

