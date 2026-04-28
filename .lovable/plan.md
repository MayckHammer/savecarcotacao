## Resumo dos achados pelos prints

Os prints confirmaram URLs, método e payload exatos das duas ações que precisamos replicar. Mas mostraram coisas diferentes do que eu tinha planejado antes:

### Lupa — `GET /company/pltVrfyQttn?plates=XXX`
- Não recebe `quotationCode`, só placa.
- Devolve DENATRAN + `brandId` (CRM) + `codFipe` (formato CRM "011117-1").
- **Não devolve valor FIPE** — quem dispara o cálculo é o Salvar.

### Salvar — `POST /company/updateQuotationVehicleData`
Payload real (campos EXATOS, nada de `vhclBrand`/`vhclModel` como eu havia escrito antes):
```json
{
  "quotationId": 41315826,        // ID numérico
  "plates": "PAI0F65",
  "chassi": "935SUNFNWFB511454",
  "renavam": "",
  "carModel": "603",              // ID interno CRM do modelo
  "carModelYear": "2015",
  "fabricationYear": "2014",
  "color": "",
  "engineNumber": "10DE090038668",
  "depreciationId": "0",
  "expirationDay": 0,
  "kmtr": "", "noteContract": "", "noteContractInternal": "",
  "protectedValue": null,         // null — CRM calcula sozinho
  "shift": null, "fuel": null, "city": null,
  "workVehicle": false
}
```

**Descobertas que mudam tudo:**
1. Path correto é `/company/...`, não `/api/quotation/...`.
2. `protectedValue` vai como `null` — o backend do CRM calcula a partir de `carModel`+`carModelYear` (não devemos forçar valor).
3. `carModel` é o **ID interno do CRM** (ex `"603"`), não o `fipeCode` da Parallelum. Esse ID vem do endpoint `cmby?cb={brandId}&cy={year}` (que já aparece nos prints).
4. `quotationId` é **numérico** (41315826), não o código alfanumérico que usamos hoje (`DnKN1l8r`). Preciso descobrir onde está esse ID — provavelmente na resposta de `/quotation/add` ou em `getQuotation` há um `id` além do `code`.

## O que vou fazer

### Passo 1 — Descobrir o `quotationId` numérico

Hoje só guardamos o `code` alfanumérico. Vou:
- Logar a resposta completa do `quotation/add` para ver se já vem um `id` ou `quotationId` numérico.
- Se não vier no add, vou logar `getQuotation({code})` para ver se ele devolve `id` numérico no body.
- Salvar esse ID e usar no `updateQuotationVehicleData`.

### Passo 2 — Reescrever o fluxo da edge function `consulta-placa-crm`

Sequência nova quando o usuário envia placa:

```text
1. POST /quotation/add                            → cria card, recebe quotationCode + quotationId
2. POST /quotation/add-tag (23323)                → tag "30 Seg"
3. GET  /company/pltVrfyQttn?plates=XXX           → "lupa": pega brandId + codFipe + dados DENATRAN
4. GET  /company/cmby?cb={brandId}&cy={year}      → lista modelos do ano, pega carModel ID interno
   (matching por similaridade contra o nome do modelo da Parallelum, igual já fazemos)
5. POST /company/updateQuotationVehicleData       → "Salvar" oficial, com payload exato dos prints
   { quotationId, plates, chassi, carModel, carModelYear, fabricationYear,
     engineNumber, depreciationId:"0", expirationDay:0, protectedValue:null,
     workVehicle:false, ... }
6. Polling GET /quotation/{code} (até 8s)         → espera vhclFipeVl > 0
7. Devolve ao app: vehicle + crmFipeConfirmed + crmFipeValue
```

### Passo 3 — Autenticação

Os prints mostram que o navegador usa cookie de sessão (`PWRSESSIONID` + `token` JWT). Nosso `POWERCRM_API_TOKEN` é Bearer. Vou:
- Primeiro tentar com `Authorization: Bearer ${POWERCRM_API_TOKEN}` (que já funciona nos endpoints `/api/...`).
- Se der 401/403, logar e ajustar para mandar como `Cookie: token=...` (o token que temos hoje pode ser usado como cookie também).
- O endpoint `/api/quotation/add` que usamos hoje continua com Bearer normalmente.

