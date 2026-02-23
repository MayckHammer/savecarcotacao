
## Correcao: Cotacao no CRM sem dados suficientes para gerar planos

### Problema Raiz

O CRM retorna "Nenhum plano disponivel" porque a cotacao foi criada com dados **minimos** (nome, telefone, email, CPF, placa) pela `consulta-placa-crm`. Quando o `submit-to-crm` roda com `skipCrm=true`, ele **nao atualiza** a cotacao no CRM com os dados completos (endereco, valor FIPE, modelo, etc.). Sem esses dados, o CRM nao consegue calcular os planos e precos.

### Solucao

Quando `skipCrm=true` (cotacao ja existe), em vez de pular o CRM completamente, **atualizar** a cotacao existente usando `POST /api/quotation/update` com todos os dados coletados.

---

### Detalhes Tecnicos

**1. Alteracao em `supabase/functions/submit-to-crm/index.ts`**

No bloco `if (skipCrm)`, adicionar chamada ao endpoint de update do CRM:

```text
if (skipCrm) {
  crmQuotationCode = existingQuotationCode || null;
  crmNegotiationCode = existingNegotiationCode || null;

  // UPDATE the existing quotation with full data
  if (crmQuotationCode && token) {
    const updatePayload = {
      code: crmQuotationCode,
      name: personal.name,
      phone,
      email: personal.email,
      registration: cpfDigits,
      phoneMobile1: phone,
      plates: vehicle.plate,
      workVehicle: vehicle.usage === "aplicativo",
      addressZipcode: address.cep?.replace(/\D/g, ""),
      addressAddress: address.street,
      addressNumber: address.number || "S/N",
      addressComplement: address.complement,
      addressNeighborhood: address.neighborhood,
      protectedValue: vehicle.fipeValue || 0,
      observation,
    };
    if (cityCode) updatePayload.city = cityCode;

    await fetch("https://api.powercrm.com.br/api/quotation/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(updatePayload),
    });
  }
  crmSuccess = true;
}
```

Isso envia para o CRM: endereco completo, valor FIPE (`protectedValue`), cidade, dados pessoais, observacao com detalhes do plano — tudo que o CRM precisa para calcular os planos.

**2. Alteracao em `supabase/functions/get-crm-plans/index.ts`**

Aumentar os tempos de retry para dar mais tempo ao CRM processar o update:
- Attempt 1: espera 5s (em vez de 3s)
- Attempt 2: espera 8s (em vez de 6s)  
- Attempt 3: espera 10s (em vez de 9s)
- Aumentar para 4 tentativas

**3. Alteracao em `src/pages/Result.tsx`**

Adicionar um pequeno delay antes de buscar os planos (3s) para dar tempo ao CRM processar o update feito pelo `submit-to-crm`.

---

### Fluxo Corrigido

```text
1. Passo 1: Usuario preenche dados pessoais
2. Passo 2: Consulta placa -> consulta-placa-crm cria cotacao minima no CRM
3. Passo 3: Usuario preenche endereco
4. Submit: submit-to-crm ATUALIZA a cotacao existente com dados completos
5. Resultado: get-crm-plans busca planos com precos reais do CRM
6. Detalhes: Exibe precos vindos do CRM
```

### Resumo das alteracoes
- `supabase/functions/submit-to-crm/index.ts` — Adicionar update da cotacao no CRM quando skipCrm=true
- `supabase/functions/get-crm-plans/index.ts` — Aumentar tempos de retry
- `src/pages/Result.tsx` — Adicionar delay antes de buscar planos
