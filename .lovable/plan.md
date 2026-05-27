## Objetivo

Parar de tentar replicar a lógica de cálculo de planos do PowerCRM via APIs separadas (FIPE + tabelas + planos). Em vez disso, usar o **endpoint oficial do formulário dinâmico** do CRM (`/svQttnDynmcFrm`) — o mesmo que o link público https://cotacao.me/xQDAWXlZ usa — para obter os valores reais de **COMPLETO** e **PREMIUM** já calculados pelo CRM, e renderizar tudo dentro do Loovi com identidade visual nossa.

## Como funciona o widget do PowerCRM (descobertas)

Após analisar o `script.pwrcrm.js` e o link cotacao.me:

- **Submit:** `POST https://app.powercrm.com.br/svQttnDynmcFrm` com payload JSON:
  ```
  companyHash: "Sav3c4r1Czwe3"       (fixo da Save Car)
  formCode: "xQDAWXlZ"               (fixo do formulário cotacao.me)
  pipelineColumn: "1"
  funnelStage: "6834bcae-ecd3-4387-8bc2-dfd03dbaea0c"
  leadSource: "23684"
  clientName/Email/Phone/City (id)
  vehiclePlate, vehicleType, vehicleBranch, vehicleModel, vehicleYear (IDs do CRM)
  vehicleIsWork (bool)
  ```
- **Resposta:** `{ success, qttnCd, isPlan, planPriority, specificTable, redirecTo }` — quando `isPlan > 0` o CRM redireciona para `app.powercrm.com.br/compareTables?h=<qttnCd>` que renderiza COMPLETO e PREMIUM com valores reais.
- **Endpoints auxiliares do CRM** para popular dropdowns (já feitos sem CORS pelo script): `/cb` (tipos), `/bmy` (marcas por tipo), `/cmby` (modelos por marca/ano), além de estados e cidades.

## Plano de implementação

### 1. Nova edge function `pwrcrm-quote` (proxy oficial)
Centraliza toda comunicação com PowerCRM, escondendo os hashes do front:
- `action: "states"` → lista estados
- `action: "cities"` → lista cidades por estadoId
- `action: "brands"` → lista marcas por tipoId
- `action: "years"` → anos por marcaId
- `action: "models"` → modelos por marca/ano
- `action: "submit"` → POST `/svQttnDynmcFrm` com hashes injetados, retorna `qttnCd`
- `action: "plans"` → faz GET em `/compareTables?h=<qttnCd>` (e se necessário `/newQuotation`) e extrai os valores de COMPLETO/PREMIUM via parser HTML, retornando `[{ name, monthlyPrice, annualPrice }]`

Todas as chamadas com retry/timeout. Hashes do formulário ficam em constantes na função (ou em secrets se preferir).

### 2. Novo componente `src/components/CrmQuoteForm.tsx`
Formulário nativo Loovi (verde #0D5C3E + amarelo #F2B705, glass, cards arredondados, animações framer-motion) com os mesmos campos do widget oficial:
- Nome, Telefone, E-mail, Placa
- Tipo, Marca, Ano, Modelo (selects encadeados via `pwrcrm-quote`)
- Estado, Cidade (selects via `pwrcrm-quote`)
- Checkbox "Veículo de trabalho"

Mantém a **busca por placa** (lupa) já existente: ela apenas pré-seleciona tipo/marca/ano/modelo nos dropdowns do CRM por melhor match (não precisa mais conversar com a API do CRM para destravar planos).

### 3. `src/pages/Quote.tsx` — refatorar etapas
- **Step novo único** (substitui os 3 atuais como caminho principal): renderiza `CrmQuoteForm`. Ao enviar, chama `pwrcrm-quote/submit`, recebe `qttnCd`, salva no contexto, e em seguida `pwrcrm-quote/plans` para puxar os preços calculados.
- Guarda os planos retornados em `crmPlans` (estrutura já existe no `QuoteContext`).
- Navega para `/plan-details`.
- **Fallback:** manter o fluxo antigo (3 etapas + consulta-placa-crm + get-crm-plans) atrás de um toggle automático: se `pwrcrm-quote` falhar 2x, mostra um botão "Continuar pelo modo manual" que volta a usar o pipeline atual.

### 4. `src/pages/PlanDetails.tsx`
- Voltar a exibir **preço mensal real** vindo de `crmPlans` (COMPLETO e PREMIUM), no lugar de "Valor confirmado pelo consultor".
- Manter chips de cobertura, seletor de pagamento, e botão Continuar → `/aguardando` (mini-game → inspeção → pagamento) — fluxo Loovi preservado.

### 5. `supabase/functions/submit-to-crm/index.ts`
- Continua sendo chamado no Continuar do PlanDetails só para **atualizar observações** do card com plano escolhido e forma de pagamento (campo "Observações internas" que você pediu). O `qttnCd` retornado pelo `pwrcrm-quote/submit` é o mesmo `crmQuotationCode` usado aqui, então o update encontra o card certo.

### 6. Edge functions a **desativar** (não remover, ficam como fallback)
- `consulta-placa-crm` — substituída por `pwrcrm-quote/submit`
- `get-crm-plans` — substituída por `pwrcrm-quote/plans`

Permanecem no projeto e no `supabase/config.toml`, mas sem chamadas do front no caminho feliz.

### 7. Memória do projeto
Atualizar `mem://integrations/power-crm` registrando o novo endpoint oficial `/svQttnDynmcFrm` + hashes do formulário cotacao.me, e marcando `consulta-placa-crm`/`get-crm-plans` como fallback.

## Arquivos editados / criados

Criados:
- `supabase/functions/pwrcrm-quote/index.ts`
- `src/components/CrmQuoteForm.tsx`

Editados:
- `src/pages/Quote.tsx`
- `src/pages/PlanDetails.tsx`
- `src/contexts/QuoteContext.tsx` (pequeno ajuste se precisar de campos novos)
- `supabase/config.toml` (registrar `pwrcrm-quote` com `verify_jwt = false`)
- `supabase/functions/submit-to-crm/index.ts` (usar `qttnCd` do novo fluxo)
- `mem://integrations/power-crm`

Sem alterações:
- `consulta-placa-crm`, `get-crm-plans`, `consulta-placa`, `consulta-cep` (mantidos como apoio/fallback).

## Riscos e mitigação

- **CORS / scraping de `compareTables`**: a chamada é server-side (edge function), então sem problema de CORS. Se o HTML do `/compareTables` mudar de estrutura, o parser quebra → mitigamos com seletor robusto + fallback para `/newQuotation` e, em último caso, exibir "Valor a confirmar com consultor" como hoje.
- **Hashes do formulário (companyHash, formCode, funnelStage, pipelineColumn, leadSource)**: ficam no código da edge function. Se o CRM gerar novo link, basta atualizar 5 constantes.
- **UTMs/consultor**: o payload aceita `utmParameters` e `companyUserCode` — repassamos o que vier da URL do Loovi.

## Resultado para o usuário

1. Cliente preenche **um único formulário Loovi** (visual nosso) com dados pessoais, placa e localização.
2. Clica enviar → edge function fala com o PowerCRM oficial → cria a cotação e devolve os **valores reais** de COMPLETO e PREMIUM.
3. PlanDetails mostra os dois planos com preço, cliente escolhe e segue para mini-game → inspeção → pagamento.
4. Card cai no CRM já com plano calculado (não precisa mais o operador preencher manualmente plano/valor — só validar).
