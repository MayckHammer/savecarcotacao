

# Corrigir Card no CRM e Atualizar Planos Reais

## Problemas identificados nos prints

1. **Nome "Null"** no card do CRM - os campos `pwrClntNm` e `pwrCltPhn` nao estao populando o card corretamente, possivelmente por nomes de campo incorretos
2. **"Nao definido"** no tipo de protecao - nao estamos enviando o nome do plano (ex: PREMIUM, COMPLETO)
3. **"R$ 0,00"** no valor - nao estamos enviando o campo de valor da cotacao ao CRM
4. **Coberturas desatualizadas** - o app mostra apenas "Furto e Roubo" e "Assistencia 24h" como basico, mas os planos reais (PREMIUM e COMPLETO) tem coberturas muito mais detalhadas

## Solucao

### 1. Reestruturar os planos no app

Substituir o modelo atual (preco base + opcionais) por dois planos reais baseados nos prints:

**COMPLETO** (base):
- Colisao (Ate 100% FIPE)
- Incendio somente por colisao (Ate 100% FIPE)
- Acidentes (Ate 100% FIPE)
- Roubo e Furto (Ate 100% FIPE)
- Fenomenos da Natureza (Ate 100% FIPE)
- Veiculos de leilao/+25 anos: 75% FIPE
- RCF R$ 30.000,00 - Danos materiais
- Clube de vantagens
- Assistencia 24h em Todo Brasil
- Reboque em Casos de Colisao
- Chaveiro Auto
- Mao de obra para troca de pneus
- Auxilio na Falta de Combustivel
- Taxi ou veiculo de Aplicativo
- Retorno a Domicilio em caso de acidente
- Hospedagem Emergencial
- Assistencia 24h 300 km totais (150 ida/150 volta), 1 acionamento a cada 30 dias, limitado a 4 por ano
- Clube de Descontos (CLUBE CERTO)
- Assistencia funeral Zelo (carencia 90 dias)

**PREMIUM** (upgrade):
- Tudo do COMPLETO, mais:
- RCF R$ 100.000,00 (com cota de participacao de R$ 1.000 para danos acima de R$ 50 mil)
- Vidros Totais ilimitado (carencia 30 dias, cota 50% XENON/LED e 20% demais)
- Assistencia 24h 600 km totais (300 ida/300 volta), 1 acionamento a cada 30 dias

### 2. Atualizar QuoteContext

- Adicionar campo `planName` ("COMPLETO" ou "PREMIUM") ao estado
- Adicionar funcao `setPlanName` ao contexto
- Remover optionalCoverages (substituido pela selecao de plano)
- Manter `monthlyPrice` e `annualPrice` como calculados (os precos exatos dependem do valor FIPE, entao mantemos os valores atuais como placeholder)

### 3. Atualizar PlanDetails.tsx

- Mostrar selecao entre COMPLETO e PREMIUM em vez de coberturas opcionais
- Listar todas as coberturas do plano selecionado
- Enviar nome do plano na submissao ao CRM

### 4. Atualizar edge function submit-to-crm

Adicionar campos que podem resolver o nome/valor no card:
- Adicionar `pwrQttnVl` (valor da cotacao) ao payload
- Adicionar nome do plano no observation de forma mais proeminente
- Adicionar log do payload completo antes do envio para debugging
- Testar variantes de nomes de campo para nome/telefone

O observation passara a incluir:
```text
=== PLANO: PREMIUM ===
Valor: R$ 316,08/mes

=== ASSOCIADO ===
Nome: Fulano de Tal
Telefone: (34) 99999-9999
CPF: 084.904.246-16
Email: email@exemplo.com

=== VEICULO ===
Marca: Ford
Modelo: Fusion SEL 2.3 16V 162cv Aut.
Ano: 2007 Gasolina
Placa: ABC1D23
Valor FIPE: R$ 28.152,00
Uso: particular

=== ENDERECO ===
Rua X, 123 - Bairro, Cidade/UF
CEP: 38400-639

=== COBERTURAS ===
Colisao (100% FIPE), Incendio, Acidentes, Roubo e Furto, ...
```

### 5. Arquivos a alterar

| Arquivo | Mudanca |
|---|---|
| `src/contexts/QuoteContext.tsx` | Adicionar `planName`, remover `optionalCoverages`, adicionar lista de coberturas por plano |
| `src/pages/PlanDetails.tsx` | Seletor de plano COMPLETO/PREMIUM com lista completa de coberturas |
| `src/pages/Result.tsx` | Ajustar referencia a precos (remover optionalCoverages) |
| `supabase/functions/submit-to-crm/index.ts` | Enviar nome do plano, valor, melhorar observation, log do payload |

### 6. Detalhes tecnicos

**QuoteContext** - novo campo:
```typescript
planName: "COMPLETO" | "PREMIUM"
```

**Coberturas por plano** - constante exportavel com array de strings de cada cobertura para exibir no PlanDetails e enviar no observation.

**Edge function** - payload adicional:
```typescript
pwrQttnVl: plan.total, // valor numerico
```

E log completo:
```typescript
console.log("CRM payload:", JSON.stringify(crmPayload, null, 2));
```

Isso vai permitir debugar nos logs exatamente o que esta sendo enviado e identificar se algum campo precisa de ajuste de nome.

