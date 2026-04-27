## Diagnóstico

Ainda não deu certo porque o CRM retornou dados parciais para a placa `TEV3H48`:

```text
brand: "SHINERAY XY150-8"
model: ""
year: "2025/2025"
codFipe: "850036-3"
fipeValue: 0
vehicleType: "MOTOCICLETA"
```

Ou seja: a placa foi encontrada, mas nosso extrator não pegou `codFipe` porque estava procurando `fipeCode`/`cdFp`/`code`, e o app exige `marca + modelo` para considerar o veículo identificado. Como o modelo veio vazio e o valor FIPE veio zero, o app caiu para preenchimento manual.

Também há um ponto importante: no retorno do CRM, a “marca” veio como `SHINERAY XY150-8`, que na prática é marca + modelo juntos. Então o app precisa separar/normalizar isso ou consultar a FIPE usando o `codFipe` retornado.

## Plano de correção

1. Ajustar a função `consulta-placa-crm`
   - Ler também os campos `codFipe`, `codeFipe` e `codigoFipe`.
   - Quando o CRM retornar `vehicleType: MOTOCICLETA`, confirmar automaticamente o tipo como moto.
   - Quando o CRM retornar `brand` contendo marca + modelo, tentar separar a marca real do modelo.

2. Enriquecer dados pela FIPE usando o código FIPE
   - Se o CRM retornar `codFipe`, chamar a API FIPE por código:
     - buscar anos disponíveis por código FIPE;
     - escolher o ano compatível com o ano da placa (`2025/2025`);
     - buscar detalhes do veículo para obter `brand`, `model`, `modelYear`, `price` e `codeFipe`.
   - Com isso, o app não dependerá do CRM devolver o modelo e valor FIPE completos.

3. Corrigir a regra do app após consultar placa
   - Considerar o veículo identificado quando houver `brand + model`, ou quando a função conseguir completar esses dados via FIPE.
   - Se vier apenas parcial, mostrar mensagem mais clara: “Placa encontrada, mas FIPE/modelo não retornou; complete manualmente”.
   - Guardar `fipeCode` no estado para ajudar futuras sincronizações.

4. Reforçar envio ao CRM
   - Enviar a placa como `plts` e `plates` já na criação do card, não só no update.
   - Continuar enviando o tipo do veículo, mas testar também campos alternativos se necessário (`vehicleType` numérico/string além de `vhclType`) sem quebrar o card.

5. Validar com a placa do teste
   - Testar a função `consulta-placa-crm` diretamente com:
     - placa `TEV3H48`
     - tipo `moto`
   - Confirmar que a resposta final passa a trazer marca, modelo, ano, código FIPE e valor FIPE preenchidos para o app.

## Arquivos a alterar

- `supabase/functions/consulta-placa-crm/index.ts`
- `src/contexts/QuoteContext.tsx`
- `src/pages/Quote.tsx`
- possivelmente `supabase/functions/submit-to-crm/index.ts` para reforçar o payload final ao CRM

## Resultado esperado

Ao consultar a placa de moto, o app deve preencher automaticamente os dados do veículo usando o retorno do CRM + enriquecimento FIPE, em vez de deixar marca/modelo/ano em branco. O card no CRM também deve receber placa e tipo reforçados no payload inicial e no update.