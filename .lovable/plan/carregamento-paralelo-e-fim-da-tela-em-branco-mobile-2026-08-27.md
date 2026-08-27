# Carregamento paralelo e fim da tela em branco (mobile)

A API pública do PageSpeed voltou a responder "quota diária excedida", então não consegui puxar as notas do relatório novo. Em vez disso, auditei o build atual (`dist/`) — e os arquivos gerados mostram claramente por que ainda existe tela em branco no mobile.

## O que encontrei no build atual

- O `index.html` publicado não tem nenhum conteúdo visível: só `<div id="root">`. Enquanto o JS não baixa, executa e renderiza, o mobile fica com tela branca. Nada é carregado em paralelo com a renderização porque não há nada para renderizar.
- A imagem do hero (`hero-estrada-1600.webp`, 228 KB / `800.webp`, 77 KB) só é descoberta depois que o React monta. O navegador perde os primeiros segundos sem nem começar o download do LCP.
- O HTML faz `modulepreload` de `charts` (recharts) e `motion` em **todas** as páginas, inclusive a home, que não usa gráfico. Isso rouba banda do que realmente importa no mobile.
- Os ícones (`lucide-react`), o React Router e o React Query entram todos no mesmo `index-*.js`, o maior arquivo do bundle.

## O que proponho fazer

1. **Tela pintada imediatamente**: colocar no `index.html` um esqueleto estático dentro de `#root` (fundo verde da marca + logo + espaço do hero), com CSS inline crítico. O usuário vê a marca no primeiro frame, e o esqueleto é substituído quando o React monta — sem flash branco.
2. **Hero em paralelo com o JS**: adicionar `<link rel="preload" as="image">` com `imagesrcset`/`imagesizes` para as versões 800/1600, `fetchpriority="high"`. A imagem passa a baixar junto com o JS, não depois.
3. **Parar de pré-carregar o que a home não usa**: remover o `modulepreload` de `charts` (e do `motion` quando não for necessário no primeiro paint), isolando recharts para carregar só na rota /admin.
4. **Dividir o bundle inicial**: chunks separados para `react-vendor` (react, react-dom, router) e `query`, para que baixem em paralelo em vez de um arquivo único grande.
5. **Prefetch da próxima rota**: quando a home ficar ociosa, pré-buscar o chunk de `/cotacao` — o clique no CTA principal abre instantâneo.
6. **Fallback de rota sem tela branca**: trocar o `Suspense fallback` atual (div vazia) por um esqueleto com a identidade da marca.
7. Depois de publicar, rodar o PageSpeed novamente para comparar os números.

## Detalhes técnicos

- Arquivos afetados: `index.html` (skeleton + preload do hero), `vite.config.ts` (`manualChunks` por vendor), `src/App.tsx` (fallback de Suspense + prefetch idle), `src/pages/Landing.tsx` (remoção do skeleton ao montar).
- O esqueleto é removido por CSS assim que `#root` recebe conteúdo (sem JS extra bloqueante).
- Ganho esperado: primeiro pixel útil em ~0,3 s (hoje só depois do JS), LCP mobile puxado para a faixa de 1,5–2,5 s e menos bytes críticos na home.
