## Diagnóstico

O erro continua porque a automação anterior tentou endpoints que não existem para a ação da lupa no Power CRM:

```text
/quotation/getPlate       -> 405
/quotation/plateConsult   -> 405
/quotation/consultPlate   -> 405
```

Na documentação local do CRM, os endpoints válidos para este caso são:

```text
GET  /api/quotation/plates/{plate}              Consulta placa/DETRAN
GET  /api/quotation/quotationFipeApi?quotationCode=...  Dispara/consulta FIPE da cotação
POST /api/quotation/update                      Atualiza cotação
GET  /api/quotation/{quotationCode}             Confere cotação
```

Também identifiquei outro problema: as opções de modelo no app estão sendo montadas com o mesmo código/valor FIPE retornado pela placa (`011117-1 / R$ 38.412,00`). Por isso, quando o usuário escolhe `AIRCROSS Live 1.5`, o app continua exibindo o valor antigo, e o CRM recebe dados inconsistentes.

## Plano de correção

### 1. Parar de usar endpoints inválidos para a lupa

Remover a tentativa de chamar:

```text
/quotation/getPlate
/quotation/plateConsult
/quotation/consultPlate
```

Substituir por uma rotina compatível com a API documentada:

1. Atualiza placa/modelo/ano na cotação via `/quotation/update`.
2. Chama `/quotation/quotationFipeApi?quotationCode=...` para forçar a rotina FIPE interna da cotação.
3. Reconsulta `/quotation/{quotationCode}` com polling para confirmar persistência.
4. Se o CRM ainda não preencher, aplica novo `/quotation/update` apenas com `protectedValue` e campos oficiais aceitos.

### 2. Buscar a FIPE correta do modelo selecionado, sem reaproveitar o valor antigo

No `consulta-placa-crm`:

- Ao montar `modelOptions`, não copiar cegamente o `fipeCode/fipeValue` da placa para todas as opções.
- Para cada opção candidata do CRM, tentar resolver o código/valor FIPE do par `crmModelId + crmYearId`.
- Como o swagger não documenta um endpoint `cmf`, vou implementar uma rotina de fallback robusta:
  - usar dados do CRM quando vierem em campos como `back`, `text`, `cdFp`, `codFipe`;
  - se o CRM não trouxer o código, buscar na API FIPE por marca/modelo/ano com matching por nome;
  - retornar cada opção com seu próprio `fipeCode`, `fipeValue` e `fipeFormatted`.

### 3. Corrigir envio para o card do CRM

No update da cotação, manter apenas os campos aceitos/documentados como base e reforçar aliases que já são usados pelo CRM:

```text
code
plates / plts
mdl / carModel
mdlYr / carModelYear
fabricationYear
protectedValue
```

E continuar enviando aliases de FIPE quando úteis (`vhclFipeVl`, `vlFipe`, `fipeValue`, `cdFp`, `codFipe`), mas a verificação principal deve considerar que `protectedValue` é o campo documentado e pode ser a fonte para cálculo/plano.

### 4. Corrigir o aviso de “valores estimados” na tela Resultado

No `get-crm-plans`:

- Melhorar o diagnóstico quando `/quotation/{code}` ainda não estiver disponível imediatamente, aguardando/repetindo antes de retornar “Não foi possível conferir a cotação no CRM”.
- Na tela `/resultado`, só mostrar o aviso amarelo de valores estimados quando realmente não houver planos do CRM após as tentativas.
- Se houver FIPE oficial no app mas o CRM demorar, mostrar mensagem mais precisa: “Aguardando confirmação do CRM” durante o carregamento, em vez de cair cedo em estimado.

### 5. Verificação final com logs

Após implementar:

- Deploy das funções alteradas.
- Teste da função com uma placa real e modelo selecionado.
- Conferência dos logs para confirmar:
  - nenhum 405 da falsa lupa;
  - FIPE recalculada para o modelo selecionado;
  - `/quotation/quotationFipeApi` chamado;
  - cotação retornando valor FIPE/protectedValue maior que zero;
  - `/get-crm-plans` não retornando aviso indevido quando a cotação estiver completa.

## Arquivos a alterar

- `supabase/functions/consulta-placa-crm/index.ts`
- `supabase/functions/get-crm-plans/index.ts`
- `src/pages/Quote.tsx`
- `src/pages/Result.tsx`