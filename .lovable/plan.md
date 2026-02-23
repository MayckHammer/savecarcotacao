

# Corrigir campos da API REST do Power CRM

## Problema
A edge function `submit-to-crm` estava enviando campos com prefixo `pwr*` (do formulario publico antigo), mas a API REST oficial usa nomes completamente diferentes. Por isso o erro "O email ou telefone tem que ser preenchido" -- o campo `phone` nao estava sendo reconhecido.

## Mapeamento correto dos campos

Campos que vamos enviar (baseado na documentacao oficial):

| Campo API | Valor |
|-----------|-------|
| `name` (obrigatorio) | Nome do cliente |
| `phone` | Telefone (digitos) |
| `email` | Email |
| `registration` | CPF (digitos) |
| `plts` | Placa do veiculo |
| `city` | Codigo da cidade (int64, ja resolvido via utilities API) |
| `workVehicle` | true se uso = "aplicativo" |

Campos que NAO temos e serao omitidos: `chassi`, `mdl`, `mdlYr`, `coop`, `affiliateId`, `leadSource`, `originId`, `salesId`, `salesNwId`, `pwrlink`, `discount`.

Os detalhes completos (valor FIPE, coberturas, endereco, marca/modelo/ano) continuam sendo enviados no campo `observation` como texto formatado.

## Alteracao tecnica

Arquivo: `supabase/functions/submit-to-crm/index.ts`

Substituir o payload atual (campos `pwr*`) por:

```typescript
const crmPayload: Record<string, unknown> = {
  name: personal.name || "",
  phone: phone,               // digitos
  email: personal.email || "",
  registration: cpfDigits,     // CPF sem formatacao
  plts: vehicle.plate || "",
  workVehicle: vehicle.usage === "aplicativo",
};

if (cityCode) crmPayload.city = cityCode;
```

O campo `observation` nao aparece na documentacao visivel, mas sera mantido no payload caso a API o aceite (campos extras costumam ser ignorados). Se causar erro, sera removido.

Tambem remover o campo `stateCode` do payload (a API so aceita `city`, nao `state` separado).

## O que NAO muda
- Frontend
- Banco de dados
- Logica de resolucao de cidade via utilities API
- Texto de observacao (continua sendo gerado para registro local)

## Teste
Apos o deploy, refazer o fluxo completo de cotacao para confirmar que a API retorna sucesso e o card aparece no Power CRM.
