## Revisão geral do app + integrações com Power CRM

Fiz uma varredura no frontend (`Quote`, `Result`, `PlanDetails`, `Inspection`, `Admin`, `QuoteContext`) e nas 7 edge functions (`consulta-cep`, `consulta-placa`, `consulta-placa-crm`, `submit-to-crm`, `get-crm-plans`, `get-inspection-link`, `update-inspection`), além de checar os logs e os últimos 10 registros da tabela `quotes`.

## Diagnóstico rápido

**Funcionando bem:**
- Fluxo de 3 passos (dados → veículo → endereço), captura de placa via CRM com polling adaptativo, fallback FIPE manual, CEP com ViaCEP+BrasilAPI, vistoria obrigatória antes do pagamento, painel admin.
- Tabela `quotes` com RLS, edge functions com CORS e tratamento de erros razoável.

**Problemas reais encontrados nos logs e no código:**

1. **`open-inspection` está retornando HTTP 500 logo após criar a cotação** (visto nos logs: "Internal Server Error" na consulta de placa). Isso acontece porque o CRM ainda não tem dados suficientes (sem FIPE, sem endereço) na hora que `consulta-placa-crm` tenta abrir a vistoria. Resultado: nenhuma vistoria é aberta de fato no início e `inspection_link` fica `null` (confirmado no DB — todos `has_link = false`).

2. **Vistoria nunca é reaberta depois que os dados ficam completos.** Após `submit-to-crm` rodar com FIPE + endereço, ninguém chama `open-inspection` de novo. Por isso o `inspection_link` nunca chega.

3. **Código duplicado entre `consulta-placa-crm` e `submit-to-crm`** (lógica de criar quotation, add-tag, open-inspection repetida). Difícil de manter.

4. **`get-inspection-link` faz polling sem nunca chamar `open-inspection`**, então mesmo com retry o link nunca aparece se a abertura inicial falhou.

5. **`Result.tsx` espera 3 segundos fixos** antes de buscar planos, e `get-crm-plans` faz 4 retries com delays até 12s — soma pode passar de 50s antes do usuário ver erro. Sem feedback visual durante esse tempo.

6. **`localStorage` em `defaultQuote` quebra SSR-safety** e mistura sessão antiga com nova cotação (`session_id` vem inicializado mesmo após `resetQuote`).

7. **Lookup de cidade/estado em `submit-to-crm`** chama `utilities.powercrm.com.br` toda vez sem cache — desperdício a cada submissão.

8. **`PLACAFIPE_API_TOKEN` não está configurado** mas você já decidiu seguir sem ele — ok, mas ainda há código de import quebrado em `package.json`/`tsconfig` de uma tentativa anterior que não chequei a fundo. Vou validar e remover se sobrar lixo.

9. **Sem rate-limit / sem validação Zod** nas edge functions públicas (`verify_jwt = false`). Qualquer um pode floodar `consulta-placa-crm` e gerar leads falsos no CRM.

10. **Diversos `any` e `console.log` verbosos no frontend**, sem unificação de tipos para a resposta do CRM.

## O que será feito

### Edge Functions

**a) `consulta-placa-crm`**
- Remover a chamada `open-inspection` daqui (ela falha cedo demais). Manter apenas: criar quotation + add-tag + polling adaptativo de dados do veículo.
- Adicionar validação Zod no body (`personal`, `plate`).

**b) `submit-to-crm`**
- Após o `update` da quotation com FIPE + endereço persistidos (verificado por `verifyUpdate`), **chamar `open-inspection` aqui** — agora sim com dados completos. Salvar `inspection_link` em `quotes` se vier de imediato.
- Cachear lookup de estado/cidade num `Map` em memória (vida útil do worker) para evitar chamar `utilities.powercrm.com.br` toda vez.
- Centralizar helpers (`getCityCode`, `openInspection`) em comentários de seção para ficar mais legível.

**c) `get-inspection-link`**
- Se o link ainda não existe e a quotation tem FIPE + endereço, chamar `open-inspection` antes do polling (auto-recovery).

**d) `get-crm-plans`**
- Reduzir delays: 3s → 5s → 7s → 9s (era 5/8/10/12). Total cai de ~35s para ~24s.
- Devolver o motivo exato no `warning` para o frontend exibir mensagem útil.

**e) Validação de input com Zod em todas as functions públicas** (`consulta-placa-crm`, `submit-to-crm`, `consulta-cep`, `consulta-placa`, `update-inspection`, `get-crm-plans`, `get-inspection-link`). Retorna 400 com erro claro se body inválido.

**f) Rate-limiting simples por IP+CPF** em `consulta-placa-crm` e `submit-to-crm` (10 chamadas / 5 min usando `Map` in-memory). Suficiente para barrar flood básico sem complicar.

### Frontend

**g) `Result.tsx`** — Substituir o `setTimeout(3000)` fixo por polling do `get-crm-plans` com loading visível ("Calculando seu plano..." com 3 dots animados). Mostrar `warning` se vier do edge.

**h) `QuoteContext.tsx`** — Tirar `localStorage.getItem` do `defaultQuote` (resetQuote agora limpa de verdade). Hidratar sessão num `useEffect` no provider em vez do default.

**i) `Quote.tsx`** — Tipar resposta do CRM (`CrmPlateResponse` interface), eliminar `any` dos handlers FIPE.

**j) Limpar lixo** — verificar `package.json`/`tsconfig.json` por dependências/paths órfãos da tentativa de placafipe.com.br e remover o que sobrou.

### Banco

**k) Adicionar índice em `quotes(session_id)` e `quotes(crm_quotation_code)`** — hoje as queries fazem full scan. Migration simples.

**l) Coluna `last_crm_sync_at timestamptz`** em `quotes` para rastrear última sincronização e ajudar debug futuro.

## O que NÃO será feito

- Não vou trocar para placafipe.com.br (você já decidiu).
- Não vou adicionar autenticação de usuário (fluxo é público por design).
- Não vou refatorar o layout das páginas.
- Não vou mexer no `PlanDetails` (acabamos de ajustar).

## Detalhes técnicos

```text
Fluxo atual (problema):
[Quote step 2] → consulta-placa-crm → cria quotation + open-inspection (FALHA 500)
[Quote step 3] → submit-to-crm → update quotation com FIPE+endereço
[Result]       → get-crm-plans (planos OK)
[Inspection]   → get-inspection-link → polling sem reabrir → link NUNCA chega

Fluxo proposto:
[Quote step 2] → consulta-placa-crm → cria quotation + tag (sem open-inspection)
[Quote step 3] → submit-to-crm → update + verify + open-inspection (agora funciona)
[Result]       → get-crm-plans com polling visível
[Inspection]   → get-inspection-link → se sem link, tenta open-inspection + polling
```

Arquivos a modificar:
- `supabase/functions/consulta-placa-crm/index.ts`
- `supabase/functions/submit-to-crm/index.ts`
- `supabase/functions/get-inspection-link/index.ts`
- `supabase/functions/get-crm-plans/index.ts`
- `supabase/functions/consulta-cep/index.ts`
- `supabase/functions/consulta-placa/index.ts`
- `supabase/functions/update-inspection/index.ts`
- `src/pages/Result.tsx`
- `src/pages/Quote.tsx`
- `src/contexts/QuoteContext.tsx`
- `package.json` / `tsconfig.json` (limpeza, se houver lixo)
- Nova migration: índices + coluna `last_crm_sync_at`

Após aprovação, deploy automático das edge functions modificadas e validação rápida com `supabase--curl_edge_functions` em uma cotação de teste para confirmar que o `inspection_link` agora chega.
