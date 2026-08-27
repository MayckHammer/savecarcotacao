# Análise de desempenho — savecarcotacao.com (mobile)

A API pública do PageSpeed atingiu o limite diário de consultas agora, então não consegui puxar as notas do relatório em tempo real. Em vez disso, auditei o código e os arquivos que a página carrega — e apareceu um problema muito grave que explica sozinho boa parte de uma nota mobile baixa.

## O que está pesando

1. **Imagem do hero com 13,2 MB** (`hero-estrada-2.svg`). É a maior imagem da tela inicial (o elemento de LCP). No 4G simulado do PageSpeed isso significa vários segundos até a primeira imagem aparecer. Este é, de longe, o item nº 1.
2. **Sem divisão de código por rota.** Todas as páginas (admin, pagamento, vistoria, planos, gráficos do recharts) entram no mesmo pacote inicial, mesmo para quem só abre a home.
3. **Nenhum preload / prioridade definida** para a imagem principal do hero.
4. **GTM carregando cedo** no `<head>` para todos os visitantes, competindo com a renderização inicial.
5. **Sem `width`/`height` explícitos** em logo e selos, o que pode gerar deslocamento de layout (CLS) no mobile.

## O que proponho fazer

1. Substituir o hero por versões otimizadas em WebP/AVIF (largura ~1600 px desktop e ~800 px mobile), meta de peso abaixo de 200 KB — redução esperada de mais de 98%. Servir com `<picture>` + `srcset`.
2. Marcar o hero como imagem prioritária (`fetchpriority="high"`, `loading="eager"`) e as demais imagens abaixo da dobra como `loading="lazy"`.
3. Aplicar `React.lazy` + `Suspense` nas rotas que não são a home (admin, pagamento, vistoria, planos, confirmação, resultado), com `manualChunks` separando bibliotecas pesadas (recharts, framer-motion).
4. Adiar o carregamento do GTM para depois da interação/ocioso da página, mantendo o mesmo container `GTM-MW77WPBJ` e o `noscript` no body.
5. Definir `width`/`height` (ou `aspect-ratio`) na logo e nos selos ReclameAqui/SUSEP.
6. Após publicar, rodar novamente o PageSpeed para comparar os números.

## Detalhes técnicos

- Arquivos afetados: `src/pages/Landing.tsx`, `src/App.tsx`, `index.html`, `vite.config.ts`, novos assets otimizados em `src/assets/`.
- Otimização das imagens via `sharp`/`ffmpeg` no build local, com os arquivos gerados versionados no projeto.
- Ganho estimado: LCP mobile caindo de dezenas de segundos para a faixa de 2–3 s, e JS inicial reduzido em torno de 30–40%.
