## Problema

Pelos logs e prints:

1. **No app**: Após selecionar "AIRCROSS Live 1.5 Flex 8V 5p Mec." (modelo correto), a tela ainda mostra **"FIPE encontrada: R$ 38.412,00 — código 011117-1"** — que é o valor da FIPE da sugestão anterior (Aircross Tendance 1.6). O valor não é re-buscado para o modelo recém escolhido.

2. **No CRM**: O card mostra "Código FIPE: 011162-7" e **"Valor FIPE: vazio"**. Só após clicar manualmente na lupa azul ao lado da placa o CRM dispara a rotina interna que preenche o Valor FIPE. O endpoint `quotation/quotationFipeApi` que estamos chamando hoje **não é** o mesmo que a lupa aciona — por isso o `fipeCheck` retorna `"CRM ainda não persistiu o valor FIPE"`.

3. A lupa do CRM equivale a re-disparar `/quotation/plates/{placa}` **dentro do contexto da cotação** (passando o `quotationCode`), o que faz o CRM:
   - reconsultar DENATRAN,
   - persistir `cdFp`,
   - chamar a FIPE Parallelum internamente,
   - gravar `vhclFipeVl` no card.

## Solução

### 1. Ao confirmar o modelo no app, recalcular a FIPE pelo `crmModelId` + `crmYearId` selecionados

Hoje, quando o usuário troca a sugestão no dropdown, reusamos o `fipeValue` que veio junto da opção. Mas todas as opções carregam o **mesmo** valor (R$ 38.412 — herdado do código FIPE inicial 011117-1), então a tela não atualiza e o valor fica errado para o modelo realmente escolhido.

Mudança em `supabase/functions/consulta-placa-crm/index.ts`:

- Quando vier `selectedModel` no payload, **antes** do `quotation/update` chamar:
  1. `GET /quotation/cmf?cm={crmModelId}&cmy={crmYearId}` (endpoint do CRM que retorna o **código FIPE específico** do par modelo+ano).
  2. Com o `cdFp` retornado, consultar a FIPE Parallelum (`enrichFromFipeByCode`) e obter o **valor real** daquele modelo/ano.
  3. Sobrescrever `selectedModel.fipeCode` e `selectedModel.fipeValue` com os dados recém-buscados antes de montar o `updateBody`.
- Retornar o `fipeCode`/`fipeValue` recalculado no JSON de resposta (`recomputed: { fipeCode, fipeValue, fipeFormatted }`).

Em `src/pages/Quote.tsx → handleCrmModelConfirm`:

- Após a chamada, se `data.recomputed` veio, atualizar o estado:
  ```ts
  updateVehicle({
    fipeCode: data.recomputed.fipeCode,
    fipeValue: data.recomputed.fipeValue,
    fipeFormatted: data.recomputed.fipeFormatted,
  });
  ```
- O texto "FIPE encontrada: R$ ..." vai refletir o modelo correto.

### 2. Disparar a "lupa" do CRM automaticamente após o update do modelo

A lupa equivale a re-rodar a consulta de placa no contexto da cotação. Os endpoints corretos do PowerCRM para isso são (testaremos qual está disponível, em ordem):

1. `POST /quotation/getPlate` com `{ quotationCode, plates: "PAI0F65" }`
2. `POST /quotation/setVhclFipeVl` com `{ quotationCode, vhclFipeVl: <valor> }` (alguns CRMs expõem isso)
3. Fallback: re-`POST /quotation/update` com **apenas** `{ code, cdFp, vhclFipeVl }` separado, que historicamente força o trigger interno.

Mudança em `consulta-placa-crm/index.ts`, dentro do bloco `if (crmQuotationCode && selectedModel)`:

```ts
// Após o update inicial:
await fetch(`${CRM_BASE}/quotation/getPlate`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
  body: JSON.stringify({ quotationCode: crmQuotationCode, plates: plate, plts: plate }),
});
await new Promise(r => setTimeout(r, 1500));
await getQuotationFipe(token, crmQuotationCode); // mantém como reforço

// Segundo update isolado só com FIPE — força o CRM a persistir vhclFipeVl
await fetch(`${CRM_BASE}/quotation/update`, {
  method: "POST",
  headers: { ... },
  body: JSON.stringify({
    code: crmQuotationCode,
    cdFp: recomputedFipeCode,
    codFipe: recomputedFipeCode,
    vhclFipeVl: recomputedFipeValue,
    vlFipe: recomputedFipeValue,
    protectedValue: recomputedFipeValue,
  }),
});
```

### 3. Replicar o mesmo disparo logo após a criação inicial da cotação

No fluxo da consulta de placa (sem `selectedModel`), depois do "Early CRM update" (linha 763-778), adicionar a mesma chamada `getPlate` + segundo update isolado de FIPE para já preencher o card sem precisar de clique.

### 4. Polling de verificação até o CRM persistir

No `fipeCheck`, em vez de uma única verificação após 1,2s, fazer **polling de até 6s** (3 tentativas com 2s) re-lendo `getQuotation` e parando assim que `vhclFipeVl > 0`. Reduz falsos negativos do toast "CRM ainda não persistiu".

## Arquivos a modificar

- `supabase/functions/consulta-placa-crm/index.ts`
  - Nova função `fetchFipeCodeForModelYear(token, crmModelId, crmYearId)`.
  - Nova função `triggerCrmPlateLookup(token, quotationCode, plate)`.
  - Recalcular FIPE quando `selectedModel` é recebido.
  - Adicionar `recomputed` no JSON de resposta.
  - Adicionar polling de verificação (até 3 tentativas).
  - Replicar `getPlate` + segundo update no fluxo inicial.
- `src/pages/Quote.tsx`
  - `handleCrmModelConfirm`: ler `data.recomputed` e atualizar `fipeCode`/`fipeValue`/`fipeFormatted` no contexto.

## Resultado esperado

- Ao trocar o modelo no dropdown, a linha "FIPE encontrada: R$ ..." atualiza para o valor correto daquele modelo/ano.
- O card no CRM mostra Código FIPE e Valor FIPE preenchidos automaticamente, sem o operador precisar clicar na lupa.
- O toast de divergência só aparece se realmente houver divergência após o polling.
