## Objetivo
Atualizar o link do botão "Atendimento pelo WhatsApp" para o número **34998679585** (formato internacional: `5534998679585`).

## Alterações

Substituir todas as ocorrências do número placeholder `5500000000000` pelo número real `5534998679585`:

1. **`src/components/WhatsAppButton.tsx`** (linha 4) — botão flutuante presente em várias páginas (Inspection, Aguardando, Payment, PlanDetails).
2. **`src/pages/Landing.tsx`** (linha 136) — link "Atendimento pelo WhatsApp" na home.
3. **`src/pages/QuickQuote.tsx`** (linha 112) — CTA de WhatsApp na cotação rápida.

Assim, qualquer botão/link de WhatsApp do app passa a apontar para `https://wa.me/5534998679585`.
