

# Integrar App com Power CRM e Fluxo de Vistoria

## Resumo

O formulario do Power CRM envia dados via POST JSON para `https://app.powercrm.com.br/svQttnDynmcFrm`. Vamos criar uma funcao backend que replica esse envio com os dados coletados no app, criando automaticamente o card no pipeline do CRM. O link de vistoria (`appvisto.link`) e gerado dentro do CRM, entao o vendedor precisara atualizar o status manualmente ate que tenhamos acesso a API/webhooks.

## Descobertas tecnicas do formulario

O script `script.pwrcrm.js` do Power CRM revela que o formulario:

1. Faz POST para `https://app.powercrm.com.br/svQttnDynmcFrm` com JSON
2. Envia campos hidden fixos do formulario:
   - `companyHash`: "Sav3c4r1Czwe3"
   - `formCode`: "3QgRKwOx"
   - `pipelineColumn`: "1"
   - `funnelStage`: "6834bcae-ecd3-4387-8bc2-dfd03dbaea0c"
3. A resposta retorna `qttnCd` (codigo da cotacao) e `success: true/false`
4. Marca/modelo/ano usam codigos INTERNOS do Power CRM (diferentes da FIPE Parallelum)
5. Estados e cidades tambem usam codigos internos do Power CRM

## Estrategia para os codigos de veiculo

Como os codigos de marca/modelo/ano do Power CRM sao diferentes dos da FIPE, a funcao backend vai:
1. Buscar os codigos de estado/cidade diretamente das APIs do Power CRM (`utilities.powercrm.com.br`)
2. Para o veiculo: enviar nome + telefone + placa + tipo, e colocar os detalhes completos (marca, modelo, ano, valor FIPE) no campo `observation` para o vendedor ter todas as informacoes
3. O CRM internamente pode resolver o veiculo pela placa quando o vendedor processar o card

## Fluxo do usuario

```text
Cotacao (3 passos: dados, veiculo, endereco)
       |
       v
Resultado (preco estimado)
       |
       v
Detalhes do Plano (coberturas)
       |
       v
Botao "Contratar" -> envia dados ao Power CRM via backend
       |
       v
Pagina /vistoria (aguardando aprovacao)
  - Status: Pendente / Liberada / Aprovada / Reprovada
  - Quando liberada: exibe link de vistoria (appvisto.link)
  - Quando aprovada: libera botao para pagamento
       |
       v
Pagamento (so acessivel com vistoria aprovada)
       |
       v
Confirmacao
```

## Implementacao

### 1. Tabela `quotes` no banco de dados

Criar tabela para rastrear cotacoes e status de vistoria:

| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid (PK) | Identificador unico |
| session_id | text, unique | UUID gerado no app para rastrear a sessao |
| crm_quotation_code | text | Codigo retornado pelo Power CRM (qttnCd) |
| crm_submitted | boolean | Se foi enviado com sucesso ao CRM |
| crm_error | text | Mensagem de erro (se houver) |
| inspection_status | text | pending / released / approved / rejected |
| inspection_link | text | Link appvisto.link (preenchido pelo vendedor) |
| personal_data | jsonb | Nome, email, telefone, CPF |
| vehicle_data | jsonb | Placa, marca, modelo, ano, FIPE, tipo, uso |
| address_data | jsonb | CEP, rua, bairro, cidade, estado |
| plan_data | jsonb | Plano, coberturas, valores, periodo |
| created_at | timestamptz | Data de criacao |
| updated_at | timestamptz | Data de atualizacao |

RLS: leitura e criacao publica filtrada por `session_id` (sem autenticacao, pois o app nao tem login).

### 2. Funcao backend `submit-to-crm`

Edge function que:

1. Recebe todos os dados da cotacao do app
2. Gera um `session_id` (UUID)
3. Salva na tabela `quotes`
4. Monta o payload no formato exato do Power CRM:
   - `companyHash`: "Sav3c4r1Czwe3"
   - `formCode`: "3QgRKwOx"
   - `pipelineColumn`: "1"
   - `funnelStage`: "6834bcae-ecd3-4387-8bc2-dfd03dbaea0c"
   - `clientName`: nome completo
   - `clientPhone`: telefone formatado
   - `vehiclePlate`: placa
   - `vehicleType`: 1 (carro), 2 (moto), 3 (caminhao)
   - `observation`: texto com detalhes completos do veiculo e valor FIPE
5. Busca o codigo do estado via `https://utilities.powercrm.com.br/state/stt` e o codigo da cidade via `https://utilities.powercrm.com.br/city/ct?st={stateId}`
6. Envia POST para `https://app.powercrm.com.br/svQttnDynmcFrm`
7. Salva o `qttnCd` da resposta na tabela
8. Retorna `session_id` para o app

