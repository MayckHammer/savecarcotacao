

# Integrar API Fipe Online para Consulta de Valores FIPE

## Situacao atual

A edge function `consulta-placa` gera dados simulados. A API do fipe.online (parallelum.com.br) nao possui endpoint de consulta por placa -- ela funciona por navegacao em cascata: marca, modelo, ano e preco.

## O que sera feito

Integrar a API fipe.online no passo 2 da cotacao para que o usuario selecione marca, modelo e ano do veiculo e obtenha o valor FIPE real. O campo de placa sera mantido como dado informativo.

## Fluxo do usuario

```text
1. Digita a placa (dado informativo, sem consulta automatica)
2. Seleciona a marca (lista carregada da API fipe.online)
3. Seleciona o modelo (carregado com base na marca)
4. Seleciona o ano (carregado com base no modelo)
5. Valor FIPE e exibido automaticamente
```

## Detalhes tecnicos

### 1. Armazenar a chave da API como secret
- Nome: `FIPE_ONLINE_TOKEN`
- Valor: a chave JWT que voce forneceu
- Armazenada de forma segura no backend, nunca exposta no codigo

### 2. Atualizar a Edge Function `consulta-placa`
- Remover toda a logica de dados simulados (funcao `generateVehicleData`)
- Criar novos endpoints/acoes dentro da mesma function:
  - `action: "brands"` -- retorna marcas via `GET https://fipe.parallelum.com.br/api/v2/cars/brands` com header `X-Subscription-Token`
  - `action: "models"` -- retorna modelos via `GET https://fipe.parallelum.com.br/api/v2/cars/brands/{brandCode}/models`
  - `action: "years"` -- retorna anos via `GET https://fipe.parallelum.com.br/api/v2/cars/brands/{brandCode}/models/{modelCode}/years`
  - `action: "price"` -- retorna preco FIPE via `GET https://fipe.parallelum.com.br/api/v2/cars/brands/{brandCode}/models/{modelCode}/years/{yearCode}`
- Todas as chamadas incluem o header `X-Subscription-Token` com o token armazenado
- Timeout de 10 segundos por chamada

### 3. Atualizar `QuoteContext.tsx`
- Adicionar campos para armazenar as selecoes intermediarias: `brandCode`, `modelCode`, `yearCode`
- Manter os campos existentes (`brand`, `model`, `year`, `fipeValue`, `fipeFormatted`)

### 4. Atualizar `Quote.tsx` (Passo 2)
- Manter campo de placa como input de texto simples (sem consulta automatica)
- Adicionar 3 selects em cascata:
  - **Marca**: carrega lista ao montar o componente
  - **Modelo**: carrega ao selecionar marca
  - **Ano**: carrega ao selecionar modelo
- Ao selecionar o ano, busca automaticamente o valor FIPE e exibe em um card
- Loading states para cada select durante o carregamento
- Manter selects de "Tipo do veiculo" e "Uso do veiculo" existentes

### 5. Atualizar `Result.tsx`
- Exibir o valor FIPE real retornado pela API (ja funciona com os campos existentes)

## Limite de uso
- Com a chave gratuita: ate 1.000 requisicoes por dia
- Cada cotacao completa usa aproximadamente 4 requisicoes (marcas + modelos + anos + preco)

