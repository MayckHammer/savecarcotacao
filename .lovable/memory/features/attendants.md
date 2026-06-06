---
name: Atendentes personalizados
description: Sistema de atendentes com link slug (/josi) que troca WhatsApp em toda a jornada e rastreia lead no CRM
type: feature
---
- Tabela `public.attendants` (slug único, name, phone digits-only, active). RLS deny-all para clientes; acesso só via edge functions.
- Coluna `quotes.attendant_slug` rastreia origem do lead.
- Edge function pública `get-attendant` (slug → {slug,name,phone}) usada pelo frontend ao montar `/:attendantSlug`.
- Edge function `admin-attendants` (ADMIN_PASSWORD): list/create/update/delete + contagem de leads.
- `AttendantContext` (`src/contexts/AttendantContext.tsx`) persiste atendente em localStorage `savecar_attendant`. Hook `useWhatsAppNumber()` devolve o número do atendente ativo ou o padrão `5534998679585`.
- Rota dinâmica `"/:attendantSlug"` em `App.tsx`. Slugs reservados (admin, planos, vistoria, pagamento, etc.) caem no NotFound antes do match.
- `submit-to-crm` e `pwrcrm-quote` aceitam `attendantSlug` no body; submit-to-crm grava em `quotes.attendant_slug`; pwrcrm-quote loga em `quotes_audit_log` via `log_quote_audit` RPC. Observação enviada ao Power CRM inclui "Atendente: Nome (slug)".
- Primeira atendente seed: josi / 5534992621339.
- Admin (`/admin`) tem aba "Atendentes" com CRUD e botão "Copiar link".
