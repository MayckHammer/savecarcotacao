# Integração do Google Tag Manager na página de cotação

## Objetivo
Adicionar o container do Google Tag Manager (GTM) exibido no print (`GTM-MW77WPBJ`) à página de cotação (`/cotacao`), mantendo a integridade do tracking já existente.

## Contexto atual
- O app já carrega o GA4 via `gtag.js` em `src/lib/analytics.ts` (medidor `VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY`).
- A rota `/cotacao` é renderizada por `src/pages/QuoteExpress.tsx`.
- A rota `/cotacao-detalhada` é renderizada por `src/pages/Quote.tsx`.
- O projeto usa `react-helmet-async` para injeção de tags no `<head>`/`<body>`.

## Decisões a confirmar
1. **Escopo**: aplicar GTM apenas em `/cotacao` ou também em `/cotacao-detalhada`?
2. **GA4 existente**: manter o `gtag.js` atual ou substituir pelo GA4 via GTM? (Manter os dois sem ajuste pode gerar duplicidade de eventos.)
3. **Container ID**: usar `GTM-MW77WPBJ` conforme imagem.

## Implementação proposta
1. **Criar utilitário GTM** em `src/lib/gtm.ts`:
   - Exportar `initGTM(containerId: string)` para injetar o script no `<head>`.
   - Exportar `GTMBodyNoScript` para renderizar o `<noscript><iframe ...></iframe>` o mais alto possível no body da página.

2. **Adicionar GTM à página de cotação** (`src/pages/QuoteExpress.tsx`):
   - Usar `Helmet` para inserir o script GTM no `<head>`.
   - Renderizar o `GTMBodyNoScript` logo após a `<div>` raiz, antes do conteúdo visível.

3. **Preservar ou desativar GA4 nativo**:
   - Se o GTM já contiver a tag GA4, desativar o `initAnalytics()` para evitar duplo pageview.
   - Se o GTM for complementar, manter o GA4 atual e documentar a diferença.

4. **Testes**:
   - Verificar no console/preview que `dataLayer` é inicializado.
   - Confirmar que o iframe `ns.html` aparece no DOM da página `/cotacao`.
   - Validar build com `tsgo`.

## Não inclui
- Alterações em outras páginas (salvo aprovado).
- Configuração de tags, triggers ou variáveis dentro do container GTM (feito no painel do GTM).
