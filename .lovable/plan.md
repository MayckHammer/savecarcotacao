## Diagnóstico definitivo

Os logs + o HTML do CRM revelaram tudo:

1. **Nenhuma das 8 chaves testadas** (`vehicleType`, `vehicleTypeId`, `tpVc`, `cdTpVc`, `vehicleCategory` etc.) persiste no `/quotation/update`. Todas retornam 200 mas o GET seguinte mostra que o valor não foi salvo.
2. **O nome real do campo é `vhclType`** — visível no HTML do print: `<select id="vhclType" class="vehicle_type_select" previousvalue="3">`. Tem todo sentido pelo padrão abreviado do CRM (`plts`, `mdl`, `mdlYr`, `cdFp` etc.).
3. **O endpoint `/quotation/quotationFipeApi` (GET) retorna 502** — provavelmente porque o `vhclType` ainda está vazio (causa raiz), então a chamada falha no upstream do DENATRAN.
4. Os outros endpoints de DENATRAN testados (`searchPlate`, `denatran`, `refreshVehicle`, `consultPlate`, `searchVehicle`) retornaram **405 Method Not Allowed** → não existem em `POST`. Provavelmente o CRM dispara o DENATRAN automaticamente assim que o `vhclType` é setado e a placa já está presente — então não precisamos chamar nada extra, basta deixar o polling rodar.

## Plano de implementação

Refatorar `supabase/functions/consulta-placa-crm/index.ts`:

### 1. Usar a chave correta `vhclType`
Substituir a função `setVehicleTypeWithVerify` (que tentava 8 chaves) por uma versão direta que envia apenas `{ code, vhclType: <id>, workVehicle }` no `POST /quotation/update` e valida via GET.

### 2. Enviar `vhclType` já no `/quotation/add`
Incluir `vhclType: <id>` no payload de criação — assim o tipo já fica setado antes do CRM tentar qualquer lookup interno.

### 3. Remover endpoints que retornam 405
Eliminar a array de 6 endpoints. Manter apenas o `GET /quotation/quotationFipeApi` (que é o que a UI do CRM realmente chama), executado **depois** do `vhclType` ter sido confirmado por GET. Se ainda assim der 502, ignorar — o polling subsequente recupera os dados quando o DENATRAN interno do CRM termina.

### 4. Manter polling estendido
Os 7 ciclos de backoff (~25s total) ficam como rede de segurança — agora com chance real de funcionar porque o `vhclType` finalmente vai persistir.

## Resultado esperado

No próximo teste:
- Card do CRM mostra "Caminhão ou micro-ônibus" / "Moto" / "Carro" pré-selecionado em **Tipo de veículo**.
- Dados Marca/Modelo/Ano aparecem automaticamente via DENATRAN sem clicar na lupa.
- App preenche os campos do passo 2 sozinho.

## Arquivos afetados

- `supabase/functions/consulta-placa-crm/index.ts` (única alteração)