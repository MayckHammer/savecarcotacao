

# Corrigir consulta de veiculo pela placa via CRM

## Problema

O CRM retorna `carModel: null` no endpoint `GET /api/quotation/{code}` porque a identificacao do veiculo pelo DENATRAN acontece de forma assincrona. Quando buscamos os dados imediatamente apos criar a cotacao, o veiculo ainda nao foi processado.

A segunda imagem mostra que no Power CRM, os dados do veiculo (SHINERAY XY150-8 2025/2025, cor PRETA, cidade UBERLANDIA/MG) estao disponiveis -- mas no endpoint de **negociacao**, nao na cotacao.

Alem disso, as chamadas de tag e inspecao estao crashando porque o CRM retorna texto puro ("Sucesso", "Ja existe...") em vez de JSON, causando `SyntaxError: Unexpected token`.

## Solucao

### Arquivo: `supabase/functions/consulta-placa-crm/index.ts`

Tres mudancas:

**1. Buscar dados via endpoint de negociacao**

Apos criar a cotacao, usar `GET /api/negotiation/{negotiationCode}` em vez de (ou alem de) `GET /api/quotation/{code}`:

```typescript
// Buscar detalhes da negociacao (onde os dados do veiculo ficam)
if (negotiationCode) {
  const negRes = await fetch(
    `https://api.powercrm.com.br/api/negotiation/${negotiationCode}`,
    { headers: { "Authorization": `Bearer ${token}` } }
  );
  if (negRes.ok) {
    const negData = await negRes.json();
    // Extrair dados do veiculo da negociacao
  }
}
```

**2. Adicionar delay antes de buscar os dados**

O CRM precisa de tempo para processar a consulta DENATRAN. Adicionar um `await new Promise(r => setTimeout(r, 3000))` (3 segundos) antes de buscar os detalhes.

**3. Corrigir parsing de respostas de tag e inspecao**

Usar `.text()` em vez de `.json()` para os endpoints que retornam texto puro:

```typescript
// Tag - retorna "Sucesso" como texto
const tagText = await tagRes.text();
console.log("Tag response:", tagText);

// Inspecao - retorna "Ja existe..." como texto  
const inspText = await inspRes.text();
console.log("Open inspection response:", inspText);
```

**4. Manter fallback para quotation endpoint**

Se a negociacao nao retornar dados, tentar o endpoint de cotacao como fallback.

## Fluxo atualizado

```text
1. POST /api/quotation/add (criar cotacao)
2. POST /api/quotation/add-tag (tag 30 seg) -- usar .text()
3. POST /api/quotation/open-inspection -- usar .text()
4. Aguardar 3 segundos (DENATRAN processar)
5. GET /api/negotiation/{negotiationCode} (dados do veiculo)
6. Se nao encontrar, fallback: GET /api/quotation/{quotationCode}
7. Retornar vehicle data para o frontend
```

## Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/consulta-placa-crm/index.ts` | Buscar via negociacao + delay + fix parsing |

## Resultado esperado

- Placa TEV3H48 retornara: SHINERAY, XY 150-8 JEF S, 2025, PRETA, moto
- Campos serao preenchidos automaticamente no frontend
- Erros de parsing de tag/inspecao eliminados dos logs

