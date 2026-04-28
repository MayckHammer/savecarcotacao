## Objetivo

Deixar o joguinho do carrinho mais rápido (mais desafiador) na versão mobile, mantendo a velocidade atual no desktop.

## Mudanças em `src/components/CarMiniGame.tsx`

Detectar mobile via `window.innerWidth < 768` e aplicar parâmetros de velocidade maiores:

| Parâmetro | Desktop (atual) | Mobile (novo) |
|---|---|---|
| Velocidade inicial (`speedRef` no reset) | 3 | 4.5 |
| Base da rampa de aceleração | 4.2 | 5.8 |
| Velocidade máxima | 12 | 15 |
| Divisor da rampa (quanto menor, mais rápido acelera) | 280 | 200 |

### Pontos do código a ajustar

- **Linha 57** (`reset`): `speedRef.current = 3` → usar `baseSpeed` calculado por viewport.
- **Linha 211** (loop de draw): `speedRef.current = Math.min(12, 4.2 + scoreRef.current / 280)` → usar as constantes `maxSpeed`, `startSpeed`, `speedRamp` calculadas no componente.

A detecção é feita uma vez no mount (não precisa ser reativa a resize — o jogo é uma sessão curta).

## Sem outras alterações

- Controles, layout, regras de pontuação e prêmio (PRIZE_GOAL) permanecem iguais.
- Nada de banco, edge function ou outras telas.

## Validação

1. Abrir o site no mobile (viewport < 768px) → carrinho começa visivelmente mais rápido e acelera mais agressivo.
2. Abrir no desktop → velocidade igual à de hoje.
