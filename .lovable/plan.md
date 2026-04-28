## Objetivo

Adicionar as duas formas decorativas amarelas (logo "S" estilizado) como elementos de background na tela inicial (`/`), conforme o primeiro print enviado:
- **Borda superior direita** (`borda_superior.png`) — forma arredondada amarela no canto superior direito.
- **Borda maior** (`borda_maior.png`) — forma "U" amarela atravessando a parte central/inferior esquerda da tela.

Ambas ficam **atrás do conteúdo**, sem interferir nos cliques nem na legibilidade.

---

## Passos

### 1. Copiar as imagens para o projeto
Copiar os dois uploads para `src/assets/`:
- `user-uploads://borda_superior.png` → `src/assets/borda-superior.png`
- `user-uploads://borda_maior.png` → `src/assets/borda-maior.png`

### 2. Editar `src/pages/Landing.tsx`
- Importar as duas imagens como módulos ES6.
- Dentro do bloco decorativo de background (`pointer-events-none absolute inset-0 -z-10`), **substituir os blobs circulares atuais** (blur verde/amarelo) pelas duas imagens posicionadas:
  - `borda-superior.png`: posicionada no canto **superior direito** (`top-0 right-0`), largura ~55-60% da tela mobile, sem rotação.
  - `borda-maior.png`: posicionada **atravessando o meio-inferior esquerdo** (`top-1/2 -left-10`), largura ~90% da tela, leve animação de entrada (fade + slide).
- Manter `pointer-events-none` e `select-none` para não capturar cliques.
- Adicionar `aria-hidden="true"` (decorativas).
- Garantir que o conteúdo principal (logo, título, botão, links) tenha `relative z-10` quando necessário, ou que os cards de links mantenham o fundo `bg-card/80 backdrop-blur` para legibilidade sobre as formas amarelas.

### 3. Validação visual
Comparar com o print de referência (`save_site.png`) abrindo `/` no preview e tirando screenshot mobile (390x844) para confirmar:
- Borda superior visível no canto superior direito
- Borda maior atravessando atrás do botão "Fazer Cotação" e cards
- Logo, textos e botões permanecem legíveis e clicáveis

---

## Arquivos afetados

- `src/assets/borda-superior.png` (novo)
- `src/assets/borda-maior.png` (novo)
- `src/pages/Landing.tsx` (substituir blobs decorativos pelas duas imagens posicionadas)
