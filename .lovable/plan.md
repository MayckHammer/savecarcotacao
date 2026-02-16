
# Ajustes na Tela de Resultado e Vistoria

## 1. Remover precos da tela de Resultado (/resultado)

A tela de resultado atualmente mostra "Protecao mensal a partir de R$ 189,90/mes" e "Taxa unica de ativacao R$ 299,90" antes do usuario escolher o plano. Esses valores serao removidos, mantendo apenas a faixa de valor do veiculo (FIPE).

**Arquivo**: `src/pages/Result.tsx`
- Remover o bloco "Protecao mensal a partir de" (linhas 30-36)
- Remover o bloco "Taxa unica de ativacao" (linhas 37-42)
- Manter apenas "Faixa de valor do veiculo" com o valor FIPE

## 2. Adicionar aviso de WhatsApp na tela de Vistoria (/vistoria)

Adicionar um aviso informando que o usuario recebera as informacoes da vistoria no WhatsApp cadastrado durante o preenchimento. O telefone do usuario sera exibido parcialmente mascarado para confirmacao.

**Arquivo**: `src/pages/Inspection.tsx`
- Adicionar um card/aviso abaixo do card de status com icone do WhatsApp e texto:
  "Voce recebera as informacoes da vistoria no WhatsApp (34) 9****-9999"
  (usando o telefone do quote.personal.phone com mascara parcial)

## 3. Trocar icone do botao flutuante do WhatsApp

O botao flutuante atualmente usa o icone generico `MessageCircle` do Lucide. Sera substituido por um SVG real do logo do WhatsApp para ficar mais reconhecivel.

**Arquivo**: `src/components/WhatsAppButton.tsx`
- Substituir o icone `MessageCircle` por um SVG inline do logo oficial do WhatsApp

## Detalhes tecnicos

### Result.tsx - Card simplificado
O card passara a mostrar apenas:
- Faixa de valor do veiculo (valor FIPE)
- Botoes "Continuar" e "Nova cotacao" permanecem iguais

### Inspection.tsx - Aviso WhatsApp
Sera adicionado apos o card de status:
```
<div className="flex items-center gap-3 ...">
  <WhatsAppIcon />
  <p>Voce recebera as informacoes no WhatsApp cadastrado: (34) 9****-9999</p>
</div>
```
O telefone sera mascarado mostrando apenas DDD e ultimos 4 digitos.

### WhatsAppButton.tsx - Icone SVG
O `MessageCircle` sera substituido por um SVG path do logo do WhatsApp, mantendo o mesmo estilo e tamanho do botao.
