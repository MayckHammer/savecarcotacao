# Corrigir scraper do compareTables para refletir 1:1 o que o CRM mostra

## Diagnóstico
A página `/compareTables` é HTML estruturado:

- Cabeçalho do plano: `<span class="name_plan">PREMIUM</span>` + `<span class="price_plan">R$&nbsp;285,41</span>` + `<a planid="..." tppid="..." class="open_modal_contratar">Aceitar Proposta</a>`
- Cada linha (`.t-row-content-wrapper`) tem:
  - `.t-row-desc .t-cell-desc-l` → label (ex: "Colisão ( Até 100% FIPE )", "Adesão", "Cota de participação")
  - N `.t-row-cell .t-cell-value` (uma por plano, ordem = ordem dos headers) → texto (`R$ 435,35`, `7,50% FIPE`) ou `<img alt="Tem">` / `<img alt="Nao tem">`
- Cliente: `h2` ("Olá, Mayck Hammer Save Car"), `.corPrimary` (placa + descrição), `.corSecondary` (FIPE)

O regex atual (`PREMIUM[\s\S]{0,4000}?R\$...`) captura o primeiro `R$` qualquer — por isso aparece R$ 100.000,00 (valor RCF) em vez de R$ 285,41.

## 1. Reescrever `parsePlansFromHtml` na edge function `pwrcrm-quote`

Usar `deno-dom-wasm` para parsear o HTML corretamente:

```ts
import { DOMParser, Element } from "https://deno.land/x/deno_dom@v0.1.46/deno-dom-wasm.ts";
```

Retorno:
```ts
{
  client: {
    name: string | null,           // "Mayck Hammer Save Car"
    vehicleDescription: string | null, // "PAI0F65 - Citroën, AIRCROSS Live 1.6 ..."
    fipeValue: number | null,      // 48937
    fipeFormatted: string | null,  // "R$ 48.937,00"
  },
  plans: [
    {
      name: "PREMIUM" | "COMPLETO",
      monthlyPrice: 285.41,
      annualPrice: 285.41 * 12,
      adhesion: 435.35,              // lido da linha "Adesão"
      participation: "7,50% FIPE",   // lido da linha "Cota de participação"
      planId: "16291",
      tppId: "2315162",
      acceptUrl: `https://app.powercrm.com.br/compareTables?h={qttnCd}&plan=PREMIUM`,
    },
    ...
  ],
  coverages: [
    { label: "Colisão ( Até 100% FIPE )", values: { PREMIUM: true, COMPLETO: true }, highlight: true },
    { label: "RCF (cobertura para terceiros) R$ 100.000,00 *- Danos materiais (...)", values: { PREMIUM: true, COMPLETO: false }, highlight: false },
    ...
  ],
  sourceUrl, fallbackUrl
}
```

Algoritmo:
1. Pegar o primeiro `.t-row.t-first-row .t-row-cell`. Para cada cell ler `.name_plan`, `.price_plan` e `a.open_modal_contratar[planid][tppid]`. Isso define a ordem das colunas.
2. Iterar todos os `.t-row-content-wrapper` (exceto o primeiro). Para cada um:
   - label = `.t-row-desc .t-cell-desc-l` textContent.trim()
   - cells = `.t-row-values .t-row-cell` em ordem → para cada cell, ler `.t-cell-value`:
     - se contém `<img>`: `alt === "Tem"` → `true`, senão `false`
     - senão: textContent normalizado (R$/percentual)
3. Linhas especiais "Adesão" e "Cota de participação" → injetar dentro do objeto do plano correspondente. Demais → `coverages[]`.
4. `highlight = true` para os 6 primeiros labels que casarem com `["Colisão", "Roubo e Furto", "Incêndio", "Fenômenos da Natureza", "RCF", "Assistência 24h"]` (case-insensitive, prefixo).
5. Cliente: `document.querySelector("h2")`, `.corPrimary`, `.corSecondary`.

## 2. `src/pages/PlansFromCrm.tsx` — ajustes
- Renderizar **ambos** os planos (atualmente só apareceu PREMIUM pois COMPLETO não foi extraído).
- Mostrar `adhesion` e `participation` reais por plano.
- Cabeçalho exibir `client.vehicleDescription` e `fipeFormatted` quando disponíveis (cai para o `quote.vehicle` se vier vazio).
- Coberturas: cada item exibe label + ✓/✗ (verde/cinza) ou texto literal (para valores como "7,50% FIPE" / "Até R$ 100.000,00"). 6 principais visíveis, restante atrás de "Ver tabela completa".
- "Contratar Agora": `window.open(plan.acceptUrl, "_blank")` (já redireciona para `compareTables?h=...&plan=PREMIUM`, onde o usuário clica "Aceitar Proposta" no fluxo oficial). "Negociar valores" e WhatsApp/`/aguardando` permanecem como estão.

## Resultado esperado
Com `h=E01xWGjq`, o app mostrará:
- PREMIUM **R$ 285,41/mês** · Adesão R$ 435,35 · Participação 7,50% FIPE
- COMPLETO **R$ 265,20/mês** · Adesão R$ 435,35 · Participação 7,50% FIPE
- Coberturas com ✓/✗ idênticos à tabela do CRM, incluindo as diferenças (ex: RCF Danos Materiais ✓ PREMIUM × ✗ COMPLETO).
