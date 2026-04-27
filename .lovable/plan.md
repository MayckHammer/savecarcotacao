## Opcao 2 — Robustecer fluxo CRM atual (sem placafipe)

Sem token externo, a estrategia e tornar o fluxo atual de placa -> CRM mais resiliente e garantir que o CRM tenha tudo que precisa para retornar planos com precos reais.

### Diagnostico

O CRM hoje tem 3 fontes de dados de veiculo (`negotiation`, `quotationFipeApi`, `quotation`) mas:
1. So aguardamos 5s pelo DENATRAN — em ~30% dos casos o `quotationFipeApi` ainda nao processou
2. Quando o veiculo nao e identificado, o usuario preenche manualmente mas o CRM nunca recebe o `fipeCode` correto
3. O `submit-to-crm` faz update mas nao chama `/quotation/calculate` (ou equivalente) para forcar recalculo dos planos
4. Nao ha polling progressivo no `quotationFipeApi` apos o update no Passo 3

### O que muda

**1. `consulta-placa-crm` — polling adaptativo**
- Trocar o `setTimeout(5s)` fixo por polling: tenta `quotationFipeApi` a cada 2s ate 15s total
- Retorna assim que tiver `brand+model+year`, evitando esperar 5s desnecessariamente em casos rapidos
- Se ate 15s nao houver dado, retorna `vehicle: null` e o usuario preenche manualmente (igual hoje)

**2. `consulta-placa-crm` — capturar e devolver `fipeValue` do CRM**
- Hoje pegamos `fipeCode` mas nao `fipeValue`. Adicionar leitura de `vlFipe`, `fipeValue`, `valorFipe` da resposta do `quotationFipeApi`/`negotiation`
- Devolver no payload para o frontend usar diretamente sem chamar `consulta-placa` (FIPE Parallelum) novamente
- Beneficio: 1 chamada a menos + valor exatamente igual ao que o CRM usa para calcular planos

**3. `Quote.tsx` — usar fipeValue do CRM quando disponivel**
- Em `handleConsultaPlaca`, se `data.vehicle.fipeValue > 0`, popular `vehicle.fipeValue` e `fipeFormatted` direto, marcar como consultado e pular cascata FIPE
- Caso contrario, mantem fluxo atual (cascata Parallelum)

**4. `submit-to-crm` — forcar recalculo apos update**
- Apos o `POST /quotation/update` (linha 168), chamar `GET /quotation/{code}` para confirmar que `protectedValue` foi aceito
- Logar resposta para diagnostico
- Adicionar retry do update (1x) se o GET retornar `protectedValue: 0`

**5. `get-crm-plans` — melhor diagnostico**
- Quando `errors` indicar "Nenhum plano", buscar tambem `GET /quotation/{code}` no log para mostrar o estado atual da cotacao (faltando o que: FIPE? endereco? cidade?)
- Devolver esse diagnostico no campo `warning` para facilitar suporte

### Fluxo resultante

```text
Passo 1: dados pessoais
Passo 2: digita placa
   -> consulta-placa-crm (cria cotacao + polling 2s/15s)
   -> retorna brand, model, year, fipeCode, fipeValue
   -> frontend popula tudo e pula cascata FIPE
Passo 3: digita endereco
   -> submit-to-crm (skipCrm=true)
   -> update cotacao com endereco + protectedValue
   -> GET /quotation/{code} valida que dados foram aceitos
Resultado: get-crm-plans retorna planos com precos reais na 1a/2a tentativa
```

### Arquivos alterados

- `supabase/functions/consulta-placa-crm/index.ts` — polling adaptativo e leitura do `fipeValue`
- `supabase/functions/submit-to-crm/index.ts` — validacao pos-update e retry
- `supabase/functions/get-crm-plans/index.ts` — diagnostico no warning
- `src/pages/Quote.tsx` — usar `fipeValue` retornado pela placa quando disponivel

### Limitacoes (transparencia)

- Se a placa nunca for identificada pelo DENATRAN do CRM (placa nova, dado faltante na base), o usuario continua precisando preencher manualmente — isso so muda com a placafipe.com.br ou similar
- O polling adiciona ate 15s no Passo 2 quando o CRM demora — porem retorna assim que pronto, entao o caso comum fica mais rapido (nao mais 5s fixos)
