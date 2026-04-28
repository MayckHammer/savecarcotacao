# Adicionar página de simulação rápida sem placa

## Objetivo

Criar uma nova rota `/simulacao` (componente `QuickQuote`) que permite ao usuário ver preços estimados informando apenas:
- Tipo de veículo (carro / moto / caminhão)
- UF (estado de circulação)
- Faixa de valor FIPE (5 faixas pré-definidas)

E atualizar a Landing para direcionar o CTA principal para essa nova página, mantendo um link secundário "Já tenho a placa" apontando para `/cotacao`.

## O que muda

### 1. Novo arquivo `src/pages/QuickQuote.tsx`

Página standalone com:

- **Header** com logo (clica e volta para `/`) e botão "Falar com consultor" (WhatsApp).
- **Hero** com título "Veja o preço agora. Sem precisar da placa." + badge "Cotação em 30 segundos".
- **Formulário de simulação:**
  - Tipo de veículo: 3 botões com ícones (Car / Bike / Truck).
  - UF: `<select>` com 27 estados.
  - Faixa FIPE: 5 botões empilhados (`0-25`, `25-50`, `50-80`, `80-120`, `120+`).
  - Botão "Ver meus preços agora" — habilitado quando UF + faixa FIPE selecionados.
  - Trust badges: "Sem análise de perfil" / "100% da FIPE".
- **Seção de planos** (só aparece após simular, com scroll suave):
  - Card **COMPLETO** com preço mensal, 4 coberturas + "Ver todas", preço anual com 10% off, botão "Contratar Completo".
  - Card **PREMIUM** com badge "MAIS COMPLETO", mesma estrutura.
  - CTA WhatsApp "Ficou com dúvidas?".
  - Disclaimer sobre valores estimados.
  - Link "Prefiro informar a placa agora" → `/cotacao`.
- **Footer mínimo** quando ainda não simulou: link "Consultar pela placa diretamente" → `/cotacao`.

### Lógica de cálculo (client-side, sem chamada ao CRM)

Tabela base por faixa FIPE × multiplicador por tipo de veículo:

```text
PRICE_TABLE (mensal):
  0-25   → completo R$ 89.90  / premium R$ 119.90
  25-50  → completo R$ 139.90 / premium R$ 189.90
  50-80  → completo R$ 189.90 / premium R$ 259.90
  80-120 → completo R$ 249.90 / premium R$ 339.90
  120+   → completo R$ 329.90 / premium R$ 449.90

TYPE_MULT: carro 1.0  /  moto 0.78  /  caminhão 1.32
Anual = mensal × 12 × 0.9 (10% desconto)
```

### Ao clicar "Contratar COMPLETO/PREMIUM"

- Salva `vehicleType` no `QuoteContext` via `updateVehicle({ type })`.
- Navega para `/cotacao` passando `state: { quickPlan, quickUf, quickFipeRange }`.
- (O `Quote.tsx` atual ignora esse `state` — ele continuará funcionando normalmente. Pré-preenchimento opcional pode ser adicionado depois sem afetar este plano.)

### 2. `src/App.tsx`

Adicionar:
```tsx
import QuickQuote from "./pages/QuickQuote";
// ...
<Route path="/simulacao" element={<QuickQuote />} />
```

### 3. `src/pages/Landing.tsx`

Trocar o CTA principal:
- Antes: `navigate("/cotacao")` com texto "Cotação em menos de 30 segundos".
- Depois: `navigate("/simulacao")` com texto "Ver preço sem informar a placa".
- Adicionar link secundário discreto abaixo do botão: "Já tenho a placa em mãos" → `/cotacao`.

## O que NÃO muda

- `Quote.tsx`, `Result.tsx`, `Payment.tsx`, edge functions, schema do banco — nenhum impacto.
- `QuoteContext` — usado apenas para `updateVehicle({ type })`, sem novos campos.
- Fluxo completo via placa continua intacto (`/cotacao`).

## Resultado esperado

- Usuário entra no site → vê CTA "Ver preço sem informar a placa" → escolhe tipo + UF + faixa FIPE → vê dois cards de preço → clica "Contratar" e cai no fluxo `/cotacao` normalmente.
- Quem prefere começar pela placa usa o link secundário.

## Arquivos modificados

- **Novo:** `src/pages/QuickQuote.tsx`
- `src/App.tsx` — registrar rota `/simulacao`
- `src/pages/Landing.tsx` — novo CTA + link secundário
