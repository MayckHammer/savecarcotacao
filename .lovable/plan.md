## Plano de correção

O teste mostra que o texto está sendo montado corretamente no backend, mas o campo amarelo do card do CRM continua vazio porque o fluxo atual tenta atualizar uma cotação já criada usando o endpoint público de atualização (`quotation/update`). Pela documentação e pelo comportamento observado, esse endpoint aceita `noteContract` (Observações no termo), mas não persiste `noteContractInternal` (Observações internas / campo amarelo).

A correção será salvar o texto do campo amarelo pelo mesmo endpoint usado pelo formulário interno do card do CRM: `company/updateQuotationVehicleData`, que aceita `noteContractInternal`.

## O que será alterado

### 1. `supabase/functions/submit-to-crm/index.ts`

Adicionar um fluxo específico para preencher **Observações internas** quando já existe um card no CRM:

- Montar o texto destacado com:
  - Uso do veículo
  - Plano selecionado
  - Pretensão de pagamento
- Continuar enviando esse texto nos campos atuais de fallback.
- Antes/depois do `quotation/update`, tentar salvar o campo amarelo via `company/updateQuotationVehicleData` com:
  - `quotationId` numérico do card
  - `plates`
  - `noteContractInternal: internalNote`
  - `noteContract` também preenchido como reforço/fallback
  - demais campos mínimos do veículo para não apagar dados existentes

### 2. Resolver o `quotationId` numérico

O endpoint interno do CRM exige o ID numérico do card, não apenas o código alfanumérico da cotação.

Vou implementar uma função auxiliar que tenta obter esse ID por:

1. Resposta da própria cotação, quando disponível.
2. Consulta `GET /quotation/{quotationCode}`.
3. Campos alternativos conhecidos (`id`, `quotationId`, `idQuotation`, `data.id`, etc.).

Se não conseguir o ID numérico, o sistema ainda mantém o envio atual para `noteContract`/observação, mas registrará no log que o campo amarelo não pôde ser salvo por falta do ID interno.

### 3. Reforçar o fluxo de criação antecipada do card

No arquivo `supabase/functions/consulta-placa-crm/index.ts`, o card é criado cedo, ainda sem plano/pagamento. Hoje ele não coloca nada em `noteContractInternal` nesse momento.

Vou ajustar para:

- Não depender da criação inicial para o texto final, pois plano e pagamento só existem depois.
- Garantir que qualquer chamada posterior do `submit-to-crm` consiga atualizar o campo amarelo corretamente.
- Evitar sobrescrever o campo amarelo com string vazia no `updateQuotationVehicleData` usado para salvar dados do veículo.

### 4. Preservar dados existentes do card

Como o endpoint interno do CRM pode receber vários campos do veículo, a atualização será conservadora:

- Não enviar `noteContractInternal: ""` em nenhuma rotina.
- Não apagar modelo, ano, cor, chassi ou valor FIPE.
- Enviar apenas valores disponíveis no fluxo atual.
- Manter `observation` e `noteContract` como fallback, para a equipe também visualizar as informações fora do campo amarelo se o CRM recusar a atualização interna.

## Resultado esperado

Após a correção, quando o cliente escolher o plano e chegar na tela `/aguardando`, o card do CRM deverá exibir no campo amarelo **Observações internas** algo como:

```text
► USO DO VEÍCULO: Particular
► PLANO SELECIONADO: PREMIUM
► PRETENSÃO DE PAGAMENTO: Cartão de Crédito (Adesão + 11x)
```

## Validação

Depois de implementar:

1. Reenviar a função `submit-to-crm` atualizada.
2. Fazer um novo teste de cotação completo.
3. Conferir nos logs que a chamada para salvar `noteContractInternal` foi feita.
4. Confirmar no CRM que o campo amarelo “Observações internas” foi preenchido.

## Arquivos previstos

- `supabase/functions/submit-to-crm/index.ts`
- Possivelmente `supabase/functions/consulta-placa-crm/index.ts` para evitar limpar observações internas no salvamento do veículo.