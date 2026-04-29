Plano para fazer o caminho certo: aplicar um merge seletivo, sem substituir arquivos inteiros por versões parciais, mantendo o app funcional e alinhado ao fluxo manual do CRM.

Objetivo final:

```text
App = janela externa do CRM
Cliente preenche dados
-> app cria/atualiza cotação no CRM
-> CRM calcula FIPE e planos
-> app mostra COMPLETO e PREMIUM com valores reais
-> cliente escolhe plano
-> escolha volta para o campo informativo/observações do CRM
```

## 1. Corrigir `Quote.tsx` sem reescrever o arquivo inteiro

Vou manter a estrutura atual funcional e aplicar apenas os pontos úteis do material enviado.

Alterações planejadas:

- Garantir que não exista JSX quebrado nem `\n` literal dentro do JSX.
- Adicionar validação defensiva antes de consultar placa:
  - nome obrigatório;
  - e-mail válido;
  - telefone válido;
  - CPF válido.
- Se faltar dado pessoal, o botão “Consultar” não chama `consulta-placa-crm`; ele mostra aviso e volta para a etapa 1.
- Quando a consulta da placa retornar múltiplos modelos:
  - não pré-selecionar automaticamente `crmOptions[0]` como modelo confirmado;
  - mostrar aviso para confirmar o modelo exato;
  - bloquear avanço até o usuário selecionar o modelo correto.
- Quando houver apenas um modelo confiável:
  - manter o comportamento automático.
- Manter o fluxo manual para quando o cliente não tiver placa.
- Manter a captura de `crmPlans` quando a edge function retornar planos reais.

## 2. Melhorar o card de veículo identificado

Aplicar a lógica visual sugerida, mas com JSX limpo e compilável.

Comportamento:

- Se houver múltiplos modelos:
  - card em estado de atenção;
  - texto: “Confirme o modelo abaixo”;
  - não exibir o modelo como confirmado antes da escolha;
  - mostrar quantidade de modelos encontrados.
- Depois da confirmação:
  - exibir modelo, ano, FIPE e demais dados normalmente.

## 3. Melhorar o scoring de modelos no `consulta-placa-crm`

Aproveitar da segunda parte enviada:

- `extractSignificantNumbers`;
- `numberMismatchPenalty`;
- penalidade para evitar confundir:
  - 125 com 150;
  - 160 com 180;
  - 1.4 com 1.8;
  - versões numericamente incompatíveis.

Manter do código atual:

- `cmby?cb=&cy=` para buscar modelos por marca + ano;
- fallback para `cm?cb=` se necessário;
- lógica de tokens como `airc`/`aircross`, `tend`/`tendance`;
- lista de opções para o usuário escolher quando não houver certeza.

## 4. Manter e reforçar o fluxo correto do CRM: lupa + salvar + FIPE + planos

Não vou substituir o fluxo atual pelo update simplificado da segunda parte, porque ele remove partes necessárias.

Manteremos:

- `CRM_COMPANY_BASE`;
- `triggerCrmPlateLookup` para reproduzir a lupa real do CRM;
- `saveCrmVehicleData` usando `company/updateQuotationVehicleData`;
- `crmQuotationId` numérico;
- resolução de cidade interna do CRM;
- `triggerCrmFipeCalculation`;
- `fetchCrmPlansInline`.

Ajuste principal:

```text
Só buscar planos depois que a cotação tiver:
- modelo CRM
- ano CRM
- cidade CRM
- endereço
- FIPE/protectedValue calculado/persistido
```

## 5. Corrigir o problema do `city` em `get-crm-plans`

O print está correto: buscar plano sem cidade faz o CRM retornar vazio.

Ajustes planejados:

- `get-crm-plans` continuará aceitando `quotationCode`.
- Também poderá receber contexto auxiliar opcional:
  - `address.city`;
  - `address.state`;
  - `vehicle.crmModelId`;
  - `vehicle.crmYearId`;
  - `vehicle.fipeValue`;
  - `vehicle.type`.
- Se o CRM ainda não tiver cidade/modelo/ano, a função retornará diagnóstico claro em vez de falhar silenciosamente.
- A busca de planos será feita preferencialmente após o step 3, porque só ali temos endereço/cidade.

## 6. Corrigir o step 3: endereço libera os planos

No avanço da etapa de endereço:

- Validar CEP, rua, bairro, número, estado e cidade.
- Chamar `consulta-placa-crm` com:
  - `personal`;
  - `plate`;
  - `vehicleType`;
  - `crmQuotationCode`;
  - `crmQuotationId`;
  - `selectedModel`;
  - `address`.
- A edge function deve:
  - resolver `cityId`;
  - salvar veículo + endereço no CRM;
  - disparar cálculo FIPE oficial;
  - buscar planos reais;
  - retornar `crmPlans`.
- O frontend salva `crmPlans` no contexto antes de navegar para a tela de planos.

## 7. Evitar preço hardcoded como se fosse preço real

Em `PlanDetails.tsx`:

- Se `crmPlans` já estiverem no contexto, usar imediatamente.
- Se não estiverem, chamar `get-crm-plans` com `quotationCode` e contexto auxiliar.
- Se ainda não houver planos reais:
  - mostrar estado de carregamento/aviso controlado;
  - não apresentar preço estimado como se fosse o valor final do CRM.

## 8. Reforçar envio do plano escolhido para o CRM

Em `submit-to-crm`:

- Manter o envio para o campo informativo/observações.
- Garantir que entre no texto:
  - plano escolhido: COMPLETO ou PREMIUM;
  - valor real retornado pelo CRM;
  - forma de pagamento;
  - uso do veículo;
  - FIPE;
  - veículo;
  - endereço.

## 9. Preservar validação e segurança

Como os dados vêm do usuário e são enviados para APIs externas:

- manter Zod nas edge functions;
- validar client-side antes das chamadas;
- não aceitar HTML do usuário;
- manter limites de tamanho nos campos;
- codificar parâmetros de URL com `encodeURIComponent`;
- não logar dados sensíveis além do necessário para diagnóstico.

## Resultado esperado após implementar

- O app compila normalmente.
- O cliente não consegue consultar placa sem dados pessoais válidos.
- O CRM não recebe cotação vazia/incompleta no começo do fluxo.
- Se a placa retornar múltiplos modelos, o usuário precisa confirmar o modelo exato.
- O endereço/cidade é salvo antes de buscar planos.
- O CRM calcula FIPE e planos como no processo manual.
- O app mostra COMPLETO e PREMIUM com valores vindos do CRM.
- O plano escolhido aparece no campo informativo/observações do CRM.

Arquivos a alterar:

- `src/pages/Quote.tsx`
- `src/pages/PlanDetails.tsx`
- `supabase/functions/consulta-placa-crm/index.ts`
- `supabase/functions/get-crm-plans/index.ts`
- `supabase/functions/submit-to-crm/index.ts`