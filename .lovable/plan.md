## Diagnóstico

Pelos prints e logs:

1. Estamos enviando `POST /api/quotation/update` com `vehicleType: 2` (Moto) e o CRM responde **200 OK** — mas a resposta inteira da cotação **não contém nenhum campo de tipo de veículo** (só reflete `workVehicle`). Ou seja, o CRM ignora silenciosamente as chaves `vehicleType` / `vehicleTypeId` / `type`.
2. Por isso, no print do CRM o campo "Tipo de veículo" continua vazio e o DENATRAN só dispara depois que o operador escolhe manualmente "Moto" e clica na lupa azul.
3. Como o DENATRAN nunca dispara automaticamente, o polling de 15s no nosso edge function não encontra dados de marca/modelo/ano e o app mostra os campos vazios (print 3).

A causa raiz é **o nome do campo está errado** — precisamos descobrir o nome real que o CRM aceita.

## Estratégia (3 frentes em paralelo, com fallback robusto)

### 1. Enviar `vehicleType` já no POST de criação (`/quotation/add`)
Hoje só enviamos no `update`. O endpoint `add` provavelmente aceita o tipo no mesmo payload — é como o operador faz: ele preenche tipo+placa juntos antes de buscar. Vamos incluir `vehicleType: <id>` (e variações) no payload inicial junto com `plts`.

### 2. Tentar múltiplos nomes de campo no `update`, validando com GET
Em vez de assumir 200 = sucesso, vamos:
- Tentar payloads em sequência com chaves diferentes: `vehicleType`, `vehicleTypeId`, `vehicle_type`, `vehicleTypeCode`, `tpVc`, `cdTpVc`, `vehicleCategory`.
- Após cada tentativa, fazer `GET /api/quotation/{code}` e verificar se algum campo da resposta agora reflete o id enviado.
- Parar na primeira chave que persistir e logar qual funcionou — assim descobrimos o nome real e podemos hard-codar.

### 3. Forçar o DENATRAN manualmente após setar o tipo
O CRM tem um endpoint que dispara a consulta DENATRAN/FIPE quando o operador clica na lupa azul. Vamos descobri-lo testando padrões comuns:
- `POST /api/quotation/searchPlate` `{ quotationCode, plate }`
- `POST /api/quotation/denatran` `{ quotationCode }`
- `POST /api/quotation/refreshVehicle` `{ quotationCode }`
- `GET /api/quotation/quotationFipeApi?quotationCode=...&force=true`

Se algum retornar 2xx com dados, usamos esse como gatilho explícito após setar o tipo.

### 4. Aumentar polling adaptativo
- Hoje: 15s total. Subir para 25s com backoff (2s, 2s, 3s, 3s, 4s, 4s, 7s) já que o DENATRAN leva mais tempo quando disparado via API.
- Em cada tentativa, logar o status bruto da cotação para sabermos se o tipo está realmente persistido.

## Arquivos afetados

- `supabase/functions/consulta-placa-crm/index.ts` — toda a lógica acima
- (sem mudanças no front-end, banco ou outras edge functions)

## Detalhes técnicos

```ts
// 1) Enviar tipo já no add
const crmPayload = {
  name, phone, email, registration: cpfDigits,
  plts: plate,
  workVehicle: vehicleType === "caminhao",
  vehicleType: vehicleTypeId,        // tentativa principal
  vehicleTypeId,                     // fallback de chave
};

// 2) Validar update com GET
async function setVehicleTypeWithVerify(token, code, typeId, workVehicle) {
  const keys = ["vehicleType","vehicleTypeId","vehicle_type","tpVc","cdTpVc","vehicleCategory"];
  for (const key of keys) {
    await fetch(".../quotation/update", { ...body: { code, [key]: typeId, workVehicle } });
    const got = await fetch(`.../quotation/${code}`).then(r=>r.json());
    if (Object.values(got).some(v => String(v) === String(typeId))) {
      console.log("✅ Tipo persistiu via chave:", key);
      return key;
    }
  }
  return null;
}

// 3) Disparar DENATRAN
const triggerEndpoints = [
  ["POST", "/quotation/searchPlate", { quotationCode, plate }],
  ["POST", "/quotation/denatran",    { quotationCode }],
  ["POST", "/quotation/refreshVehicle", { quotationCode }],
];
// tenta em ordem; primeira 2xx com payload válido vence
```

Todos os retornos serão logados em detalhe, então depois da primeira cotação real de teste já saberemos exatamente quais chaves/endpoints funcionam, e podemos remover as tentativas que não servem.

## Resultado esperado

Após uma cotação real, no card do CRM o campo "Tipo de veículo" virá pré-preenchido (ex: "Moto") e os blocos "INFORMAÇÕES DENATRAN" + Marca/Modelo/Ano aparecerão **sem o operador clicar na lupa**, e o app preencherá os campos do passo 2 automaticamente.