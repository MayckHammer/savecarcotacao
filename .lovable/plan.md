## Problema

Quando o modelo do carro existe em mais de uma categoria do CRM (ex.: leve e utilitário), a API `pwrcrm-quote` retorna 4 planos: 2 PREMIUM e 2 COMPLETO. Hoje o frontend renderiza todos, poluindo a tela.

## Solução

Em `src/pages/PlansFromCrm.tsx`, agrupar os planos por `name` e manter apenas o de maior `monthlyPrice` em cada grupo. Resultado: sempre no máximo 1 PREMIUM + 1 COMPLETO em tela (o mais caro de cada).

### Mudança

No `useMemo` que calcula `orderedIndexes` (linhas 98–104), antes de ordenar:

1. Agrupar índices por `plans[i].name`.
2. Em cada grupo, manter apenas o índice com o maior `plans[i].monthlyPrice` (desempate: maior `annualPrice`, depois primeiro encontrado).
3. Ordenar o resultado com PREMIUM primeiro, COMPLETO depois (lógica atual preservada).

As linhas da tabela de coberturas (`CoverageRow`) já usam `orderedIndexes`, então a tabela automaticamente reflete apenas os planos visíveis — nenhuma mudança extra necessária.

### Escopo

- Apenas frontend, arquivo único: `src/pages/PlansFromCrm.tsx`.
- Sem alterações em edge functions, CRM ou banco.
- Regra aplicada sempre que houver planos com o mesmo `name` (não só quando há 4).