Mapeamento de tipo de veiculo:
- `carro` -> 1
- `moto` -> 2
- `caminhao` -> 3

Mapeamento de UF para nome completo (para buscar na API de estados):

```text
AC=Acre, AL=Alagoas, AM=Amazonas, AP=Amapa, BA=Bahia, CE=Ceara,
DF=Distrito Federal, ES=Espirito Santo, GO=Goias, MA=Maranhao,
MG=Minas Gerais, MS=Mato Grosso do Sul, MT=Mato Grosso, PA=Para,
PB=Paraiba, PE=Pernambuco, PI=Piaui, PR=Parana, RJ=Rio de Janeiro,
RN=Rio Grande do Norte, RO=Rondonia, RR=Roraima, RS=Rio Grande do Sul,
SC=Santa Catarina, SE=Sergipe, SP=Sao Paulo, TO=Tocantins
```

### 3. Funcao backend `update-inspection`

Edge function para o vendedor atualizar status de vistoria manualmente:

- Recebe `session_id`, `inspection_status`, `inspection_link` (opcional)
- Atualiza a tabela `quotes`
- Futuramente substituida por webhook do CRM

### 4. Nova pagina `/vistoria` (Inspection.tsx)

Pagina de acompanhamento que o usuario ve apos contratar:

- Mostra status em tempo real com icones e cores:
  - **Pendente**: icone de relogio, texto "Estamos processando sua solicitacao"
  - **Liberada**: icone de camera, botao "Fazer Vistoria" que abre o link appvisto.link
  - **Aprovada**: icone de check verde, botao "Continuar para Pagamento"
  - **Reprovada**: icone de X vermelho, mensagem + botao WhatsApp
- Polling automatico a cada 15 segundos consultando a tabela `quotes` pelo `session_id`
- O `session_id` e armazenado no contexto e no localStorage para persistir entre recarregamentos

### 5. Pagina `/admin` (Admin.tsx)

Painel simples para o vendedor gerenciar vistorias:

- Listagem de cotacoes recebidas com nome, telefone, veiculo, data
- Para cada cotacao: botoes para alterar status (Liberar Vistoria / Aprovar / Reprovar)
- Campo para colar o link de vistoria (appvisto.link)
- Protegida por senha simples (ex: prompt de senha ao acessar)

### 6. Alteracoes em arquivos existentes

**`src/contexts/QuoteContext.tsx`**:
- Adicionar `sessionId: string` ao estado
- Adicionar `setSessionId` ao contexto
- Persistir `sessionId` no localStorage

**`src/pages/PlanDetails.tsx`**:
- Botao "Contratar" agora chama a funcao `submit-to-crm` via Supabase
- Mostra loading durante o envio
- Redireciona para `/vistoria` em vez de `/pagamento`

**`src/pages/Payment.tsx`**:
- Ao montar, verifica se `inspection_status === 'approved'` na tabela `quotes`
- Se nao aprovada, redireciona para `/vistoria`

**`src/App.tsx`**:
- Adicionar rotas `/vistoria` e `/admin`

**`supabase/config.toml`**:
- Registrar `submit-to-crm` e `update-inspection` com `verify_jwt = false`

### 7. Resumo de arquivos

| Arquivo | Acao |
|---|---|
| Migracao SQL | Criar tabela `quotes` com RLS |
| `supabase/functions/submit-to-crm/index.ts` | Nova funcao: salvar + enviar ao Power CRM |
| `supabase/functions/update-inspection/index.ts` | Nova funcao: atualizar status de vistoria |
| `supabase/config.toml` | Registrar novas funcoes |
| `src/pages/Inspection.tsx` | Nova pagina de acompanhamento de vistoria |
| `src/pages/Admin.tsx` | Painel para vendedor gerenciar vistorias |
| `src/pages/PlanDetails.tsx` | Chamar submit-to-crm e redirecionar para /vistoria |
| `src/pages/Payment.tsx` | Verificar vistoria aprovada antes de permitir acesso |
| `src/contexts/QuoteContext.tsx` | Adicionar sessionId com persistencia |
| `src/App.tsx` | Adicionar rotas /vistoria e /admin |

### 8. Consideracoes importantes

- **Sem API key**: O envio usa o endpoint publico do formulario do Power CRM. Se o endpoint bloquear requisicoes do servidor (CORS nao se aplica a server-side, mas pode ter outro tipo de validacao), o plano B e o vendedor copiar os dados da tela `/admin` para o CRM manualmente
- **Codigos de veiculo**: Como os codigos internos do CRM diferem da FIPE, os detalhes completos do veiculo vao no campo `observation` para o vendedor ter toda a informacao
- **Vistoria manual**: O vendedor atualiza o status via `/admin` ate que API/webhook esteja disponivel
- **Seguranca do admin**: Protecao por senha simples; futuramente pode ser migrada para autenticacao completa

