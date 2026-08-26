# Cotação em 3 etapas (padrão do site Save Car)

Trazer para o formulário de `/cotacao` da Save Car 30seg o mesmo senso funcional do projeto "Site Save Car": preenchimento dividido em três passos, com barra de progresso e navegação Voltar/Continuar.

## Como fica o fluxo

```text
Passo 1 de 3 — Seus dados
  Nome completo · Telefone (WhatsApp) · E-mail
  Checkbox LGPD  -> [Continuar]

Passo 2 de 3 — Seu veículo
  Tipo do veículo · Placa · Marca · Ano · Modelo
  [Voltar]  [Continuar]

Passo 3 de 3 — Onde você circula
  Estado · Cidade · Veículo de trabalho (Táxi/Uber)
  [Voltar]  [Ver meus planos]
```

Acima do card: "Passo X de 3" com o nome da etapa à direita e uma barra de progresso amarela preenchendo 33% / 66% / 100%, igual ao site Save Car.

## Regras de comportamento

- Validação por etapa: o botão Continuar só avança quando os campos daquele passo estão válidos; se faltar algo, aparece a mensagem de erro apontando os campos pendentes (mesma linguagem de hoje).
- O consentimento LGPD continua obrigatório e passa a ficar no passo 1, junto ao telefone — assim o lead é capturado logo no primeiro avanço.
- A captura de lead atual (debounce no telefone, atualização ao mudar dados, envio ao sair da página) continua funcionando igual, e também dispara ao avançar de cada etapa, com o lead ficando mais completo a cada passo.
- Botão Voltar preserva tudo que já foi preenchido; nenhuma seleção é perdida ao navegar entre etapas.
- O envio final ao CRM e o redirecionamento para `/planos` permanecem exatamente como hoje.
- Link "Problemas? Usar o formulário detalhado" continua visível no rodapé do card.

## Escopo

- Apenas a página `/cotacao` (formulário express). `/cotacao-detalhada` e `/simulacao` ficam como estão.
- Nenhuma mudança no backend, nas Edge Functions ou na integração com o CRM.

## Detalhes técnicos

- `src/components/CrmQuoteForm.tsx`: adicionar estado `step: 1 | 2 | 3`, quebrar o JSX atual em três blocos condicionais, criar `validateStep(step)` reaproveitando as regras de `getValidationErrors`, e trocar o submit único por `handleNext`/`handleBack` + submit final apenas no passo 3.
- Novo subcomponente de progresso (dentro do próprio arquivo ou em `src/components/QuoteStepper.tsx`) com `role="progressbar"` e `aria-valuenow`, usando tokens de marca (verde/amarelo) em vez de cores fixas.
- Transição suave entre etapas com `motion.div` (fade + leve deslocamento), aproveitando o framer-motion já usado no arquivo.
- As cascatas de marca/ano/modelo/estado/cidade e o hook `useLeadCapture` permanecem no componente pai, sem alteração de lógica.
