
# Tornar placa opcional quando o usuário preenche modelo manualmente

## Problema atual

Hoje a placa é obrigatória para avançar do Step 2:
- `validateStep2` exige `plate.length >= 7`.
- A criação da cotação no CRM (`consulta-placa-crm`) só acontece se o usuário clicar em "Consultar" com placa válida.
- Se a placa do CRM/SINESP não retorna o veículo (caso comum em motos, veículos novos, ou plate não cadastrada), o usuário fica preso — mesmo que ele consiga preencher Marca/Modelo/Ano via FIPE manualmente.

O CRM aceita criar cotação sem placa (`plts` pode ir vazio) — campos obrigatórios reais são `name`, `phone`, `email`, `registration` e `vhclType`.

## O que muda

### 1. Frontend (`src/pages/Quote.tsx`)

**Validação Step 2 — placa não obrigatória:**
- Remover a checagem `plate.length < 7` de `validateStep2`. Aceitar placa vazia.
- Manter exigência de `type`, `usage`, e (no modo manual) `brandCode + modelCode + yearCode`.
- Se o usuário digitou algo na placa, validar formato; se vazio, pular.

**Botão "Consultar" continua existindo, mas opcional:**
- Mostrar um texto auxiliar abaixo da placa: *"Não tem a placa? Pode pular e preencher abaixo."*
- O bloco de seleção manual (Marca/Modelo/Ano FIPE) já aparece quando `!plateConsulted` — basta funcionar também sem placa digitada.

**Avançar do Step 2 sem cotação CRM criada:**
- Hoje o fluxo principal é: clica em "Consultar" → cria cotação → guarda `crmQuotationCode`.
- Novo: se ao clicar "Avançar" não houver `crmQuotationCode` E o usuário tiver preenchido manualmente, criar a cotação no CRM nesse momento, enviando os dados manuais (placa pode ir vazia).

### 2. Edge function `consulta-placa-crm`

**Tornar `plate` opcional no Zod schema:**
- `plate: z.string().trim().max(10).optional().default("")`.
- Quando `plate` está vazia, pular `fetchPlateFromCrm` (não chamar `/plates/`) e ir direto para criar a cotação.

**Aceitar dados manuais do veículo no body:**
- Adicionar bloco opcional `manualVehicle` ao schema:
  ```ts
  manualVehicle: z.object({
    brand: z.string(),
    model: z.string(),
    year: z.string(),
    fipeCode: z.string().optional(),
    fipeValue: z.number().optional(),
    crmBrandId: z.number().optional(),
    crmModelId: z.number().optional(),
    crmYearId: z.number().optional(),
  }).optional()
  ```
- Quando `manualVehicle` vier preenchido, usar esses dados para resolver IDs CRM (via `resolveCrmIds` por nome) e disparar o mesmo "early update" com `mdl`, `mdlYr`, `protectedValue`, `cdFp` que hoje só roda no fluxo de placa.

**Payload de criação:**
- Manter `plts` e `plates` apenas se a placa existir; caso contrário, enviar string vazia (CRM aceita).

### 3. Edge function `submit-to-crm`

- `plate` já é `optional().default("")` — sem mudanças no schema.
- Garantir que, quando `crmQuotationCode` já vier do passo anterior (criado via fluxo manual), o `submit-to-crm` apenas atualize o lead com endereço, sem tentar recriar.

## O que NÃO muda

- Schema do banco (`quotes.vehicle_data` já é JSON livre).
- Frontend de Step 1, Step 3, Result, Payment.
- `get-crm-plans`, `consulta-placa`, `consulta-cep`.
- Lógica de planos, polling FIPE, enriquecimento Parallelum.

## Resultado esperado

- Usuário pode pular completamente a placa, escolher Marca/Modelo/Ano via FIPE, e avançar normalmente.
- O lead é criado no CRM com os dados manuais preenchidos (`mdl`, `mdlYr`, FIPE) — mesmo sem placa.
- Quem tem a placa continua usando o fluxo automático (sem regressão).

## Arquivos modificados

- `src/pages/Quote.tsx` — validação + criação da cotação no "Avançar" quando manual.
- `supabase/functions/consulta-placa-crm/index.ts` — placa opcional + suporte a `manualVehicle`.
