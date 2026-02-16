

# Corrigir envio de nome e telefone no card do Power CRM

## Problema

Os screenshots mostram que o card no CRM aparece com "Null" no nome e todos os campos do Associado vazios (Nome Completo, CPF/CNPJ, Telefone, E-mail). O campo de observacoes internas funciona corretamente.

Isso indica que os campos `pwrClntNm` e `pwrCltPhn` estao sendo enviados mas nao estao populando corretamente o card e a ficha do associado.

## Solucao

Atualizar a edge function `submit-to-crm` para enviar campos adicionais que o formulario do Power CRM aceita. Baseado na estrutura do formulario e na aba "Associado" do CRM, vamos adicionar:

- `pwrClntCpf` - CPF do cliente (campo visivel na aba Associado)
- `pwrClntEml` - Email do cliente
- `pwrClntPhn2` - Telefone secundario (opcional)

Alem disso, vamos incluir nome e telefone tambem no campo `observation` como fallback, garantindo que o vendedor tenha acesso a todas as informacoes mesmo que os campos do associado nao populem automaticamente.

## Alteracao tecnica

**Arquivo**: `supabase/functions/submit-to-crm/index.ts`

Mudancas no payload do CRM:

1. Adicionar `pwrClntCpf` com o CPF (somente digitos)
2. Adicionar `pwrClntEml` com o email
3. Garantir que o telefone esteja no formato correto (com DDD, somente digitos)
4. Incluir nome, telefone, CPF e email no campo `observation` como informacoes complementares

O observation passara a conter:

```text
Marca: Ford
Modelo: Fusion SEL 2.3 16V 162cv Aut.
Ano: 2007 Gasolina
Cor: N/A
Valor FIPE: R$ 28.152,00
Uso: particular
CPF: 084.904.246-16
Email: email@exemplo.com
Endereco: Rua X, 123 - Bairro, Cidade/UF
CEP: 38400-639
Plano: Mensal
Valor: R$ 269.70
Coberturas: Furto e Roubo, Assistencia 24h + Carro reserva
```

## Resultado esperado

Apos a mudanca, novos cards no CRM devem mostrar:
- Nome do cliente no titulo do card (em vez de "Null")
- Telefone e CPF populados na ficha do associado
- Todas as informacoes detalhadas nas observacoes internas

