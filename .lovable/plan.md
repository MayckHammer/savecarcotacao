
# Migrar integracao Power CRM para API REST oficial

## Resumo
Substituir o endpoint de formulario publico (`app.powercrm.com.br/svQttnDynmcFrm`) pela API REST oficial (`api.powercrm.com.br/api/quotation/add`) com autenticacao Bearer Token.

## Etapas

### 1. Armazenar o Bearer Token como secret
Salvar o token `POWERCRM_API_TOKEN` de forma segura no backend, acessivel apenas pela edge function.

### 2. Atualizar a edge function `submit-to-crm`
Alterar o arquivo `supabase/functions/submit-to-crm/index.ts`:

**O que muda:**
- Endpoint: de `https://app.powercrm.com.br/svQttnDynmcFrm` para `https://api.powercrm.com.br/api/quotation/add`
- Headers: adicionar `Authorization: Bearer {token}` lido do secret
- Remover campos exclusivos do formulario publico (`companyHash`, `formCode`, `pipelineColumn`, `funnelStage`)
- Manter todos os campos de dados (`pwrClntNm`, `pwrCltPhn`, `pwrClntCpf`, `pwrClntEml`, `pwrVhclPlt`, `pwrVhclTyp`, `pwrVhclSWrk`, `pwrQttnVl`, `pwrStt`, `pwrCt`, `observation`)
- Manter a resolucao de codigos de estado/cidade via utilities API
- Manter o salvamento no banco de dados local

**O que NAO muda:**
- Frontend (nenhuma alteracao)
- Banco de dados (mesma tabela `quotes`)
- Logica de observacao detalhada
- Fluxo de fallback para erros

### Resumo tecnico da alteracao na edge function

```
// Antes (formulario publico)
fetch("https://app.powercrm.com.br/svQttnDynmcFrm", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ companyHash: "...", formCode: "...", ...campos })
})

// Depois (API REST oficial)
const token = Deno.env.get("POWERCRM_API_TOKEN");
fetch("https://api.powercrm.com.br/api/quotation/add", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  },
  body: JSON.stringify({ ...campos }) // sem companyHash/formCode
})
```

### 3. Testar a integracao
Verificar nos logs da edge function se a API retorna sucesso e o card eh criado no Power CRM.
