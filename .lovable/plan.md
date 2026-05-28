## Adicionar GradualBlur global

### Arquivos
1. **`src/components/GradualBlur.jsx`** — código completo do componente (do React Bits).
2. **`src/components/GradualBlur.css`** — CSS do componente.
3. **`src/App.tsx`** — renderizar `<GradualBlur target="page" position="top" height="5rem" strength="2" divCount={5} curve="bezier" />` e outro idêntico com `position="bottom"` dentro do `TooltipProvider`, fora do `<BrowserRouter>`, para aparecer fixo em todas as rotas.

### Notas técnicas
- `mathjs` listado na fonte como dependência, mas o código real não o usa — **não vou instalar** (evita peso desnecessário).
- O componente usa `target="page"` → `position: fixed`, z-index 1100, `pointer-events: none`, então não interfere com cliques.
- Mantém UX do app intacta: overlay puramente visual no topo e rodapé.

### Resultado
Efeito de blur gradual sutil no topo e rodapé de todas as páginas (`/`, `/planos`, `/cotacao`, etc.) ao rolar conteúdo por trás.