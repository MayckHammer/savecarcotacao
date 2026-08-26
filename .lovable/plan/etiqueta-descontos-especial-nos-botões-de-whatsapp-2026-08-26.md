# Etiqueta "Descontos Especial!" nos botões de WhatsApp

## Objetivo
Adicionar uma etiqueta vermelha com texto preto escrito **"Descontos Especial!"** em todos os botões/links de WhatsApp do site, posicionada como uma tag "presa" ao elemento.

## Escopo confirmado
Aplicar o badge em **todos** os botões de WhatsApp:
- Botão flutuante circular (`src/components/WhatsAppButton.tsx`)
- Botão do hero em `src/pages/Landing.tsx`
- Link "Falar no WhatsApp" no rodapé de `src/pages/Landing.tsx`
- Botão ícone do sticky mobile em `src/pages/Landing.tsx`
- Botão "Falar com consultor" no header de `src/pages/QuickQuote.tsx`
- Botão "WhatsApp" no card de dúvidas de `src/pages/QuickQuote.tsx`

## Implementação

### 1. Criar componente reutilizável
Criar `src/components/WhatsAppBadge.tsx`:
- Fundo vermelho (`bg-red-600` ou similar)
- Texto preto (`text-black`)
- Texto: `"Descontos Especial!"`
- Estilo de etiqueta: pequeno triângulo/seta apontando para o botão, leve rotação, sombra, fonte em negrito, texto em caixa alta ou mista conforme solicitado
- Variantes de tamanho para botões grandes, pequenos e flutuantes
- `pointer-events-none` para não interceptar cliques no botão

### 2. Integrar o badge
- `WhatsAppButton.tsx`: posicionar no canto superior direito do botão flutuante, fora do círculo.
- `Landing.tsx`: adicionar ao botão do hero (canto superior direito), ao link do rodapé (versão compacta) e ao botão sticky mobile.
- `QuickQuote.tsx`: adicionar ao botão do header e ao botão do card de dúvidas.

### 3. Ajustes finais
- Garantir que o badge não quebre o layout em mobile.
- Manter acessibilidade (o badge é decorativo; o clique continua no botão/link).
- Verificar z-index para que o badge fique acima do botão e de outros elementos.

## Validação
- Preview visual em desktop e mobile para confirmar que a etiqueta aparece em todos os botões de WhatsApp.
- Confirmar que os cliques nos botões continuam funcionando normalmente.