### Passo 4 — Resposta ao app

```json
{
  "vehicle": { ... },
  "crmFipeConfirmed": true,
  "crmFipeValue": 42906,
  "crmFipeCode": "011117-1",
  "fipeSource": "parallelum-by-label"
}
```

`Quote.tsx` continua confiando no `vehicle.fipeValue` da Parallelum para mostrar ao cliente; os campos novos são opcionais.

### Passo 5 — Tratamento de falha

- Se `pltVrfyQttn` falhar → fallback Parallelum direto (fluxo atual, sem o save).
- Se `cmby` não achar `carModel` → loga e tenta o save com o `fipeCode` Parallelum no campo `carModel` (palpite, melhor que nada).
- Se `updateQuotationVehicleData` falhar → loga payload+resposta completos e cai no `/quotation/update` antigo como fallback (não quebra o cliente).
- Se polling esgotar → devolve `crmFipeConfirmed: false` mas não bloqueia o app.

## Detalhes técnicos

**Arquivo único editado:** `supabase/functions/consulta-placa-crm/index.ts`

Funções novas:
- `triggerCrmPlateLookup(token, plate)` → `GET /company/pltVrfyQttn?plates={plate}`, devolve `{ brandId, codFipe, year, chassi, engineNumber, color, vehicleType }`.
- `findCrmCarModelId(token, brandId, year, modelLabel)` → `GET /company/cmby?cb={brandId}&cy={year}`, escolhe melhor match contra `modelLabel` (Parallelum) por similaridade. Retorna ID string tipo `"603"`.
- `saveCrmVehicleData(token, payload)` → `POST /company/updateQuotationVehicleData` com payload EXATO dos prints.
- `pollCrmFipeValue(token, quotationCode, maxMs=8000)` → polling em `getQuotation`, lê `vhclFipeVl`.
- `extractQuotationNumericId(addResponse)` → procura `id` / `quotationId` na resposta do `add`.

Mudanças no `Deno.serve`:
- Após `quotation/add`, capturar `quotationId` numérico.
- Chamar `triggerCrmPlateLookup` antes do `consulta-placa` Parallelum (ou em paralelo).
- Combinar dados do CRM (brandId, codFipe) + Parallelum (label exato + valor oficial).
- Chamar `findCrmCarModelId` → `saveCrmVehicleData` → `pollCrmFipeValue`.
- Manter `BodySchema` atual (sem mudança de contrato com o frontend).

Riscos conhecidos:
1. `quotationId` numérico pode não vir na resposta de `/quotation/add` — vou logar e ver. Se não vier, pode ser necessário um `getQuotation` extra logo após criar.
2. Header de auth: pode precisar de Cookie em vez de Bearer nos paths `/company/...`. Vou logar a primeira tentativa com Bearer e ajustar conforme a resposta.
3. Tempo total da chamada vai de ~6s para ~10-12s (lupa + cmby + save + polling). Aceitável.

**Após editar:**
1. Deploy da função.
2. Teste com placa `PAI0F65` (sabemos que existe no card `DnKN1l8r`, quotationId `41315826`).
3. Logs esperados: `pltVrfyQttn 200`, `cmby 200`, `updateQuotationVehicleData 200`, polling lendo `vhclFipeVl=42906`.
4. Validar visualmente abrindo o card no CRM — Marca, Modelo, Cód FIPE e Valor Protegido devem aparecer preenchidos sem clique manual.

## Resultado esperado

Quando o cliente envia a placa pelo app:
1. Card do CRM é criado com FIPE **já preenchido** (sem precisar de intervenção do atendente).
2. App recebe confirmação de que o CRM bateu o valor — segue para a tela de planos.
3. Atendente abre o card e vê tudo completo, exatamente como ficaria após clicar lupa + Salvar manualmente.

Aprovando, eu já implemento, faço deploy e mando os logs do teste com `PAI0F65` para você validar.
