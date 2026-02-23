

# Reimplantar edge function + adicionar quotationFipeApi

## Problema confirmado

Os logs mostram que o codigo antigo ainda esta rodando no servidor:
- Erro na linha 73: `.json()` no tag (codigo novo usa `.text()` na mesma linha)
- Erro na linha 90: `.json()` na inspecao
- Nenhum log "Negotiation details:" aparece
- Apenas "Quotation details:" com `carModel: null`

O codigo no repositorio ja esta correto, mas nunca foi implantado com sucesso.

## Solucao

### 1. Adicionar endpoint `quotationFipeApi`

Baseado no print da documentacao do Power CRM, existe o endpoint:

```
GET https://api.powercrm.com.br/api/quotation/quotationFipeApi?quotationCode=xxx
```

Este endpoint retorna dados FIPE do veiculo apos o processamento assincrono. Sera adicionado como segunda tentativa de busca, entre negociacao e o fallback de cotacao.

### 2. Aumentar delay para 5 segundos

3 segundos nao esta sendo suficiente para o DENATRAN processar. Aumentar para 5s.

### 3. Forcar reimplantacao

Garantir que o codigo atualizado seja implantado com sucesso.

## Fluxo de busca atualizado

```text
1. POST /api/quotation/add (criar cotacao)
2. POST /api/quotation/add-tag (usar .text())
3. POST /api/quotation/open-inspection (usar .text())
4. Aguardar 5 segundos
5. GET /api/negotiation/{negotiationCode} (tentativa 1)
6. GET /api/quotation/quotationFipeApi?quotationCode=xxx (tentativa 2)
7. GET /api/quotation/{quotationCode} (fallback final)
8. Retornar vehicle data
```

## Mudancas tecnicas

### Arquivo: `supabase/functions/consulta-placa-crm/index.ts`

- Alterar delay de 3s para 5s (linha 93)
- Adicionar bloco entre os passos 5 e 6 para chamar `quotationFipeApi`:

```typescript
// Tentativa 2: quotationFipeApi (dados FIPE do veiculo)
if (!vehicle) {
  try {
    const fipeRes = await fetch(
      `https://api.powercrm.com.br/api/quotation/quotationFipeApi?quotationCode=${quotationCode}`,
      { headers: { "Authorization": `Bearer ${token}` } }
    );
    if (fipeRes.ok) {
      const fipeData = await fipeRes.json();
      console.log("quotationFipeApi response:", JSON.stringify(fipeData));
      // Extrair brand, model, year, color dos dados FIPE
    }
  } catch (e) {
    console.error("Error fetching quotationFipeApi:", e);
  }
}
```

- Forcar reimplantacao da edge function

## Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/consulta-placa-crm/index.ts` | Aumentar delay para 5s + adicionar quotationFipeApi |

## Resultado esperado

- Funcao reimplantada com codigo correto (sem erros de parsing)
- Negociacao consultada corretamente (log "Negotiation details:" aparecera)
- quotationFipeApi como fonte adicional de dados FIPE
- Placa TEV3H48 retornara: SHINERAY, XY 150-8, 2025, PRETA, moto
