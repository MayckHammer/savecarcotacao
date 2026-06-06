
# Atendentes personalizados via slug na URL

Hoje o número de WhatsApp `5534998679585` está fixo no código (em `WhatsAppButton.tsx`, `PlansFromCrm.tsx`, `Inspection.tsx`, etc). Vamos transformar isso em uma lista de atendentes gerenciável pelo admin, acessível via link `https://savecarcotacao.com/<slug>`.

## O que vai mudar para o usuário final

- Acesso via `/josi` (ou qualquer slug cadastrado) abre a landing normal, mas todo botão de WhatsApp do site passa a chamar o número da Josi.
- O atendente fica "grudado" na sessão: planos, vistoria, negociação, suporte — tudo vai pro WhatsApp dela até o usuário fechar o navegador.
- Quem entrar pelo link puro `savecarcotacao.com` continua caindo no número padrão atual.

## O que vai mudar no admin

Nova aba "Atendentes" em `/admin` com:
- Lista dos atendentes cadastrados (slug, nome, telefone, ativo, criado em).
- Botão "Adicionar" → formulário com nome, slug (ex.: `josi`) e telefone (ex.: `34992621339`).
- Editar/desativar/excluir cada um.
- Contador de leads originados por atendente (lendo do audit log).

Inicialmente cadastro só a **Josi → 34992621339**.

## Rastreio no CRM

- O slug do atendente entra como tag/observação no payload enviado ao Power CRM (campo neutro, sem expor dado sensível).
- Cada lead gravado em `quotes` guarda o slug do atendente.
- Cada evento no `quotes_audit_log` recebe `attendant_slug` em `details`, permitindo filtrar no painel de auditoria.

---

## Detalhes técnicos

### Backend
1. **Nova tabela `public.attendants`**
   - Campos: `id`, `slug` (unique, citext lowercase), `name`, `phone` (somente dígitos), `active` (bool default true), `created_at`, `updated_at`.
   - RLS: nega tudo para `anon`/`authenticated`; `service_role` total. Leitura pública vai por edge function que devolve só `{slug, name, phone}` dos ativos.
   - GRANT padrão (authenticated CRUD + service_role ALL), seguindo a regra do projeto.

2. **Coluna nova em `quotes`**: `attendant_slug TEXT NULL` para rastreio.

3. **Edge functions novas (verify_jwt=false por padrão Lovable)**
   - `get-attendant` — `GET ?slug=josi` → `{slug, name, phone}` ou 404. Usada pelo frontend para resolver o slug da URL.
   - `admin-attendants` — `POST` autenticado por `ADMIN_PASSWORD`, ações: `list`, `create`, `update`, `delete`. Loga em `quotes_audit_log`.

4. **Funções existentes ajustadas**
   - `submit-to-crm`: aceita `attendant_slug` no body, grava em `quotes.attendant_slug` e adiciona tag/obs no payload Power CRM (ex.: tag `atendente:josi`).
   - Audit logger compartilhado: aceita `attendant_slug` nos `details`.

### Frontend
1. **Roteamento** (`src/App.tsx`)
   - Nova rota dinâmica `"/:attendantSlug"` que renderiza a `Landing` quando o slug existir (resolve via `get-attendant`). Se não existir, cai no `NotFound`.
   - Rotas reservadas (`admin`, `cotacao`, `planos`, `vistoria`, `pagamento`, `aguardando`, `confirmacao`, etc.) são checadas antes do match dinâmico para não conflitar.

2. **`AttendantContext`** (novo)
   - Estado: `{slug, name, phone}` ou `null` (padrão).
   - Persiste em `localStorage` (`savecar_attendant`) por sessão.
   - Quando o usuário entra por `/josi`, o contexto carrega via edge function e fica salvo.
   - Hook `useWhatsAppNumber()` devolve o número do atendente atual ou o padrão `5534998679585`.

3. **Componentes que usam WhatsApp** trocam o número hardcoded por `useWhatsAppNumber()`:
   - `WhatsAppButton.tsx`
   - `PlansFromCrm.tsx` (constante `WHATSAPP`)
   - `Inspection.tsx` (texto de suporte)
   - Qualquer outro `wa.me/5534998679585` no projeto

4. **`CrmQuoteForm.tsx`** passa `attendant_slug` para `submit-to-crm`.

5. **Admin** (`src/pages/Admin.tsx`): nova aba "Atendentes" com CRUD chamando `admin-attendants`.

### Diagrama do fluxo

```text
URL /josi
   │
   ▼
get-attendant(slug)  ──►  AttendantContext (localStorage)
   │
   ▼
Landing  ─►  Cotação  ─►  Planos  ─►  Vistoria
                                          │
   Todos esses passos usam useWhatsAppNumber() ──► número da Josi
                                          │
   submit-to-crm recebe attendant_slug ──► quotes.attendant_slug
                                       └─► tag "atendente:josi" no Power CRM
                                       └─► audit log details.attendant_slug
```

## Fora do escopo (posso fazer depois se quiser)
- Relatório/dashboard de conversão por atendente.
- Distribuição automática round-robin quando o usuário entra sem slug.
- Foto/avatar do atendente exibido em algum lugar do site.

Confirma que posso seguir nesse formato?
