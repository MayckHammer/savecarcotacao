## Problema

Após a cotação, dois sintomas aparecem juntos:

1. **App mostra "Usando valores estimados — Nenhum plano disponível"** — apesar de o valor FIPE (R$ 38.412,00) ter sido encontrado.
2. **No card do CRM (terceiro print), o campo "Valor FIPE" fica em branco** — mesmo com Marca, Modelo e Ano preenchidos.
3. **Modelo no card aparece errado**: a placa real é um **Citroën Aircross**, mas o CRM mostra "AIRCROSS SALOMON TENDANCE 1.6" (parece certo no print, mas o modelo que enviamos foi `C3 Tendance 1.5 Flex 8V 5p Mec.` — id 646). Ou seja: ou o fuzzy match pegou o modelo errado da FIPE Parallelum, ou o CRM tem seu próprio "renderizador" que sobrescreve.

### Causa raiz

**(A) Valor FIPE em branco no card**: enviamos só `protectedValue` no `/quotation/update`. O campo do card chamado `vhclFipeVl` (visto no terceiro print) é alimentado por outras chaves — o CRM espera `vhclFipeVl`, `vlFipe` ou `fipeValue` explicitamente, e também o código FIPE em `cdFp`. Sem o valor FIPE preenchido, o motor de cálculo de planos não roda → "Nenhum plano disponível".

**(B) Modelo errado**: a placa PAI0F65 é "CITROEN C3 AIRC TENDANCE" (Aircross). O FIPE Parallelum, consultado pelo código `011117-1`, retornou `C3 Tendance 1.5 Flex` — porque esse código FIPE corresponde a essa variação. Nosso fuzzy match então casou com o modelo errado no CRM. Precisamos preferir, para fins de matching no CRM, o **nome bruto da placa** ("C3 AIRC TENDANCE") em vez do nome FIPE Parallelum quando eles divergem.

## Solução

### 1. `supabase/functions/consulta-placa-crm/index.ts`

**Preservar o nome original da placa para matching:**
- Salvar `vehicle.brandRaw` e `vehicle.modelRaw` capturados do endpoint `/plates` antes da enriquecimento FIPE.
- Em `resolveCrmIds`, tentar matching primeiro com o nome original da placa (que contém "AIRC"/"AIRCROSS"), e só usar o nome FIPE como fallback.
- No `pickBestMatch`, dar bônus extra (+200) quando o candidato contém uma palavra-chave distintiva do nome bruto (ex: "AIRCROSS", "AIRC").

**Enviar Valor FIPE com todos os aliases no early update (passo 8, linhas 521-550):**
```ts
if (vehicle.fipeValue) {
  updateBody.protectedValue = vehicle.fipeValue;
  updateBody.vhclFipeVl     = vehicle.fipeValue;  // campo do card
  updateBody.vlFipe         = vehicle.fipeValue;
  updateBody.fipeValue      = vehicle.fipeValue;
}
if (vehicle.fipeCode) {
  updateBody.cdFp           = vehicle.fipeCode;
  updateBody.codFipe        = vehicle.fipeCode;
}
```

**Adicionar verificação pós-update**: re-consultar `/quotation/{code}` e logar `vhclFipeVl`/`mdl`/`protectedValue` para diagnóstico.

### 2. `supabase/functions/submit-to-crm/index.ts`

Mesmo tratamento no `updatePayload` do bloco `skipCrm` (linhas 228-268): adicionar `vhclFipeVl`, `vlFipe`, `fipeValue` e `cdFp` ao lado do `protectedValue` já enviado.

### 3. `supabase/functions/get-crm-plans/index.ts`

No diagnóstico atual (linhas 60-83), além de checar `protectedValue`, checar também `vhclFipeVl`/`mdl`/`mdlYr` e logar o que falta — assim conseguimos identificar rapidamente em produção.

## Resultado esperado

- Card do CRM aparece com **Valor FIPE: R$ 38.412,00** preenchido.
- Modelo correto: **C3 Aircross** (não C3 Tendance).
- O motor de planos do CRM passa a calcular → o app deixa de mostrar "valores estimados" e exibe os planos reais COMPLETO/PREMIUM.

## Arquivos modificados
- `supabase/functions/consulta-placa-crm/index.ts`
- `supabase/functions/submit-to-crm/index.ts`
- `supabase/functions/get-crm-plans/index.ts`
