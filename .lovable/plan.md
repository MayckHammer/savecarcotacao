## Plano para corrigir o fluxo CRM

1. **Atualizar os identificadores oficiais do formulário CRM**
   - Trocar os campos ocultos usados na integração para exatamente os dados enviados agora:
     - `companyHash`: `Sav3c4r1Czwe3`
     - `formCode`: `xQDAWXlZ`
     - `pipelineColumn`: `2`
     - `funnelStage`: `3b586660-c63e-4f35-b40c-d8e62260945c`
     - `leadSource`: `23684`
   - Isso deve fazer a cotação cair no mesmo funil/etapa do formulário externo que gerou a página correta do segundo print.

2. **Evitar embed/iframe da página de planos do PowerCRM**
   - O primeiro print mostra que `app.powercrm.com.br` recusou conexão dentro do preview/iframe.
   - Então o app não deve tentar mostrar a página do CRM embutida.
   - O fluxo correto será abrir/redirecionar a aba atual para a URL oficial do CRM, como no segundo print:
     - `https://app.powercrm.com.br/compareTables?h={codigo_da_cotacao}`

3. **Manter a UX/UI personalizada do app na primeira etapa**
   - Continuar usando o formulário nativo do app com visual Loovi/Save Car.
   - Manter os selects dinâmicos de tipo, marca, ano, modelo, estado e cidade usando os dados oficiais do CRM.
   - Não usar o CSS/HTML bruto do CRM na tela, apenas replicar os campos e enviar os mesmos dados.

4. **Ajustar a regra de redirecionamento após envio**
   - Após o CRM retornar `qttnCd`, priorizar sempre a página de comparação de planos:
     - `compareTables?h={qttnCd}`
   - Só usar `redirecTo` se o CRM retornar uma URL explícita e válida para outra página oficial.
   - Isso evita cair em uma tela incorreta/recusada e aproxima o fluxo do teste externo bem-sucedido.

5. **Limpar lógica não usada**
   - Remover ou deixar sem uso a ação antiga de raspagem `plans`, já que os valores serão exibidos pela própria página oficial do CRM.
   - Manter o formulário detalhado antigo como fallback em `/cotacao-detalhada`.

## Resultado esperado

O usuário preenche a cotação dentro do app com a UX/UI personalizada, clica em **Ver meus planos**, a cotação é enviada para o CRM usando os mesmos parâmetros do formulário oficial e a aba atual abre diretamente a tela oficial de planos, como no segundo print, mostrando COMPLETO e PREMIUM com os valores calculados pelo CRM.