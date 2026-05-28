## Ajustes de UX: blur, scroll hint e WhatsApp

### Mudanças

1. **`src/App.tsx`** — remover o `<GradualBlur>` do topo. Manter apenas o do rodapé.

2. **`src/components/GradualBlur.tsx`** (converter para TS e adicionar lógica) — o blur do rodapé deve sumir suavemente quando o usuário chega ao final da página. Adicionar listener de scroll que calcula `(scrollY + innerHeight) >= scrollHeight - 8` e aplica `opacity: 0` com transição.

3. **`src/components/WhatsAppButton.tsx`** — aumentar `z-index` para `z-[1200]` (acima do blur que usa zIndex 1100) para o ícone se sobrepor ao efeito.

4. **Novo `src/components/ScrollHint.tsx`** — botão flutuante fixo, centralizado horizontalmente, posicionado acima do rodapé (`bottom-24`), com z-index acima do blur:
   - Detecta se a página é rolável (`scrollHeight > innerHeight`).
   - Se sim e ainda **não chegou ao final**: mostra setas duplas amarelas/verdes apontando para baixo (estilo do print — usar ícones `ChevronsDown` do lucide com `text-secondary` e `text-primary` empilhados ou um SVG inline com duas chevrons coloridas). Clique = scroll suave para o próximo viewport (`window.scrollBy({ top: innerHeight * 0.8, behavior: 'smooth' })`).
   - Se chegou ao final: transforma em **botão circular "voltar ao topo"** (ícone `ArrowUp`, fundo `bg-primary`, sombra). Clique = `window.scrollTo({ top: 0, behavior: 'smooth' })`.
   - Transição suave entre os dois estados (fade + scale).
   - Se a página não é rolável: não renderiza nada.

5. **`src/App.tsx`** — montar `<ScrollHint />` globalmente, fora do `<Routes>`.

### Notas técnicas
- ScrollHint usa `useEffect` com `scroll` + `resize` listener com `passive: true`.
- Posicionamento: `fixed left-1/2 -translate-x-1/2 bottom-24 z-[1200]` para não conflitar com o WhatsApp (canto direito).
- Cores via tokens (primary/secondary) — sem hex inline.