## O que os 3 prints provam

Olhando a sequência de prints do CRM, fica claro o fluxo manual que o atendente faz:

```text
Print 1 (image-105) — antes:                Print 2 (image-106) — depois da lupa:
┌─────────────────────────────┐            ┌─────────────────────────────────────┐
│ Marca:    Citroën           │            │ INFORMAÇÕES DENATRAN                │
│ Modelo:   [vazio]           │            │ CITROEN C3 AIRC TENDANCE 2014/2015  │
│ Cód FIPE: 011122-8          │   click    │                                     │
│ Valor FIPE: [VAZIO!] ❌     │   lupa →   │ Modelo: AIRCROSS SALOMON TENDANCE..│
│ Valor Protegido: -          │            │ Cód FIPE: 011122-8                  │
└─────────────────────────────┘            │ Valor FIPE: [ainda vazio] ⚠️        │
                                           └─────────────────────────────────────┘
                                              network: pltVrfyQttn?plates=PAI0F65
                                                       cmby?cb=18&cy=2015
                                                       carregando.gif

Print 3 (image-107) — depois do Salvar:
┌─────────────────────────────────────┐
│ Modelo: AIRCROSS SALOMON TENDANCE.. │
│ Cód FIPE: 011150-3                  │ ← código mudou (FIPE recalculou)
│ Valor FIPE: R$ 42.906,00 ✅         │ ← agora preenchido
│ Valor Protegido: R$ 42.906,00 ✅    │
└─────────────────────────────────────┘
   network: updateQuotationVehicleData (XHR POST)
            cmby?cb=18&cy=2015
            fetchNegotiationCard (recarrega card)
```

**Conclusão técnica:**
1. Hoje nossa edge function envia `code + mdl + mdlYr + cdFp + protectedValue` via `/quotation/update` — mas isso NÃO dispara o cálculo de `vhclFipeVl` no backend do CRM. Por isso o card fica com FIPE vazio até alguém clicar manualmente em "Salvar".
2. O endpoint que o botão "Salvar" do `vehicleEditForm` realmente chama é **`updateQuotationVehicleData`** (visível no print 3), que é **diferente** do nosso `/quotation/update` atual.
3. O endpoint da "lupa" é **`pltVrfyQttn?plates=PAI0F65`** (Plate Verify Quotation) — esse é o que repopula brand/model/ano antes de salvar.

## O que vou fazer

### Passo 1 — Mapear os endpoints reais do botão Salvar e da lupa

A edge function precisa chamar exatamente o que o navegador chama:

| Ação no CRM    | Endpoint (descoberto pelos prints)                       | Quando chamar                              |
| -------------- | -------------------------------------------------------- | ------------------------------------------ |
| Lupa FIPE      | `GET /api/quotation/pltVrfyQttn?plates={placa}`          | Logo após criar a cotação                  |
| Buscar modelos | `GET /api/quotation/cmby?cb={brandId}&cy={year}`         | Após a lupa devolver brand+year            |
| Salvar         | `POST /api/quotation/updateQuotationVehicleData`         | Após preencher mdl + mdlYr + cdFp          |
| Verificar      | `GET /api/quotation/{code}` → ler `vhclFipeVl`           | Polling até valor > 0                      |

Os dois primeiros aparecem nos prints de network como XHR. O `updateQuotationVehicleData` aparece duas vezes no print 3 — é o que o Salvar dispara.

### Passo 2 — Reescrever o fluxo da edge function `consulta-placa-crm`

Sequência nova quando o usuário envia placa:

```text
1. POST /quotation/add                       → cria card, recebe quotationCode
2. POST /quotation/add-tag (23323)           → tag "30 Seg" (já existe)
3. GET  /quotation/pltVrfyQttn?plates=XXX    → "lupa": CRM lê DENATRAN+monta payload
4. GET  /quotation/cmby?cb=ID&cy=ANO         → modelos do ano (já temos)
5. (Parallelum) resolve fipeCode + fipeValue oficiais
6. POST /quotation/updateQuotationVehicleData
       { quotationCode, vhclBrand, vhclModel, vhclModelYear,
         vhclFabricationYear, vhclFipeCd, vhclFipeVl, vhclChassi, vhclColor }
       ← este é o endpoint do botão Salvar
7. Polling GET /quotation/{code} (até 8s, 4 tentativas) até vhclFipeVl > 0
8. Devolve para o app o vehicle com FIPE confirmado pelo CRM
```

