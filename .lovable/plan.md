

# Upgrade Visual com Efeito Liquid Glass

## Objetivo
Aplicar o efeito "liquid glass" (glassmorphism com refracao) da biblioteca `liquid-glass-react` em pontos estrategicos do app para criar uma estetica moderna e premium, mantendo a identidade visual verde (#0D5C3E) e amarelo (#F2B705) da Save Car.

## Abordagem

Em vez de aplicar o efeito em todos os elementos (o que seria pesado e poluido), vamos usa-lo de forma seletiva nos pontos de maior impacto visual:

### 1. Landing Page - Hero com fundo gradiente e glass CTA
- Adicionar um fundo gradiente suave verde-para-amarelo na secao hero
- Aplicar o `LiquidGlass` no botao CTA principal ("Cotacao em menos de 30 segundos")
- Aplicar glass nos cards de link (Duvidas, WhatsApp)
- O `overLight={true}` sera usado pois o fundo e claro

### 2. Result Page - Card FIPE com glass
- Card do valor FIPE envolvido em LiquidGlass com cornerRadius adequado
- Fundo gradiente sutil atras do card

### 3. PlanDetails - Seletor de planos com glass
- Os dois botoes de selecao (COMPLETO/PREMIUM) envolvidos em LiquidGlass
- Card de resumo financeiro com efeito glass
- Botao "Contratar" com glass

### 4. Inspection Page - Status card com glass
- Card de status da vistoria com efeito glass
- Card do aviso WhatsApp com glass sutil

### 5. Fundo global com gradiente
- Adicionar classe CSS reutilizavel `bg-savecar-gradient` com gradiente suave usando as cores da marca
- Aplicar nas paginas principais como background

## Arquivos a alterar

| Arquivo | Mudanca |
|---|---|
| `package.json` | Adicionar dependencia `liquid-glass-react` |
| `src/index.css` | Adicionar classe utilitaria `bg-savecar-gradient` |
| `src/pages/Landing.tsx` | Glass no CTA e cards de link, fundo gradiente |
| `src/pages/Result.tsx` | Glass no card FIPE |
| `src/pages/PlanDetails.tsx` | Glass nos seletores de plano e resumo |
| `src/pages/Inspection.tsx` | Glass no card de status |
| `src/pages/Payment.tsx` | Glass no resumo e metodo de pagamento |
| `src/pages/Confirmation.tsx` | Glass no card de resumo |

## Detalhes tecnicos

### Instalacao
```
npm install liquid-glass-react
```

### Configuracao padrao para cards (fundo claro)
```tsx
<LiquidGlass
  displacementScale={40}
  blurAmount={0.08}
  saturation={140}
  aberrationIntensity={1}
  elasticity={0.2}
  cornerRadius={16}
  overLight={true}
>
  <div className="p-6">...</div>
</LiquidGlass>
```

### Configuracao para botoes
```tsx
<LiquidGlass
  displacementScale={64}
  blurAmount={0.1}
  saturation={130}
  aberrationIntensity={2}
  elasticity={0.35}
  cornerRadius={100}
  padding="8px 16px"
  overLight={true}
  onClick={handleClick}
>
  <span className="text-white font-medium">Texto</span>
</LiquidGlass>
```

### Gradiente de fundo (CSS)
```css
.bg-savecar-gradient {
  background: linear-gradient(
    135deg,
    hsl(153, 75%, 95%) 0%,
    hsl(43, 90%, 95%) 50%,
    hsl(153, 75%, 92%) 100%
  );
}
```

Tons muito claros do verde e amarelo da marca para servir de fundo sem competir com o conteudo, mas dando "vida" ao background para o efeito glass funcionar bem (o glass precisa de variacao de cor atras para ser visivel).

### Consideracoes de performance
- O LiquidGlass usa canvas, entao sera aplicado apenas em 2-3 elementos por pagina
- Nos formularios (Quote.tsx) nao sera aplicado para nao interferir com inputs
- Em mobile, valores de `displacementScale` menores serao usados para manter performance

