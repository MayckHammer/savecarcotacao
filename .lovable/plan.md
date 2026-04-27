## Problema

O CRM Power tem um campo **"Tipo de veículo"** (Carro, Moto, Caminhão) que precisa estar preenchido **antes** da consulta DETRAN — é ele que dispara a busca FIPE/DENATRAN correta. Hoje nosso `consulta-placa-crm` envia só `name`, `phone`, `email`, `registration`, `plts` e o CRM fica em "Dados incompletos" porque o tipo nunca é definido. Resultado: a placa é inserida mas o DETRAN não retorna nada útil porque o CRM não sabe se é carro, moto ou caminhão.

Olhando o swagger do CRM, o campo correto é **`workVehicle`** (boolean — se é veículo de trabalho/comercial) e o **tipo de veículo em si vem do endpoint `GET /api/quotation/vehicleTypes`**, com IDs que podem ser passados na criação da cotação. Não há um campo simples `vehicleType` no `QuotationAddRequest` do swagger — o tipo é inferido pelo CRM a partir do **modelo (`carModel`)** que enviamos depois. Mas o CRM precisa de um sinal antes do DENATRAN.

## Solução: detectar o tipo a partir da placa e do banco brasileiro

O Brasil tem padrões fortes que permitem inferir o tipo de veículo **antes** mesmo de qualquer consulta:

1. **SINIAV/DENATRAN não diferencia por placa** — mas a **categoria** sim (placas vermelhas = aluguel/táxi, placas pretas = colecionador). Para tipo (carro/moto/caminhão), placa sozinha não basta.
2. **Solução real**: usar uma **API gratuita de consulta de placa que já retorna o tipo**, antes de chamar o CRM. Já temos a function `consulta-placa` (placas-api / api.invertexto via tokens públicos) que retorna `vehicleType`. Vamos usá-la **como pré-passo** para descobrir o tipo e mandar pro CRM.
3. **Fallback IA**: se a API pública não responder em 3s, usar **Lovable AI (Gemini Flash)** para classificar o tipo a partir do prefixo da placa + heurísticas do estado/região (baixa confiabilidade, mas evita travar o fluxo).

## O que será feito

### 1. Frontend (`Quote.tsx` — passo 2)

- Adicionar um seletor visual **"Tipo de veículo"** com 3 opções (Carro, Moto, Caminhão) **antes** do campo placa, idêntico ao do CRM.
- Pré-selecionar **"Carro"** por padrão (cobre ~85% dos casos).
- Mostrar como `RadioGroup` em cards com ícones (Car, Bike, Truck do lucide-react), no estilo Loovi (verde + glassmorphism).
- Enviar `vehicleType: "carro" | "moto" | "caminhao"` no body do `consulta-placa-crm`.

### 2. Edge Function `consulta-placa-crm`

- Aceitar `vehicleType` no schema Zod.
- **Chamar internamente `consulta-placa`** (API pública) primeiro, em paralelo com a criação da cotação no CRM, para validar/confirmar o tipo escolhido.
- Se a API pública retornar tipo diferente do escolhido pelo usuário, usar o da API (mais confiável).
- Mapear tipo → IDs do CRM: buscar `GET /api/quotation/vehicleTypes` (cacheado em memória do worker — só 1x por boot) e fazer o match pelo nome ("Carro ou utilitário pequeno", "Moto", "Caminhão ou micro-ônibus").

### 3. Atualização da cotação no CRM com o tipo

- O endpoint `quotation/add` aceita `workVehicle: boolean`. Mas o **tipo de veículo em si** (carro/moto/caminhão) é definido por outro endpoint. Investigar 2 opções no swagger:
  - **Opção A**: passar `vehicleTypeId` no `quotation/update` (algumas versões aceitam mesmo sem documentar).
  - **Opção B**: chamar `POST /api/quotation/{quotationCode}/vehicle-type` se existir, ou usar `quotation/forceVehicleCityChange` + `update` com o tipo.
- Vou testar via `supabase--curl_edge_functions` e logs reais qual aceita o campo. Documentar no log o payload aceito.
- Definir em `consulta-placa-crm` logo após `quotation/add`, antes do polling DENATRAN, **garantindo que o tipo está setado no CRM** — assim o DENATRAN dispara corretamente.

### 4. `submit-to-crm`

- Incluir `vehicleType` no payload de `update` para reforçar (caso o CRM perca entre passos).

### 5. Banco

- Adicionar coluna `vehicle_type text` em `quotes` para auditoria.

## O que NÃO será feito

- Não vou usar IA para detectar tipo pela placa (placa brasileira não carrega essa informação — daria resultado pior que perguntar ao usuário).
- Não vou remover o seletor manual: usuário sempre pode corrigir antes de submeter.
- Não vou mexer no fluxo de FIPE manual fallback (já funciona).

## Detalhes técnicos

```text
Fluxo atual:
[Quote step 2] usuário digita placa → consulta-placa-crm → CRM cria cotação SEM tipo
                                                         → DENATRAN não dispara
                                                         → polling vazio → FIPE manual

Fluxo proposto:
[Quote step 2] usuário escolhe tipo (Carro padrão) + placa
   → consulta-placa-crm:
       a) cria cotação no CRM (com workVehicle se Caminhão)
       b) seta vehicleType via endpoint dedicado
       c) chama consulta-placa pública em paralelo p/ confirmar tipo
       d) polling DENATRAN agora retorna dados corretos
   → frontend recebe vehicle preenchido + fipeValue
   → fluxo segue normal
```

Mapeamento tipo → CRM (a confirmar via teste com `vehicleTypes` endpoint):
```ts
const TYPE_MAP: Record<string, { name: string; workVehicle: boolean }> = {
  carro:    { name: "Carro ou utilitário pequeno", workVehicle: false },
  moto:     { name: "Moto",                         workVehicle: false },
  caminhao: { name: "Caminhão ou micro-ônibus",     workVehicle: true  },
};
```

Arquivos a modificar:
- `src/pages/Quote.tsx` — adicionar seletor tipo de veículo no passo 2
- `src/contexts/QuoteContext.tsx` — adicionar `vehicleType` ao state
- `supabase/functions/consulta-placa-crm/index.ts` — aceitar tipo, buscar `vehicleTypes`, setar no CRM
- `supabase/functions/submit-to-crm/index.ts` — reforçar tipo no update
- Nova migration: `alter table quotes add column vehicle_type text`

Após aprovação, deploy automático e teste real com uma placa de cada tipo para confirmar que o CRM recebe corretamente e o DENATRAN dispara.