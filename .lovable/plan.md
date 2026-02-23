

# Integrar 3 Endpoints do Power CRM

## Resumo

Integrar os endpoints `open-inspection`, `GET /quotation/{code}` e `GET /quotation/plansQuotation` (V2) para: (1) abrir vistoria automaticamente apos criar cotacao, (2) buscar link de vistoria do CRM, (3) mostrar planos com precos reais do CRM.

---

## 1. Abrir inspecao automaticamente (POST /api/quotation/open-inspection)

Apos criar a cotacao com sucesso no CRM e receber o `quotationCode`, chamar imediatamente o endpoint de abertura de inspecao.

### Arquivo: `supabase/functions/submit-to-crm/index.ts`

Adicionar, logo apos o bloco de tag (linha ~176), uma chamada ao endpoint:

```typescript
// Open inspection automatically
if (crmQuotationCode) {
  try {
    const inspRes = await fetch("https://api.powercrm.com.br/api/quotation/open-inspection", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ quotationCode: crmQuotationCode }),
    });
    const inspData = await inspRes.json();
    console.log("Open inspection response:", JSON.stringify(inspData, null, 2));
  } catch (inspErr) {
    console.error("Error opening inspection:", inspErr);
  }
}
```

Isso garante que a vistoria e liberada automaticamente no CRM sem intervencao manual.

---

## 2. Buscar link de vistoria (GET /api/quotation/{quotationCode})

Atualizar a edge function `get-inspection-link` para usar o endpoint correto de pesquisa de cotacao, que retorna os dados completos incluindo o link de vistoria.

### Arquivo: `supabase/functions/get-inspection-link/index.ts`

Substituir a chamada atual (que usa `/api/negotiation/`) por:

```typescript
const qttnRes = await fetch(
  `https://api.powercrm.com.br/api/quotation/${quote.crm_quotation_code}`,
  { headers: { "Authorization": `Bearer ${token}` } }
);
```

Analisar a resposta para extrair o link de vistoria -- possiveis campos: `inspectionLink`, `inspection`, `data.inspectionLink`, ou dentro de um objeto `negotiation`.

Tambem atualizar o mesmo trecho no `submit-to-crm` (linhas 178-198) para usar `/api/quotation/{code}` em vez de `/api/negotiation/{code}`.

---

## 3. Buscar planos reais do CRM (GET /api/quotation/plansQuotation V2)

Criar uma nova edge function que consulta os planos disponiveis para uma cotacao especifica, retornando precos reais calculados pelo CRM com base no veiculo.

### Nova edge function: `supabase/functions/get-crm-plans/index.ts`

```typescript
// Recebe quotationCode
// Chama GET /api/quotation/plansQuotation?quotationCode={code}
// (ou variante V2 se houver parametro de versao)
// Retorna array de planos com nome, preco, coberturas
```

### Arquivo: `supabase/config.toml`

Adicionar:
```toml
[functions.get-crm-plans]
verify_jwt = false
```

### Arquivo: `src/pages/Result.tsx`

Apos o CRM ter criado a cotacao, chamar `get-crm-plans` com o `quotationCode` salvo no contexto. Exibir os planos retornados pelo CRM com precos reais em vez dos valores fixos atuais (R$ 189,90 / R$ 1.899,00).

### Arquivo: `src/pages/PlanDetails.tsx`

Receber os planos do CRM (via contexto ou estado) e exibir precos dinamicos. Se o CRM retornar valores diferentes dos atuais, usar os do CRM.

### Arquivo: `src/contexts/QuoteContext.tsx`

Adicionar estado para armazenar planos do CRM:

```typescript
// Novo estado
crmPlans: CrmPlan[] // { name, monthlyPrice, annualPrice, coverages[] }
setCrmPlans: (plans: CrmPlan[]) => void
```

Atualizar `getSubtotalWithoutDiscount()` e `getTotal()` para usar precos do CRM quando disponiveis, caindo nos valores fixos como fallback.

---

## 4. Corrigir tag "30 seg" (tagId numerico)

A API `add-tag` requer `tagId` (int64), nao uma string. Precisamos do ID numerico da tag "30 seg" cadastrada no Power CRM.

### Acao necessaria do usuario:
Informar o `tagId` numerico da tag "30 seg". Pode ser encontrado no painel do Power CRM em Configuracoes > Tags, ou testando o endpoint `GET /api/quotation/tags` (se existir).

### Arquivo: `supabase/functions/submit-to-crm/index.ts` (linha 167-168)

Substituir:
```typescript
body: JSON.stringify({ quotationCode: crmQuotationCode, tag: "30 seg" })
```
Por:
```typescript
body: JSON.stringify({ quotationCode: crmQuotationCode, tagId: TAG_ID_NUMERICO })
```

---

## Fluxo completo revisado

```text
1. Usuario preenche cotacao (3 steps)
2. submit-to-crm:
   a. Cria cotacao no CRM (POST /quotation/add)
   b. Adiciona tag "30 seg" (POST /quotation/add-tag) com tagId numerico
   c. Abre inspecao (POST /quotation/open-inspection) -- NOVO
   d. Busca dados da cotacao (GET /quotation/{code}) para link de vistoria -- CORRIGIDO
3. Result: Busca planos do CRM (GET /quotation/plansQuotation) -- NOVO
4. PlanDetails: Exibe planos com precos reais do CRM
5. Inspection: Polling busca link de vistoria via GET /quotation/{code}
```

---

## Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/submit-to-crm/index.ts` | Adicionar open-inspection + corrigir tagId + usar GET /quotation/{code} |
| `supabase/functions/get-inspection-link/index.ts` | Trocar endpoint de negotiation para quotation |
| `supabase/functions/get-crm-plans/index.ts` | **NOVO** -- buscar planos V2 |
| `supabase/config.toml` | Adicionar get-crm-plans |
| `src/contexts/QuoteContext.tsx` | Adicionar estado crmPlans + precos dinamicos |
| `src/pages/Result.tsx` | Chamar get-crm-plans e salvar no contexto |
| `src/pages/PlanDetails.tsx` | Usar precos do CRM |

---

## Dependencia do usuario

Preciso do **tagId numerico** da tag "30 seg" para corrigir o endpoint add-tag. Sem ele, a tag continuara sendo enviada como texto na observation (fallback funcional).

