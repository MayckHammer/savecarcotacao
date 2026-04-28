## Causa raiz (confirmada via swagger)

O PowerCRM tem **dois schemas diferentes**:

| Endpoint | Aceita `noteContract` (Observações no termo) | Aceita `noteContractInternal` (Observações internas - amarelo) |
|---|---|---|
| `POST /quotation/add` (criação) | ❌ não | ✅ sim |
| `POST /quotation/update` (atualização) | ✅ sim | ❌ **não** |

Nos logs do seu teste, **todas** as chamadas vão para `quotation/update` (a cotação `q2PgZN0r` já existia, então sempre cai no fluxo de update). O CRM responde 200, mas **descarta silenciosamente** o `noteContractInternal` porque o schema do update não tem esse campo. Resultado: o campo amarelo "Observações internas" fica vazio.

## Mudanças

### `supabase/functions/submit-to-crm/index.ts`

**1. No `updatePayload` (linha ~272):**
- Remover `noteContractInternal: internalNote`
- Adicionar `noteContract: internalNote` (esse é o único campo de nota que o endpoint de update aceita)

**2. No `crmPayload` de criação (linha ~205):**
- Manter `noteContractInternal: internalNote` (continua válido para `quotation/add`)
- Como o endpoint de criação **não** aceita `noteContract`, o destaque inicial só vai para o campo amarelo (interno).

**3. Resultado prático no PowerCRM:**
- Em cotações **novas**: o destaque aparece direto no campo amarelo "Observações internas".
- Em cotações **atualizadas** (caso atual do teste): o destaque aparece no campo "Observações no termo". 
  - ⚠️ Nota: esse campo pode aparecer no termo enviado ao cliente. Como é só o resumo de uso/plano/pagamento (informação que o próprio cliente escolheu), isso geralmente não é problema, mas vale confirmar.

### Sem mudanças em frontend, banco ou outras funções.

## Validação

1. Refazer uma cotação completa.
2. Abrir o card no PowerCRM:
   - Se for cotação nova → campo amarelo "Observações internas" preenchido.
   - Se for atualização de cotação existente → campo "Observações no termo" preenchido.
3. O bloco completo continua no campo "Observação" geral (inalterado).

## Alternativa (caso queira o destaque sempre no campo amarelo)

Se for crítico que o destaque apareça **sempre no amarelo** (mesmo em updates), a única forma seria:
- Detectar quando a cotação já existe e, em vez de fazer `update`, **deletar e recriar** (`add`) — o que pode causar perda de histórico/código de cotação.
- Ou solicitar ao PowerCRM que adicione `noteContractInternal` ao schema do `update`.

Recomendo seguir com a troca para `noteContract` no update (mudança mínima e funcional). Se preferir a alternativa, me avise.

## Arquivos a editar

- `supabase/functions/submit-to-crm/index.ts`
