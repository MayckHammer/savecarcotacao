## Objetivo

Simplificar drasticamente o fluxo após a cotação: pular a tela intermediária de FIPE e tornar a página de plano mais visual, leve e com um mini-game enquanto o consultor entra em contato.

---

## 1. Remover a tela de Resultado (FIPE)

**Arquivo:** `src/pages/Quote.tsx`
- No final do Step 3 (`handleNext` → submit), trocar `navigate("/resultado")` por `navigate("/detalhes")`.
- Manter o `submit-to-crm` como está (ainda precisamos do `session_id`).

**Arquivo:** `src/pages/PlanDetails.tsx`
- Adicionar no topo o `useEffect` que hoje vive em `Result.tsx` para buscar os planos do CRM (`get-crm-plans`) usando `quote.sessionId`. Mostrar um pequeno skeleton/loader nos cards de plano enquanto carrega.

**Arquivo:** `src/App.tsx` (rota `/resultado`)
- Manter a rota apontando para `Result` por compatibilidade (não quebrar links antigos), mas ela não será mais usada no fluxo. Opcional: redirecionar `/resultado` → `/detalhes`.

---

## 2. Redesenhar `PlanDetails.tsx` — mais visual, menos texto

### 2.1 Cabeçalho do plano (mais visual)
- Manter o card colapsável do usuário.
- Substituir a longa lista de coberturas por **chips/ícones visuais**: usar grid 2 colunas com ícones do `lucide-react` (Shield, Car, Wrench, KeyRound, Fuel, Hotel, Phone, Tag) + 2-3 palavras curtas. Nada de frases longas.
- Manter os 2 cards COMPLETO/PREMIUM como seletor (já estão visuais).
- Remover o card grande com a lista textual completa de coberturas. Deixar apenas o resumo visual em chips.

### 2.2 Renomear "Forma de pagamento" → "Pretensão de pagamento"
**Arquivo:** `src/components/PaymentMethodSelector.tsx`
- Trocar o título do componente para **"Pretensão de pagamento"**.
- Manter os dois cards (Cartão de Crédito / PIX-Boleto) como estão.

### 2.3 Remover toggle Mensal/Anual e bloco de valores
- Remover o componente `<FinancialSummary />` da página.
- Remover também o bloco "Primeiro pagamento / Subtotal / Total".

### 2.4 Adicionar bloco informativo de agradecimento
Logo após o seletor de pretensão de pagamento, inserir um card destacado (verde claro, com ícone CheckCircle):

> **Obrigado por escolher a SAVE CAR BRASIL!**  
> Em até 5 minutos um de nossos consultores entrará em contato para finalizar seu cadastro e confirmar o pagamento.

### 2.5 Mini-game de carrinho amarelo
Criar um novo componente `src/components/CarMiniGame.tsx`:
- Canvas/HTML simples (sem libs novas) onde um **carrinho amarelo** (emoji 🚗 estilizado em amarelo Loovi `#F2B705`, ou SVG inline) corre numa estrada.
- Controles touch: arrastar lateralmente (esquerda/direita) para desviar de obstáculos (cones laranjas) que descem pela tela.
- Pontuação no topo, "Game Over" com botão "Jogar de novo".
- Loop com `requestAnimationFrame`, estado em React com `useRef`/`useState`.
- Altura ~360px, largura 100% do container, bordas arredondadas, fundo cinza-asfalto com faixas brancas animadas.
- Texto curto acima: *"Enquanto isso, que tal se divertir? 🎮"*

### 2.6 Cupom + remoção do botão "Contratar"
- Manter o bloco "Adicionar cupom" + input + botão Aplicar **abaixo do mini-game**.
- **Remover** o botão "Contratar" e o badge "Compra segura".
- Manter o disclaimer legal no rodapé.

---

## 3. Estrutura final da página `/detalhes` (de cima para baixo)

```text
[Header]
[Card colapsável do associado]
[Meu plano — título]
[Seletor COMPLETO / PREMIUM]
[Grid visual de coberturas em ícones + chips]
[Pretensão de pagamento — Cartão / PIX]
[Card "Obrigado por escolher..."]
[Mini-game do carrinho amarelo 🚗]
[Bloco de cupom]
[Disclaimer legal]
[WhatsAppButton]
```

---

## Detalhes técnicos

- Não mexer em `QuoteContext` (preserva `billingPeriod` para o caso do CRM precisar).
- `get-crm-plans` continua sendo chamado, agora dentro de `PlanDetails.tsx` no mount, para popular preços usados internamente (não exibidos).
- Mini-game 100% client-side, sem novas dependências (apenas React + Tailwind + canvas 2D).
- Animações de entrada via `framer-motion` (já instalado) para os cards e o bloco de agradecimento.
- Cores Loovi: verde `#0D5C3E` para o card de agradecimento, amarelo `#F2B705` para o carrinho.

---

## Arquivos afetados

- `src/pages/Quote.tsx` — redirecionar para `/detalhes`
- `src/pages/PlanDetails.tsx` — redesign completo conforme acima
- `src/components/PaymentMethodSelector.tsx` — renomear título
- `src/components/CarMiniGame.tsx` — **novo**
- `src/App.tsx` — opcional: redirect de `/resultado` para `/detalhes`
