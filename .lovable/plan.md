## Ajustes solicitados

### 1. Remover mensagem "Carregando seu plano personalizado..."
**Arquivo**: `src/pages/PlanDetails.tsx`
- Remover o bloco `{loadingPlans && (...)}` que mostra o loader com texto abaixo dos chips de cobertura.
- Manter o fetch dos planos do CRM em background (sem feedback visual), já que os preços continuam sendo usados no fluxo seguinte.
- Opcionalmente remover o state `loadingPlans` (não utilizado em outro lugar) para limpar o código.

### 2. Scroll para o topo ao navegar entre páginas
A página `/aguardando` (e outras) abre no meio porque o React Router não restaura o scroll automaticamente em SPAs.

**Solução**: Criar um componente global `ScrollToTop` que faz `window.scrollTo(0,0)` a cada mudança de rota.

- Criar `src/components/ScrollToTop.tsx`:
  ```tsx
  import { useEffect } from "react";
  import { useLocation } from "react-router-dom";

  const ScrollToTop = () => {
    const { pathname } = useLocation();
    useEffect(() => {
      window.scrollTo({ top: 0, left: 0 });
    }, [pathname]);
    return null;
  };
  export default ScrollToTop;
  ```

- Em `src/App.tsx`, importar e renderizar `<ScrollToTop />` dentro do `<BrowserRouter>`, antes das `<Routes>`.

Isso corrige o comportamento para todas as páginas do fluxo (Aguardando, Pagamento, Confirmação etc.), garantindo que sempre abram do topo.