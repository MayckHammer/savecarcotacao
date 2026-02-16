

# Consulta de Placa com Tabela FIPE

## O que sera feito

Quando o usuario digitar a placa do veiculo no passo 2 da cotacao, o app vai automaticamente buscar as informacoes do veiculo (marca, modelo, ano) e o valor da tabela FIPE, exibindo os dados na tela.

## Como funciona

1. O usuario digita a placa no campo
2. Ao completar 7 caracteres, o app faz uma busca automatica
3. Exibe os dados do veiculo encontrado (marca, modelo, ano, valor FIPE)
4. Os dados sao salvos no contexto da cotacao para uso nas proximas etapas

## Detalhes tecnicos

### 1. Habilitar Lovable Cloud
- Necessario para criar uma edge function segura que faz a consulta da placa
- A chamada sera feita pelo servidor para evitar problemas de CORS e proteger a logica

### 2. Criar Edge Function `consulta-placa`
- Recebe a placa como parametro
- Consulta uma API publica/gratuita de placas brasileiras
- Retorna: marca, modelo, ano, cor, valor FIPE estimado
- Tratamento de erros (placa nao encontrada, API fora do ar)

### 3. Atualizar o contexto `QuoteContext.tsx`
- Adicionar campos ao `VehicleData`: `brand` (marca), `year` (ano), `color` (cor), `fipeValue` (valor FIPE)
- Adicionar funcao `updateVehicleFromPlate` para preencher todos os dados de uma vez

### 4. Atualizar a pagina `Quote.tsx` (Passo 2)
- Adicionar estado de loading durante a busca
- Ao digitar 7 caracteres na placa, dispara a busca automaticamente
- Exibir card com os dados do veiculo encontrado (marca, modelo, ano, cor, valor FIPE)
- Mostrar skeleton/loading enquanto busca
- Mostrar mensagem de erro caso a placa nao seja encontrada
- Pre-selecionar o tipo do veiculo automaticamente quando possivel

### 5. Atualizar a pagina `Result.tsx`
- Usar o valor FIPE real retornado pela API em vez do valor fixo atual

## Fluxo do usuario

```
Digita placa -> Loading... -> Exibe dados do veiculo + valor FIPE -> Continua preenchimento
```

## Observacao importante
- APIs gratuitas podem ter limitacoes de uso (quantidade de consultas por dia)
- Caso a API esteja indisponivel, o usuario podera preencher os dados manualmente

