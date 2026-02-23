

# Corrigir Bugs Criticos + Auto-Preencher Veiculo pela Placa via CRM

## Resumo

Dois problemas a resolver:
1. **Bug critico**: `submit-to-crm` nao detecta sucesso da criacao de cotacao (campos errados no response)
2. **Auto-preenchimento**: Usar o proprio CRM para identificar o veiculo pela placa, eliminando a selecao manual de marca/modelo/ano

---

## 1. Corrigir bugs no submit-to-crm (URGENTE)

### Problema encontrado nos logs

A resposta do CRM retorna:
```text
{
  "quotationCode": "E05VX6Wq",
  "negotiationCode": "JE8OORJ12z",
  ...
}
```

Mas o codigo verifica:
- `crmData.success` (nao existe na resposta - sempre undefined/falsy)
- `crmData.qttnCd` (nao existe - campo real e `quotationCode`)
- `crmData.ngttnCd` (nao existe - campo real e `negotiationCode`)

### Correcao: `supabase/functions/submit-to-crm/index.ts`

Linha 152 - trocar:
```typescript
if (crmData.success) {
```
Por:
```typescript
if (crmData.quotationCode) {
```

Linhas 154-155 - trocar:
```typescript
crmQuotationCode = crmData.qttnCd || null;
crmNegotiationCode = crmData.ngttnCd || null;
```
Por:
```typescript
crmQuotationCode = crmData.quotationCode || null;
crmNegotiationCode = crmData.negotiationCode || crmData.negotationCode || null;
```

Linha 219 - trocar:
```typescript
crmError = crmData.message || "CRM submission failed";
```
Por:
```typescript
crmError = crmData.message || crmData.error || "CRM submission failed";
```

Isso corrige: tag "30 Seg", abertura de inspecao, busca de link de vistoria -- tudo passara a funcionar.

---

## 2. Auto-preencher veiculo pela placa (via CRM)

### Estrategia

Reestruturar o fluxo para que a criacao da cotacao no CRM aconteca no Step 2 (quando o usuario digita a placa), em vez de esperar o Step 3 (endereco). Assim:

1. Usuario preenche dados pessoais (Step 1)
2. Usuario digita a placa e clica "Consultar" (Step 2)
3. Sistema cria a cotacao no CRM com dados pessoais + placa
4. Sistema busca GET /quotation/{code} para obter dados do veiculo identificado pelo DENATRAN
5. Auto-preenche marca, modelo, ano, cor, tipo
6. Usuario so precisa confirmar e selecionar "uso do veiculo"
7. Step 3 (endereco) apenas salva no banco local -- cotacao CRM ja existe

### Nova edge function: `supabase/functions/consulta-placa-crm/index.ts`

Recebe: `personal` (name, phone, email, cpf) + `plate`

Faz:
1. POST `/api/quotation/add` com dados minimos (name, phone, email, registration, plts)
2. Se sucesso, GET `/api/quotation/{quotationCode}` para obter dados do veiculo
3. Adiciona tag 23323
4. Abre inspecao
5. Retorna: quotationCode, vehicleData (brand, model, year, color, type, fipeCode)

```typescript
// Retorno esperado:
{
  quotationCode: "ABC123",
  negotiationCode: "XYZ789",
  vehicle: {
    brand: "SHINERAY",
    model: "XY 150-8 JEF S",
    year: "2025",
    color: "PRETA",
    type: "moto",
    city: "UBERLANDIA/MG",
    fipeCode: "850046-0" // se disponivel
  }
}
```

### Arquivo: `supabase/config.toml`

Adicionar:
```toml
[functions.consulta-placa-crm]
verify_jwt = false
```

### Arquivo: `src/pages/Quote.tsx` -- Step 2

Adicionar botao "Consultar" ao lado do campo de placa:
- Quando clicado, chama `consulta-placa-crm` com dados pessoais + placa
- Exibe loading enquanto consulta
- Auto-preenche campos de veiculo com dados retornados
- Mostra card com dados identificados (marca, modelo, ano, cor)
- Selecao manual via FIPE continua disponivel como fallback
- Salva o `quotationCode` no contexto para nao criar duplicata

### Arquivo: `src/pages/Quote.tsx` -- Step 3

Alterar a submissao final:
- Se ja existe `quotationCode` (placa consultada via CRM), NAO chamar `submit-to-crm` novamente
- Apenas salvar dados do endereco no banco local (quotes table)
- Se NAO existe `quotationCode` (usuario preencheu manualmente), manter fluxo atual

### Arquivo: `src/contexts/QuoteContext.tsx`

Adicionar campo `crmQuotationCode` ao QuoteData para rastrear se a cotacao ja foi criada no CRM.

---

## Fluxo revisado

```text
Step 1: Dados pessoais (nome, email, telefone, CPF)
                    |
Step 2: Placa --> [Consultar] --> CRM cria cotacao + identifica veiculo
                    |                      |
                    |              Auto-preenche marca/modelo/ano/cor
                    |              + Abre inspecao
                    |              + Adiciona tag 30 Seg
                    |
         Usuario confirma dados + seleciona uso do veiculo
                    |
Step 3: Endereco --> Salva no banco local
                    |
         Resultado --> Busca planos CRM
```

---

## Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/submit-to-crm/index.ts` | Corrigir deteccao de sucesso e nomes de campos |
| `supabase/functions/consulta-placa-crm/index.ts` | **NOVO** - consulta placa via CRM |
| `supabase/config.toml` | Adicionar consulta-placa-crm |
| `src/pages/Quote.tsx` | Botao "Consultar", auto-preenchimento, logica de submissao |
| `src/contexts/QuoteContext.tsx` | Adicionar crmQuotationCode ao estado |

---

## Impacto

- Cotacoes passarao a ser criadas corretamente no CRM (bug fix)
- Tag, inspecao e link de vistoria funcionarao automaticamente
- Usuario nao precisara selecionar marca/modelo/ano manualmente
- Selecao manual FIPE permanece como fallback caso o CRM nao identifique o veiculo
