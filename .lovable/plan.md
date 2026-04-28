## Diagnóstico do problema real

Você relatou que **a FIPE exibida no app é diferente da FIPE oficial** quando consulta a placa. Investiguei o edge function `consulta-placa-crm` e o `Quote.tsx` atuais e identifiquei a causa raiz — que **não é o que o código do Claude conserta** (a maioria das melhorias dele já está no seu código: `cmby?cb=&cy=`, recompute FIPE, polling, `cdFp`, fallback `cm`).

### A causa raiz é outra:

No fluxo **com placa**, quando o CRM da PowerCRM devolve um `fipeValue` no endpoint `/plates`, esse valor é tratado como verdade e exibido. Mas o CRM frequentemente retorna um valor **desatualizado ou de uma versão errada do modelo** (ex: confunde "C3 AIRCROSS" com "C3"). O FIPE Parallelum só é consultado como **fallback** quando o CRM não devolve valor — e é aí que aparece a divergência com o site oficial.

No fluxo **manual** (sem placa), o usuário já escolhe Marca/Modelo/Ano direto na FIPE Parallelum (que é a fonte oficial), mas depois o backend ainda tenta "resolver" no CRM e às vezes o `modelOptions` que retorna confunde o usuário com versões parecidas.

---

## Plano de correção (escolha B aprovada)

### 1. Edge function `consulta-placa-crm/index.ts` — tornar FIPE Parallelum a fonte de verdade

**No fluxo com placa** (após `fetchPlateFromCrm` resolver brand/model/year):
- Sempre rodar `fetchFipeByModelLabel(brand, model, year, vehicleType)` para obter o valor FIPE oficial via Parallelum
- **Sobrescrever** `vehicle.fipeValue` e `vehicle.fipeCode` com o resultado da Parallelum quando disponível (hoje só sobrescreve se `fipeValue` estiver zerado)
- Manter o valor do CRM apenas como fallback se a Parallelum falhar

**No fluxo manual** (`manualVehicle` presente):
- Confiar 100% no `fipeCode` + `fipeValue` que o frontend já obteve da Parallelum
- **Pular** o `buildCrmModelOptions` (não devolver `modelOptions`) — o usuário já escolheu na fonte oficial
- Continuar resolvendo `crmBrandId`/`crmModelId`/`crmYearId` apenas para o CRM aceitar o card, mas sem expor opções alternativas

**Limpar caches em memória do edge function**: os `Map` de `fipeBrandCache`/`fipeModelCache`/`fipeYearCache`/`brandsCache` persistem entre invocações na mesma instância e podem servir dados velhos. Adicionar TTL de 10 min ou remover os caches de FIPE (a Parallelum aguenta o tráfego).

### 2. Frontend `Quote.tsx` — suprimir dropdown de "Confirme o modelo" no fluxo manual

- Quando `quote.vehicle.modelOptions` vier vazio (caso manual) **não** mostrar o seletor `ModelOptionsField`
- Quando o usuário pulou a placa e preencheu manual, exibir um badge "FIPE oficial: R$ X.XXX,XX (código YYYYYY-Z)" com link para fipe.org.br para reforçar credibilidade
- Remover a validação `if ((quote.vehicle.modelOptions?.length || 0) > 1 && !quote.vehicle.modelCode)` quando estiver no fluxo manual

### 3. Diagnóstico/observabilidade

- Adicionar log explícito no edge function: `FIPE source: parallelum|crm|none` com brand/model/year + valor final escolhido — facilita debug futuro de divergências
- No `Result.tsx` (já existente), garantir que o valor exibido vem do `fipeValue` final retornado pelo edge function, não recalculado no cliente

---

## Detalhes técnicos

**Arquivos a editar:**
- `supabase/functions/consulta-placa-crm/index.ts` — passos 6 e 7 do `Deno.serve` (linhas 859-931) + bloco `manualVehicle` (linhas 756-769) + caches FIPE (linhas 441-443)
- `src/pages/Quote.tsx` — bloco do `ModelOptionsField` (linha ~607) + validação de modelo (linha ~317) + payload do `manualVehicle` (linha ~346)

**O que NÃO vou mexer (já está bom):**
- `cmby?cb=&cy=` com fallback para `cm` — já implementado
- Recompute FIPE no `selectedModel` flow — já implementado
- Polling com tolerância de 1% — já implementado
- `cdFp` no payload de update — já implementado
- Bonus/penalty de tokens (AIRC/AIRCROSS) — já implementado

**O que NÃO vou substituir do código que você mandou:**
- O código do Claude removia o suporte a `manualVehicle` e exigia `plate.min(6)` — isso quebraria o fluxo "pular placa" que está em produção

**Após editar:**
- Deploy do edge function via `supabase--deploy_edge_functions`
- Teste com curl em uma placa conhecida que estava divergindo + um caso manual
- Verificar logs para confirmar `FIPE source: parallelum`

---

## O que você ganha

1. Valor FIPE no app = valor FIPE oficial (Parallelum, mesma fonte do fipe.org.br)
2. Fluxo manual mais limpo: usuário escolheu na FIPE → confirma direto, sem dropdown confuso de "qual versão é a sua?"
3. CRM continua recebendo o card com IDs corretos (`mdl`, `mdlYr`, `cdFp`, `protectedValue`) para o atendente operar normalmente
4. Logs claros para identificar qualquer divergência futura

Aprovando, eu já implemento e faço o deploy do edge function na sequência.