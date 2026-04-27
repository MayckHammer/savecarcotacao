## Diagnóstico

A mensagem **"Usando valores estimados"** aparece porque o app só mostra preços reais quando o CRM devolve planos em `/quotation/plansQuotation`. Hoje o card já recebe marca/modelo/ano em alguns casos, mas o CRM ainda não calcula planos quando o campo **Valor FIPE** fica vazio ou quando o modelo/ano interno não corresponde exatamente ao veículo.

Pelos prints, o botão de lupa da placa no CRM não é apenas visual: ele dispara a busca DENATRAN/FIPE interna e preenche campos que o simples `/quotation/update` não persiste totalmente, principalmente **Valor FIPE**. Como não dá para “clicar” no CRM pelo backend, precisamos reproduzir o efeito desse clique usando os endpoints do próprio CRM e, quando houver ambiguidade, deixar o usuário escolher o modelo correto no app.

## Plano de correção

### 1. Enriquecer a consulta de placa com opções de modelo

Na função `consulta-placa-crm`:

- Continuar criando o card no CRM e buscando a placa via `/quotation/plates/{plate}`.
- Usar o código FIPE retornado pela placa (`codFipe`, exemplo `011117-1`) para buscar marca/modelo/ano/valor oficial.
- Retornar também uma lista de modelos possíveis para o app quando houver ambiguidade, usando os modelos do CRM e/ou FIPE filtrados pelo nome bruto da placa.
- Para o caso do print (`CITROEN C3 AIRC TENDANCE`), priorizar termos distintivos como `AIRC`, `AIRCROSS`, `TENDANCE`, em vez de aceitar automaticamente o primeiro modelo parecido.

### 2. Mostrar seleção de modelo específico no app após consultar placa

Na tela `/cotacao`:

- Após consultar a placa, mostrar os dados encontrados normalmente.
- Se houver mais de um modelo possível ou se o match não for 100% seguro, exibir um campo **"Confirme o modelo do veículo"** na mesma tela.
- Ao selecionar o modelo:
  - atualizar `model`, `year`, `fipeValue`, `fipeFormatted`, `crmModelId`, `crmYearId` no contexto;
  - marcar a placa como validada somente depois da confirmação;
  - manter a experiência simples: placa puxa tudo, usuário só confirma quando necessário.

Fluxo esperado:

```text
Usuário digita placa
→ app consulta CRM
→ app mostra dados do veículo
→ se modelo estiver incerto, usuário escolhe modelo exato
→ app envia modelo/ano/FIPE corretos para o CRM
→ CRM calcula planos reais
```

### 3. Criar atualização explícita do veículo escolhido no CRM

Adicionar/ajustar uma função backend para atualizar o card assim que o usuário confirmar o modelo, enviando:

- `code` da cotação;
- `mdl` / `carModel`;
- `mdlYr` / `carModelYear`;
- `fabricationYear`;
- `protectedValue`;
- código FIPE (`cdFp`/`codFipe`, se aceito);
- cor, placa e tipo de veículo.

### 4. Reproduzir o “clique na lupa” via endpoint, não via automação visual

Em vez de tentar controlar o navegador do CRM, a função backend tentará chamar os endpoints que têm o mesmo papel da lupa:

1. `/quotation/plates/{plate}` para buscar os dados DENATRAN/FIPE.
2. `/quotation/quotationFipeApi?quotationCode=...` após a criação/atualização da cotação, para forçar/aguardar o processamento FIPE do card.
3. Depois reconsultar `/quotation/{code}` para confirmar se `protectedValue`/Valor FIPE e modelo/ano persistiram.

Se o CRM exigir o clique de UI para gravar especificamente o campo visual “Valor FIPE”, vamos contornar buscando planos diretamente pelo endpoint documentado `/api/plans/`, usando `carModelId`, `carModelYearId`, `cityId` e `quotationWorkVehicle`, em vez de depender exclusivamente de `/quotation/plansQuotation`.

### 5. Melhorar busca de planos reais

Na função `get-crm-plans`:

- Primeiro tentar `/quotation/plansQuotation` como hoje.
- Se vier “Nenhum plano disponível”, buscar a cotação, pegar `mdl`, `mdlYr`, `city` e `workVehicle`.
- Chamar `/api/plans/` com esses dados como fallback real do CRM.
- Só exibir “valores estimados” se os dois caminhos falharem.

### 6. Ajustar a mensagem no app

Na página de resultado:

- Se houver FIPE oficial mas o CRM ainda não devolveu plano, a mensagem será mais clara:
  - “FIPE oficial encontrada, aguardando cálculo do CRM” durante as tentativas;
  - “Usando valores estimados” somente se realmente não houver plano real após os fallbacks.

## Arquivos que serão alterados

- `supabase/functions/consulta-placa-crm/index.ts`
- `supabase/functions/get-crm-plans/index.ts`
- `supabase/functions/submit-to-crm/index.ts`
- `src/contexts/QuoteContext.tsx`
- `src/pages/Quote.tsx`
- `src/pages/Result.tsx`

## Resultado esperado

- O app deixa de depender de média estimada quando o CRM consegue calcular plano real.
- O usuário consegue confirmar o modelo exato quando a placa retorna algo ambíguo.
- O card do CRM recebe modelo/ano/FIPE com maior precisão.
- O cálculo dos planos passa a usar o modelo escolhido e o ano correto, reduzindo o caso de “Nenhum plano disponível”.
- O comportamento da lupa do CRM será reproduzido por chamadas de API e verificação posterior, sem depender de automação visual frágil.