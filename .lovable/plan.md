# Hero com imagem de estrada

## O que muda na seção hero (página inicial)

1. **Remover o logo** do topo do hero (o bloco branco circulado no print). O logo continua no cabeçalho das demais páginas e no rodapé.
2. **Adicionar uma imagem de fundo** no estilo da referência enviada: estrada sinuosa em meio a montanhas verdes, com luz de fim de tarde e um carro visto de cima.
   - A imagem enviada é uma foto de banco de imagens com marca d'água, então ela será usada apenas como referência visual e a arte final será gerada sem marca d'água.
   - A foto entra como fundo do hero, coberta por um degradê teal escuro para manter o contraste do texto branco e do amarelo dos botões.
   - Sem texto na imagem; todo o conteúdo (título, botões, estatísticas) continua igual e legível.

## Detalhes técnicos

- Gerar a imagem em `src/assets/hero-estrada.jpg` (formato panorâmico, ~1920x1024) e importá-la em `src/pages/Landing.tsx`.
- Substituir as bordas decorativas atuais (`borda-superior`, `borda-maior`) na seção hero pela imagem, mantendo `surface-dark` como cor base para o carregamento.
- Camadas: imagem (`object-cover`) → overlay em degradê teal (`from-teal-900/95` a `/70`) → conteúdo.
- Remover o bloco `motion.div` com `<img src={logo} .../>` do hero; manter o import do logo apenas para o rodapé.
- Nenhuma alteração em rotas, tracking ou demais seções.
