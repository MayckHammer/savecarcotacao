## Objetivo
Reduzir os espaços verticais da Landing (`/`) para que todo o conteúdo (logo, badge, título, descrição, CTA, links de dúvida/WhatsApp, redes sociais e copyright) caiba na tela mobile (390x844) sem necessidade de scroll.

## Diagnóstico
No `src/pages/Landing.tsx` os principais consumidores de altura hoje são:
- Logo com `h-56` (224px) — muito alto pra mobile.
- Hero com `py-12` (96px de padding vertical).
- Título `mb-3`, descrição `mb-10` (40px), CTA dentro de `max-w-xs`.
- Seção de links com `pb-8` + `space-y-3` e cards com `p-4`.
- Footer com `pb-6` + `mb-4` nos ícones (que agora são `h-12 w-12`).

## Alterações em `src/pages/Landing.tsx`

1. **Hero (container)**
   - `py-12` → `py-6` (e `justify-center` mantido).

2. **Logo**
   - `h-56 mb-6` → `h-40 mb-3` (reduz ~96px de altura).

3. **Badge "Proteção 100% confiável"**
   - `mb-4` → `mb-3`.

4. **Título**
   - `mb-3` → `mb-2`.

5. **Descrição**
   - `mb-10` → `mb-5` (economiza ~20px).

6. **Botão CTA**
   - `h-14` → `h-12` (mantém presença mas economiza 8px).

7. **Seção de links (Dúvidas / WhatsApp)**
   - `pb-8 space-y-3` → `pb-4 space-y-2`.
   - Cards: `p-4` → `p-3` e `text-sm` mantido.

8. **Footer social**
   - `pb-6` → `pb-4`.
   - `gap-6 mb-4` → `gap-5 mb-3`.
   - Ícones permanecem `h-12 w-12` (cores nativas + pulse preservados).

9. **Copyright**
   - Mantém `text-xs`.

## Resultado esperado
No viewport 390x844, todo o conteúdo da Landing deve caber sem scroll, mantendo:
- Hierarquia visual (logo destacado, CTA principal evidente).
- Cores nativas e efeito pulsar dos ícones Instagram/LinkedIn.
- Animações Framer Motion existentes.

Nenhum outro arquivo precisa ser alterado.
