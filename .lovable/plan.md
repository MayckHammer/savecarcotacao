

## Correção: `crm_quotation_code` salvo como NULL no banco

### Problema Identificado

Existem **dois problemas** no fluxo:

1. **Frontend nao envia o `crmQuotationCode` existente**: Quando o `skipCrm` e `true` (cotacao ja criada via consulta de placa), o frontend envia `skipCrm: true` mas **nao envia** o `crmQuotationCode` nem o `crmNegotiationCode` que foram obtidos anteriormente.

2. **Edge function ignora o codigo quando `skipCrm` e true**: Na funcao `submit-to-crm`, quando `skipCrm` e `true`, as variaveis `crmQuotationCode` e `crmNegotiationCode` permanecem `null` (linhas 135-136). O update final no banco (linha 231-235) grava `null` no campo `crm_quotation_code`.

### Solucao

**1. Frontend (`src/pages/Quote.tsx`)**
- Passar `crmQuotationCode` e `crmNegotiationCode` no body da requisicao quando `skipCrm` e `true`.

**2. Edge Function (`supabase/functions/submit-to-crm/index.ts`)**
- Quando `skipCrm` e `true`, ler o `crmQuotationCode` e `crmNegotiationCode` do body da requisicao e usa-los no update do banco.

---

### Detalhes Tecnicos

**Alteracao no frontend (Quote.tsx, linhas 238-248):**
Adicionar os campos `crmQuotationCode` e `crmNegotiationCode` ao body:

```text
body: {
  personal: quote.personal,
  vehicle: quote.vehicle,
  address: quote.address,
  plan: {},
  skipCrm: true,
  crmQuotationCode: quote.crmQuotationCode,
  crmNegotiationCode: quote.crmNegotiationCode,
}
```

**Alteracao na edge function (submit-to-crm/index.ts):**
Na linha 25, extrair tambem `crmQuotationCode` e `crmNegotiationCode` do body:

```text
const { personal, vehicle, address, plan, skipCrm, 
        crmQuotationCode: existingQuotationCode, 
        crmNegotiationCode: existingNegotiationCode } = await req.json();
```

No bloco `skipCrm` (linhas 139-140), atribuir os valores:

```text
if (skipCrm) {
  crmQuotationCode = existingQuotationCode || null;
  crmNegotiationCode = existingNegotiationCode || null;
  console.log("Skipping CRM submission, using existing codes:", crmQuotationCode, crmNegotiationCode);
}
```

Isso garante que o `crm_quotation_code` obtido na consulta de placa seja persistido no banco e esteja disponivel para a pagina de Resultado buscar os planos do CRM.

