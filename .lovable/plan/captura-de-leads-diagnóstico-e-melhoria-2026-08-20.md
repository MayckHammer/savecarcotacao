# Captura de leads: diagnóstico e melhoria

## O que eu verifiquei no banco

- A tabela de leads tem **1 registro** (Maria Stella, 17/08/2026 21:21).
- No log de auditoria, desde 10/07 houve **7 cotações enviadas ao CRM** (14/08, 17/08 e 18/08 as mais recentes). A captura de leads só passou a existir a partir de 17/08, e o único lead gravado é exatamente da mesma sessão da cotação de 18/08.
- Ou seja: **a captura está funcionando**, não há erro de gravação. O problema é de **cobertura** — ela dispara em poucas situações e o volume real de visitantes que preenchem telefone é maior do que o que chega ao banco.

## Por que quase nada é capturado hoje

1. Só existe captura no formulário rápido (`/cotacao`). As páginas `/cotacao-detalhada` e `/simulacao` não gravam nada.
2. A gravação exige **duas condições ao mesmo tempo**: telefone com 10+ dígitos **e** o checkbox da LGPD marcado. Quem digita o telefone e não marca o consentimento não é salvo.
3. O disparo acontece apenas no `onBlur` do campo de telefone (ou ao marcar o checkbox). Se a pessoa digita o telefone e sai da página sem tirar o foco do campo, nada é enviado.
4. Nada é regravado depois: se a pessoa completa nome, e-mail, veículo e cidade após o primeiro disparo, esses dados não atualizam o lead.

## O que vou implementar

**Captura mais agressiva no formulário rápido (`/cotacao`)**
- Disparar também com debounce (~1,5s) assim que o telefone atingir 10 dígitos, sem depender do blur.
- Reenviar (atualizar o mesmo lead pela sessão) quando nome, e-mail, marca/modelo/ano ou cidade mudarem, para o lead chegar mais completo ao time comercial.
- Enviar uma última atualização quando a pessoa sai da página (`visibilitychange`/`pagehide`).

**Consentimento LGPD**
- Manter o checkbox obrigatório para enviar a cotação.
- Passa a existir também o registro de leads **sem consentimento**, marcado com `lgpd_consent = false`, para não perder o contato. Confirme abaixo se quer isso — hoje o backend recusa esses casos.

**Mesma captura nas outras entradas**
- Aplicar a mesma lógica em `/cotacao-detalhada` e `/simulacao`, com o slug do atendente.

**Visibilidade no admin**
- Na aba Leads, mostrar veículo/cidade, o atendente e um selo indicando se houve consentimento LGPD, além de contadores (total, convertidos, últimos 7 dias).

## Detalhes técnicos

- `src/components/CrmQuoteForm.tsx`: hook de captura com debounce + efeito de atualização em mudanças relevantes + listener de `pagehide`.
- Extrair a lógica para `src/hooks/useLeadCapture.ts` e reusar em `Quote.tsx` e `QuickQuote.tsx`.
- `supabase/functions/capture-lead/index.ts`: aceitar `lgpdConsent: false` gravando o campo como falso (em vez de retornar 400), mantendo o resto da validação; upsert por `session_id` continua igual.
- `src/pages/Admin.tsx`: colunas e contadores extras na aba Leads.
