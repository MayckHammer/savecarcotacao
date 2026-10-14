# Planilha interativa de leads no Admin

Nova aba "Planilha" no painel admin, no visual de uma planilha (como o anexo), com edição direta nas células e salvamento automático.

## Colunas
1. Data do Lead (data)
2. Nome do Lead (texto)
3. Telefone / WhatsApp (texto, máscara)
4. Canal / Origem (lista: Meta Ads, Google Ads, Orgânico, Indicação, WhatsApp, Site, Outro)
5. Campanha / Criativo (texto)
6. Tipo de Veículo (lista: Carro Passeio, Moto / Scooter, Caminhão / VUC, Veículo de App (Uber/99), Outro)
7. Modelo / Ano Veículo (ou placa) (texto)
8. Consultora Responsável (lista com as atendentes cadastradas)
9. Status (lista: Novo, Em contato, Cotação enviada, Fechado, Perdido)
10. Observações (texto)

## Comportamento
- Já vem preenchida com os leads existentes (leads parciais + cotações), sem duplicar o mesmo telefone.
- Clique na célula para editar; listas aparecem como menu suspenso igual ao anexo.
- Salva sozinho ao sair da célula, com indicação "salvo".
- Linha vazia no final para adicionar lead manual; botão para excluir linha.
- Busca, filtro por consultora/status e exportar para Excel (CSV).
- Cabeçalho fixo verde escuro, linhas numeradas, rolagem horizontal no celular.

## Detalhes técnicos
- Nova tabela `lead_sheet` (data_lead, nome, telefone, canal, campanha, tipo_veiculo, modelo_ano, consultora, status, observacoes, origem_ref, timestamps) com RLS bloqueando acesso do cliente e GRANT a service_role.
- Nova função `admin-lead-sheet` (ações list/upsert/delete) validando e-mail permitido + senha admin, como `admin-list-quotes`.
- Importação inicial: na primeira listagem, insere linhas a partir de `partial_leads` e `quotes` ainda não importadas (via `origem_ref`), mapeando nome, telefone, placa/modelo, tipo de veículo, slug da atendente e data. Canal padrão "Site".
- Componente `LeadSheet.tsx` com tabela editável (inputs + Select), debounce de salvamento, adicionado como aba em `Admin.tsx`.
