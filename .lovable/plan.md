
# Adicionar Forma de Pagamento na Tela de Detalhes

## Resumo
Mover a selecao de forma de pagamento para a pagina de Detalhes (/detalhes), com duas opcoes: Cartao de Credito (com 10% de desconto) e PIX/Boleto (carne). Quando cartao for selecionado, exibir formulario de cadastro do cartao diretamente na pagina. O resumo financeiro sera atualizado dinamicamente conforme a opcao escolhida.

## Regras de negocio

| Forma de pagamento | Adesao | Mensalidades | Desconto |
|---|---|---|---|
| Cartao de credito | Cobrada no cartao | 11 parcelas no cartao | 10% de desconto no total |
| PIX / Boleto | Adesao via PIX | 11 boletos (carne) | Sem desconto |

## Alteracoes

### 1. QuoteContext (`src/contexts/QuoteContext.tsx`)
- Adicionar novo campo `paymentMethod: "credit" | "pix"` ao `QuoteData`
- Adicionar funcao `setPaymentMethod` ao contexto
- Atualizar `getTotal()` para aplicar 10% de desconto quando `paymentMethod === "credit"`

### 2. PlanDetails (`src/pages/PlanDetails.tsx`)
Adicionar as seguintes secoes entre o toggle Mensal/Anual e o resumo financeiro:

**a) Secao "Forma de pagamento"**
- Titulo "Forma de pagamento"
- Dois botoes lado a lado (igual ao seletor de plano):
  - "Cartao de Credito" com icone CreditCard — mostra badge "10% OFF"
  - "PIX / Boleto" com icone QrCode — mostra subtexto "Carne 11x"

**b) Formulario de cartao (condicional)**
- Quando "Cartao de Credito" selecionado, exibir campos:
  - Numero do cartao (com mascara)
  - Validade e CVV (lado a lado)
  - Nome do titular
- Reutilizar as mascaras ja existentes em `src/lib/masks.ts`

**c) Descricao PIX/Boleto (condicional)**
- Quando "PIX / Boleto" selecionado, exibir texto informativo:
  - "Adesao paga via PIX"
  - "11 boletos mensais enviados por e-mail"

**d) Resumo financeiro atualizado**
- Mostrar desconto de 10% na linha do plano quando cartao selecionado
- Exibir valor original riscado + valor com desconto
- Linha extra: "Desconto cartao (10%)" com valor negativo em verde
- Detalhamento: "Adesao R$ X + 11x de R$ Y"

### 3. Payment Page (`src/pages/Payment.tsx`)
- Simplificar: remover seletor de metodo de pagamento (ja foi escolhido em /detalhes)
- Usar `quote.paymentMethod` do contexto para mostrar o formulario correto
- Se cartao: mostrar dados ja preenchidos (somente leitura) ou permitir edicao
- Se PIX: mostrar QR Code e chave como esta hoje

## Detalhes tecnicos

### QuoteContext - novo campo e desconto
```typescript
// Novo campo
paymentMethod: "credit" | "pix";

// getTotal atualizado
const getTotal = () => {
  const base = quote.billingPeriod === "monthly" ? quote.monthlyPrice : quote.annualPrice;
  const planMultiplier = quote.planName === "PREMIUM" ? 1.35 : 1;
  const subtotal = base * planMultiplier;
  const discount = quote.paymentMethod === "credit" ? 0.9 : 1;
  return subtotal * discount;
};
```

### PlanDetails - seletor de pagamento
Dois botoes com estilo identico ao seletor de plano (COMPLETO/PREMIUM), com destaque visual para o desconto no cartao usando um badge verde "10% OFF".

### PlanDetails - resumo financeiro com desconto
Quando cartao selecionado:
```
Plano COMPLETO — Mensal          R$ 189,90 (riscado)
Desconto cartão (10%)           -R$ 18,99
Subtotal mensalidade             R$ 170,91
Taxa de ativação                 R$ 299,90
---
Total (Adesão + 11x R$ 170,91)  R$ 2.179,91
```

Quando PIX/Boleto:
```
Plano COMPLETO — Mensal          R$ 189,90
Taxa de ativação (PIX)           R$ 299,90
---
Total (Adesão + 11 boletos)      R$ 2.388,80
```

### Campos do cartao armazenados no contexto
Adicionar campos `cardNumber`, `cardExpiry`, `cardCvv`, `cardName` ao QuoteData para que os dados preenchidos em /detalhes sejam preservados ao navegar para /pagamento.
