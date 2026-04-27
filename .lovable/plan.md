## Diagnóstico

Pelos logs do teste com a placa `TEV3H48`:

- O app enviou corretamente `vehicleType: "moto"`.
- A integração resolveu corretamente o tipo do CRM: `Moto -> id=2`.
- A cotação foi criada no CRM com `plts: "TEV3H48"` e `vhclType: 2`.
- O retorno do CRM ainda veio sem dados de veículo: `mdl`, `mdlYr`, `carModel`, `protectedValue` todos `null`.
- A chamada que tentamos usar como “lupa” (`GET /quotation/quotationFipeApi`) retornou `502`, então ela não está sendo o caminho correto para iniciar a busca pela placa nesse momento.

Também conferi a documentação local da API do CRM. O campo `vhclType` não aparece no Swagger como campo oficial de `quotation/add` ou `quotation/update`, apesar de existir no HTML do card. Isso indica que o problema pode sim ser divergência entre o campo visual do card e o contrato público da API. O caminho mais promissor encontrado na documentação é outro: `GET /api/quotation/plates/{plate}`, descrito como “Informação da placa do carro”.

## Plano de correção

### 1. Usar a consulta direta por placa do CRM antes de criar/atualizar a cotação
Alterar `consulta-placa-crm` para consultar:

```text
GET /api/quotation/plates/{plate}
```

Esse endpoint deve ser usado como primeira tentativa para obter os dados do veículo pela placa, em vez de depender do card do CRM preencher FIPE automaticamente.

### 2. Normalizar o retorno do CRM em um único formato para o app
Criar um extrator mais robusto que aceite possíveis formatos do CRM, por exemplo:

```text
body.brand / body.marca / body.model / body.modelo / body.carModel / body.mdl
body.year / body.ano / body.modelYear / body.mdlYr / body.carModelYear
body.fipeValue / body.valorFipe / body.protectedValue
body.color / body.cor
body.fipeCode / body.cdFp
```

Assim, mesmo que o endpoint retorne os dados dentro de `body`, `data`, array ou objeto direto, o app recebe sempre:

```text
{ brand, model, year, color, fipeCode, fipeValue, type }
```

### 3. Criar a cotação no CRM com os dados já conhecidos
Depois da consulta por placa, criar a cotação com:

- `plts`
- `workVehicle`
- dados pessoais
- dados do veículo quando existirem (`carModel`, `carModelYear`, `mdl`, `mdlYr`, `protectedValue`, `color`) somente se o retorno trouxer códigos/campos compatíveis.

O campo de tipo continuará sendo enviado como reforço, mas não será mais a única dependência para obter FIPE.

### 4. Corrigir a atualização da cotação existente
No fluxo do passo 3 (`submit-to-crm` com `skipCrm=true`), reforçar a placa com os dois campos aceitos pela API:

```text
plts
plates
```

Hoje a atualização usa principalmente `plates`, e vimos nos retornos que o CRM diferencia `plts` e `plates`. Isso pode explicar parte do comportamento de “a placa não voltou / não atualizou como esperado”.

### 5. Melhorar mensagens no app
No app, quando a API retornar `vehicle: null`, mostrar uma mensagem mais clara:

```text
Não foi possível buscar automaticamente os dados dessa placa no CRM. Você pode preencher manualmente.
```

E quando retornar dados parciais, preencher o que veio e manter o restante manual.

## Resultado esperado

Com essa alteração, o fluxo deixa de depender do preenchimento visual do card do CRM para retornar FIPE. A integração passa a:

```text
App envia placa + tipo
        ↓
Backend consulta placa diretamente no CRM
        ↓
Backend cria/atualiza card no CRM com placa, tipo e dados encontrados
        ↓
App recebe marca/modelo/ano/FIPE quando o CRM retornar esses dados
```

## Arquivos a alterar

- `supabase/functions/consulta-placa-crm/index.ts`
- `supabase/functions/submit-to-crm/index.ts`
- `src/pages/Quote.tsx`

Após implementar, vou redeployar as funções e você poderá fazer um novo teste real com a placa de moto.