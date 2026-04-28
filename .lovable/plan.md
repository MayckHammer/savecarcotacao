## Objetivo

Fazer com que toda a Landing caiba na viewport sem necessidade de scroll, mantendo o layout responsivo em diferentes tamanhos de tela (de 320px a desktop) e preservando todos os elementos atuais.

---

## Estratégia

Trocar `min-h-screen` por `h-[100dvh]` no container principal (usa altura dinâmica do viewport, ideal em mobile considerando barras do navegador) e reduzir paddings/margens verticais. A logo passa a usar tamanho fluido com `clamp()` para se adaptar à altura disponível.

---

## Alterações em `src/pages/Landing.tsx`

### Container raiz
- `min-h-screen` → `h-[100dvh]` (com `overflow-hidden` já presente, garante zero scroll)

### Hero (logo + título + botões)
- Padding vertical: `py-12` → `py-3`
- Adicionar `min-h-0` para permitir que a seção flexível encolha corretamente
- Logo: trocar altura fixa `h-56` por `style={{ height: "clamp(7rem, 22vh, 14rem)" }}` — fica grande em telas altas, encolhe em telas pequenas, sem nunca ficar minúscula
- Margens: `mb-6` → `mb-3` (logo), `mb-10` → `mb-5` (parágrafo), `mb-4` → `mb-2` (badge), `mb-3` → `mb-2` (h1), `mt-4` → `mt-3` (link cotação sem placa)
- Botão principal: `h-14` → `h-13`
- Parágrafo descritivo: `text-base` (default) → `text-sm`

### Seção de Links (Dúvidas / WhatsApp)
- `space-y-3` → `space-y-2`, `pb-8` → `pb-2`
- Cards: `p-4` → `px-4 py-2.5` (mais compactos)
- Adicionar `shrink-0` para não comprimir

### Footer (Instagram/Facebook + copyright)
- `pb-6` → `pb-3 pt-2`, adicionar `shrink-0`
- `mb-4` → `mb-1.5`
- Copyright: `text-xs` → `text-[11px]`

### Resultado esperado
- 390×844 (mobile padrão): tudo visível sem scroll, logo ~14rem
- 360×640 (mobile pequeno): logo encolhe via clamp, tudo continua visível
- Desktop: layout idêntico, apenas mais espaço sobrando no centro

---

## Validação

Após aplicar, abrir `/` no preview em 390×844 e tirar screenshot para confirmar que não há scroll e nenhum elemento foi cortado.

---

## Arquivos afetados

- `src/pages/Landing.tsx` — única alteração
