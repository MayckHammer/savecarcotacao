# Plano: Página /planos com layout Loovi

## 1. Edge Function `pwrcrm-quote` — action `plans`
Aprimorar o scraping de `compareTables?h={qttnCd}` para retornar estrutura mais rica:

```ts
{
  client: { name, vehicleDescription, fipeValue },
  plans: [
    {
      name: "COMPLETO" | "PREMIUM",
      monthlyPrice: number,
      annualPrice: number,
      adhesion: number,
      participation: string,
      acceptUrl: string  // URL oficial de aceite no CRM
    }
  ],
  coverages: [
    { label: string, completo: boolean | string, premium: boolean | string, highlight: boolean }
  ],
  sourceUrl: string
}
```

`coverages[].highlight = true` para as 6 principais (Colisão, Roubo/Furto, Incêndio, RCF, Fenômenos da Natureza, Assistência 24h). As demais ficam ocultas no resumo e aparecem ao expandir.

## 2. Nova página `src/pages/PlansFromCrm.tsx` → rota `/planos?h={qttnCd}`

Layout mobile-first com identidade Loovi (verde #0D5C3E, amarelo #F2B705, glassmorphism):

```text
[Header dark]
[Resumo veículo + FIPE]
[Card PREMIUM]            [Card COMPLETO]   ← stacked no mobile
  R$ XX,XX/mês               R$ XX,XX/mês
  Adesão · Participação      Adesão · Participação
  [Contratar Agora] (verde, abre acceptUrl em nova aba)
  [Negociar valores] (outline amarelo, abre WhatsApp wa.me/5534998679585
                      com mensagem pré-preenchida + redireciona para /aguardando)

[Coberturas — 6 principais com ✓/✗ por plano]
[▼ Ver tabela completa] (Collapsible com todas as coberturas)
```

### Botões (especificação)
- **Contratar Agora**: `window.open(plan.acceptUrl, "_blank")` — fluxo oficial CRM.
- **Negociar valores**: 
  1. Monta mensagem: `Olá! Quero negociar valores do plano ${plan.name} para meu ${vehicle} (Cotação ${qttnCd}).`
  2. `window.open("https://wa.me/5534998679585?text=" + encodeURIComponent(msg), "_blank")`
  3. `navigate("/aguardando")` na mesma aba imediatamente após.

### Estados
- Loading: skeletons nos cards e tabela.
- Erro/sem dados: mostra fallback com botão "Abrir cotação oficial" → `compareTables?h=...`.

## 3. `CrmQuoteForm.tsx`
Substituir o `window.open(compareTables)` por `navigate('/planos?h=' + qttnCd)`. Dados do cliente/veículo continuam no `QuoteContext` (já são gravados).

## 4. Rota
Adicionar `/planos` em `src/App.tsx` importando `PlansFromCrm`.

## Detalhes técnicos
- Componente `Collapsible` (já existe em `ui/collapsible.tsx`) para tabela expandida.
- Ícones `Check`/`X` do lucide-react com cores `text-green-600` / `text-muted-foreground`.
- Cards usando tokens do design system (`bg-card`, `border`, `shadow-elegant`).
- Página `/aguardando` já existe — sem alterações.
- WhatsApp já é o mesmo número do `WhatsAppButton` (5534998679585).
