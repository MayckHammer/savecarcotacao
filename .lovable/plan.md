Diagnóstico

Sim, a ideia faz sentido: o caminho correto é a API reproduzir o que o operador faz no CRM: clicar na lupa da placa, preencher/confirmar modelo/cidade e clicar em Salvar no card. O problema é que hoje o app tenta fazer isso, mas fica preso em dois pontos:

1. A cidade está preenchida no card do CRM, mas o endpoint de planos continua dizendo “faltando: cidade” porque a nossa leitura de validação depende de `GET /api/quotation/{code}`, que está retornando 500 para essas cotações. Ou seja: o diagnóstico atual está olhando para um endpoint quebrado/instável e conclui “sem cidade”, mesmo com cidade visível no CRM.
2. O endpoint interno que replica o botão Salvar (`/company/updateQuotationVehicleData`) exige `quotationId` numérico. A criação da cotação está retornando somente `quotationCode` alfanumérico e `negotiationCode`; quando não conseguimos descobrir o ID numérico, esse “Salvar real” não roda. O fallback `/api/quotation/update` salva parte dos campos visíveis, mas não necessariamente dispara/persiste tudo que o cálculo de planos precisa.
3. No `get-crm-plans`, existe uma falha lógica: ele resolve cidade pelo endereço, mas adiciona “cidade” na lista de faltantes antes da auto-cura. Como `cityId` local já existe, a mensagem “faltando: cidade” está errada para esse caso. O problema real depois disso é: planos não vieram porque o CRM ainda não conseguiu calcular FIPE/plano, não porque o usuário deixou cidade vazia.
4. As observações que aparecem no card estão vindo do `submit-to-crm` no momento de continuar para aguardando. “VALOR CRM: A definir” aparece porque o Power CRM não retornou plano/preço real; o app não deveria gravar “PLANO CRM: COMPLETO” como se fosse confirmado quando não há `crmPlans` reais.

Plano de correção

1. Corrigir `get-crm-plans` para não acusar cidade faltando quando o endereço local resolve um `cityId`
   - Resolver cidade antes de montar a lista `missing`.
   - Usar o `cityId` local como válido para o fallback `/api/plans/`.
   - Se a cotação no CRM não puder ser lida por `GET /quotation/{code}`, não retornar “faltando cidade” automaticamente.
   - Trocar o aviso por algo mais correto, por exemplo: “CRM ainda não retornou planos para esta cotação” quando cidade/modelo/ano existem no contexto local.

2. Reforçar a criação/atualização da cotação já com os campos que o CRM precisa
   - Ao criar a cotação em `consulta-placa-crm`, se já houver endereço/modelo em chamadas posteriores, enviar também os campos oficiais do Swagger: `city`, `mdl`, `mdlYr`, `carModel`, `carModelYear`, `addressZipcode`, `addressAddress`, `addressNumber`, `addressNeighborhood`, `protectedValue`, `workVehicle`.
   - No fluxo de modelo confirmado/endereço preenchido, atualizar com os aliases oficiais (`mdl`/`mdlYr` e `carModel`/`carModelYear`) para aumentar a chance do Power CRM aceitar os dados para planos.
   - Manter o “reforço de cidade”, mas sem depender da leitura quebrada do card.

3. Criar fallback real de planos por contexto local
   - Quando `plansQuotation` retornar 404/“Nenhum plano” e `GET /quotation/{code}` retornar 500, chamar `/api/plans/` usando os dados que o frontend já enviou:
     - `vehicle.crmModelId`
     - `vehicle.crmYearId`
     - `cityId` resolvido de `address.state/address.city`
     - `vehicle.fipeValue`
     - `workVehicle`
   - Isso evita bloquear o usuário quando o card visual do CRM está preenchido, mas o endpoint de cotação está quebrado.

4. Ajustar a simulação da “lupa” e do “Salvar”
   - Manter a chamada da lupa (`pltVrfyQttn`) como enriquecimento, mas tratar retorno HTML como “não útil” e não como sucesso.
   - Quando não houver `quotationId` numérico, não ficar tentando indefinidamente `updateQuotationVehicleData`; usar o caminho oficial `/api/quotation/update` + `/api/quotation/quotationFipeApi` + `/api/plans/` por contexto local.
   - Se conseguirmos o `quotationId`, continuar chamando `updateQuotationVehicleData` como caminho preferencial.

5. Corrigir as observações do card para não afirmar preço/plano CRM inexistente
   - Em `PlanDetails`, se `crmPlans` estiver vazio, o botão Continuar ainda pode seguir, mas o envio para o CRM deve registrar:
     - “PLANO SELECIONADO: COMPLETO/PREMIUM”
     - “PLANO CRM: Aguardando retorno do CRM” ou “Não retornado”
     - “VALOR CRM: A definir”
   - Só escrever “PLANO CRM: COMPLETO” e preço real quando `get-crm-plans` retornar um plano real com valor.

6. Melhorar a tela para refletir a causa real
   - Trocar o alerta “Cotação incompleta no CRM (faltando: cidade)” quando cidade está no contexto por uma mensagem menos enganosa: “Cidade preenchida; aguardando cálculo/planos do CRM”.
   - Se houver modelo, ano, FIPE e cidade no contexto local, mostrar isso como diagnóstico interno amigável em vez de apontar campo faltante.

Arquivos a alterar

- `supabase/functions/get-crm-plans/index.ts`
- `supabase/functions/consulta-placa-crm/index.ts`
- `supabase/functions/submit-to-crm/index.ts`
- `src/pages/PlanDetails.tsx`
- possivelmente `src/pages/Quote.tsx` apenas para garantir que `address`, `crmModelId`, `crmYearId`, `fipeValue` e `crmNegotiationCode` sempre sejam enviados nas chamadas de confirmação.

Resultado esperado

- A cidade preenchida no CRM não será mais reportada falsamente como ausente.
- O app tentará o fluxo equivalente à lupa + salvar quando o CRM permitir.
- Quando o CRM não devolver o ID numérico do card, o app terá um fallback oficial por contexto local para buscar planos.
- As observações do CRM não vão mais indicar “PLANO CRM: COMPLETO” como confirmado sem preço real.
- O usuário não ficará preso por um erro de diagnóstico incorreto enquanto o card visual já está com cidade/modelo preenchidos.