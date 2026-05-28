## Ajustes na Landing

Apenas na rota `/` (Landing):

1. **Remover GradualBlur e ScrollHint na Landing** — adicionar prop `disableGlobalOverlays` ou simplesmente esconder via detecção de rota nos componentes `GradualBlur` e `ScrollHint` (`useLocation().pathname === '/'` → não renderiza). Como esses estão montados em `App.tsx` fora do Router, alternativa mais limpa: mover ambos para dentro do `<BrowserRouter>` e adicionar early-return baseado em `useLocation`.

2. **Remover botão "Dúvidas sobre a cotação?"** em `src/pages/Landing.tsx` — apagar o primeiro `<motion.a>` da seção "Links Section", mantendo apenas o "Atendimento pelo WhatsApp".

### Arquivos
- `src/App.tsx` — mover `<GradualBlur>` e `<ScrollHint>` para dentro do `<BrowserRouter>`.
- `src/components/GradualBlur.jsx` — adicionar `useLocation` e retornar `null` quando pathname === '/'.
- `src/components/ScrollHint.tsx` — mesma lógica.
- `src/pages/Landing.tsx` — remover o link "Dúvidas sobre a cotação?".