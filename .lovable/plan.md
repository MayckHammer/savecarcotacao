

## Exibir coberturas completas do plano selecionado

### O que muda

Ao selecionar entre COMPLETO e PREMIUM, exibir logo abaixo do seletor a lista completa de todas as coberturas do plano escolhido (como nos prints do CRM), em vez dos acordeoes agrupados por categoria.

### Layout

Substituir os acordeoes de categorias (linhas 154-192) por uma unica secao com:
- Titulo do plano selecionado + preco (ex: **PREMIUM — R$230,00**)
- Lista simples de todas as coberturas do `PLAN_COVERAGES[quote.planName]`, cada item em uma linha com separador sutil entre eles
- Estilo similar ao print: fundo claro, texto escuro, cada cobertura em uma linha separada

### Detalhes Tecnicos

**Arquivo: `src/pages/PlanDetails.tsx`**

1. Remover o bloco `coverageGroups` (linhas 22-63) e o state `expandedCoverage` (linha 18)
2. Substituir o bloco de acordeoes (linhas 154-192) por:
   - Um `Card` com header mostrando nome do plano e preco (usando `getTotal()` ou `getSubtotalWithoutDiscount()` do contexto)
   - Lista de `PLAN_COVERAGES[quote.planName]` renderizada como itens simples separados por bordas finas
   - Cada item em `text-sm text-foreground` com `py-2 border-b border-border/50`
   - Itens especiais como "Clube de Descontos" e "Assistencia funeral Zelo" com label a direita (**CLUBE CERTO**, **ZELO**)
3. Importar `useQuote` com `getSubtotalWithoutDiscount` para mostrar o preco no header da secao