No fluxo manual (sem placa) pula etapas 3-4 e usa o `manualVehicle` do payload diretamente nas etapas 5-7.

### Passo 3 — Resposta ao app

Adicionar no JSON de resposta os campos:

```json
{
  "vehicle": { ... },
  "crmFipeConfirmed": true,         // ← novo: true se polling pegou valor > 0
  "crmFipeValue": 42906,            // ← novo: valor que o CRM bateu
  "crmFipeCode": "011150-3",        // ← novo: código que o CRM aceitou
  "fipeSource": "parallelum-by-label"
}
```

O `Quote.tsx` continua confiando no `vehicle.fipeValue` (Parallelum oficial) para mostrar ao cliente, mas agora temos garantia que o card do CRM já está com o mesmo valor antes de mandar o cliente para a próxima etapa.

### Passo 4 — Tratamento de erro/timeout

- Se `pltVrfyQttn` falhar → cai no `extractVehicleFromAny(/plates)` antigo (fallback que já existe).
- Se `updateQuotationVehicleData` falhar → loga e tenta o `/quotation/update` antigo como fallback (não quebra o fluxo).
- Se polling esgotar sem `vhclFipeVl` → ainda assim devolve o veículo com `crmFipeConfirmed: false` e o app segue (não bloqueia o cliente, mas marca para o atendente revisar).

## Detalhes técnicos

**Arquivos a editar:**
- `supabase/functions/consulta-placa-crm/index.ts`:
  - Adicionar `triggerCrmPlateLookup(token, quotationCode, plate)` — chama `pltVrfyQttn`.
  - Adicionar `saveCrmVehicleData(token, quotationCode, vehicle)` — chama `updateQuotationVehicleData` com o payload do form (chaves `vhcl*`).
  - Adicionar `pollCrmFipeValue(token, quotationCode, expectedValue, maxMs=8000)` — polling com backoff em `getQuotation` lendo `vhclFipeVl`.
  - Reorganizar `Deno.serve` para chamar a sequência nova.
  - Manter `BodySchema` atual (continua aceitando `manualVehicle` opcional).

**Arquivos NÃO mexidos:**
- `Quote.tsx` (continua chamando a edge function igual; só lê novos campos opcionais da resposta)
- `QuoteContext` (sem alteração de schema)
- `consulta-placa` (sem alteração)

**Riscos / pontos de atenção:**
1. Os nomes exatos dos campos do `updateQuotationVehicleData` (`vhclBrand` vs `vhclBrandId`, `vhclFipeVl` aceitando string "R$ X.XXX,XX" vs número) só vão ser confirmados em runtime. Vou logar a request e response da primeira chamada e ajustar se o CRM rejeitar.
2. O `pltVrfyQttn` parece exigir que o card já exista (parâmetro `qttn` aparece no nome). Se não funcionar com `?plates=` puro vou tentar `?plates=XXX&qttn={quotationCode}`.
3. Sequência adiciona ~3-5s ao tempo total da chamada (lupa + save + polling). Hoje a chamada já leva ~6s, vai para ~10-11s. Aceitável porque o cliente já vê loading.

**Após editar:**
- Deploy da edge function.
- Teste com a placa `PAI0F65` que já está no log (sabemos que cai no card "DnKN1l8r" e atualmente fica com FIPE vazio).
- Verificar nos logs: `pltVrfyQttn → 200`, `updateQuotationVehicleData → 200`, polling pegando `vhclFipeVl=42906`.

## Resultado esperado

Quando o cliente envia a placa pelo app:
1. Card do CRM é criado com FIPE **já preenchido** (sem precisar de intervenção manual do atendente).
2. App recebe confirmação de que o CRM bateu o valor — segue para a tela de planos com confiança.
3. Atendente abre o card e vê tudo completo (Marca, Modelo, Ano, Cód FIPE, Valor FIPE, Valor Protegido) — exatamente como ficaria se ele tivesse clicado lupa+Salvar manualmente.

Aprovando, eu já implemento, faço deploy e mando os logs do teste com a placa `PAI0F65` para você validar.
