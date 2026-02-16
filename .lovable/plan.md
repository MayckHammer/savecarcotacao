

# Corrigir valor FIPE "R$ NaN" e adicionar suporte para motos e caminhoes

## Problema identificado

A API FIPE retorna o preco como string formatada em BRL (ex: `"R$ 28.152,00"`), mas o codigo tenta converter com `Number(data.price)`, que nao entende o formato brasileiro e retorna `NaN`.

## Correcoes e melhorias

### 1. Corrigir parsing do valor FIPE (`src/pages/Quote.tsx`)

Na funcao `handleYearChange`, linha 105-106, o valor `data.price` ja vem formatado como `"R$ 28.152,00"`. O codigo atual faz `Number(data.price)` que gera NaN.

Correcao:
- Usar `data.price` diretamente como `fipeFormatted` (ja vem formatado)
- Extrair o valor numerico removendo "R$", pontos de milhar e substituindo virgula por ponto para obter o numero real

### 2. Adicionar suporte para motos e caminhoes (`supabase/functions/consulta-placa/index.ts`)

A API FIPE Parallelum suporta 3 tipos de veiculos com endpoints diferentes:
- `/cars/` para carros
- `/motorcycles/` para motos
- `/trucks/` para caminhoes

Alteracoes:
- Receber um parametro `vehicleType` no body da requisicao (valores: `cars`, `motorcycles`, `trucks`)
- Usar esse parametro para construir a URL correta
- Valor padrao: `cars` para manter compatibilidade

### 3. Atualizar o frontend (`src/pages/Quote.tsx`)

- Mover o select "Tipo do veiculo" para ANTES dos selects de marca/modelo/ano
- Mapear os tipos para os endpoints da API:
  - `carro` -> `cars`
  - `moto` -> `motorcycles`
  - `caminhao` -> `trucks`
- Quando o tipo mudar, resetar marca/modelo/ano e recarregar marcas do tipo correto
- Passar o `vehicleType` em todas as chamadas FIPE

### 4. Atualizar opcoes de tipo de veiculo

Opcoes atualizadas:
- Carro
- Moto
- Caminhao / Pick-up

## Resumo das alteracoes

| Arquivo | Alteracao |
|---|---|
| `supabase/functions/consulta-placa/index.ts` | Adicionar parametro `vehicleType` para construir URL dinamica |
| `src/pages/Quote.tsx` | Corrigir parsing do preco, reordenar campos, passar tipo nas chamadas |

