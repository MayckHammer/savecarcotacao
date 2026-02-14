

# SAVE CAR BRASIL — App de Cotação e Proteção Veicular

## Visão Geral
Aplicativo mobile-first onde o associado faz cotação e contratação de proteção veicular de forma autônoma, seguindo o fluxo completo: Landing → Cotação (3 etapas) → Resultado → Detalhes/Coberturas → Pagamento.

**Cores da marca:** Verde escuro (#0D5C3E) e Amarelo/Dourado (#F2B705)
**Logo:** SAVE CAR BRASIL (será incorporada ao projeto)

---

## Tela 1 – Landing Page
- Logo da SAVE CAR BRASIL centralizada no topo
- Botão principal em verde escuro: **"Cotação em menos de 30 segundos"**
- Links de suporte: Dúvidas, Atendimento WhatsApp, Redes sociais
- Visual limpo com fundo claro e detalhes na cor da marca

## Tela 2 – Fluxo de Cotação (3 etapas com indicador de progresso)
Barra de progresso no topo com as 3 etapas, usando as cores verde/amarelo da marca.

### Etapa 01 – Seus Dados
- Campos: Nome completo, E-mail, Telefone (máscara), CPF (máscara + validação)
- Botão "Avançar →"

### Etapa 02 – Dados do Veículo
- Campo: Placa do veículo (placeholder para busca automática futura)
- Exibição do modelo identificado
- Link "Algum problema com a placa?"
- Dropdowns: Tipo do veículo (Carro, Moto, Pick-up/SUV) e Uso (Particular, Comercial, Aplicativo)
- Botão "Avançar →"

### Etapa 03 – Endereço
- Campo: CEP (com preenchimento automático dos demais campos)
- Campos: Rua, Bairro, Número, Complemento, Estado, Cidade
- Checkbox: "Não tenho número"
- Botão "Avançar →"

## Tela 3 – Resultado da Cotação
- Header com fundo verde escuro + logo SAVE CAR BRASIL
- Saudação personalizada: "Olá, [Nome]!"
- Faixa de valor do veículo e valor mensal da proteção (placeholder)
- Taxa única de ativação (placeholder)
- Botões: "Continuar" e "Nova cotação"

## Tela 4 – Detalhes do Plano e Coberturas
- Card com resumo do associado (nome, e-mail, telefone, CPF, endereço completo) — expansível
- Seção "Meu plano" com modelo do veículo e placa
- **Coberturas incluídas** (com ícone ✅ verde, accordion expansível):
  - Furto e Roubo
  - Assistência 24h + Carro reserva
- **Coberturas opcionais** (com checkbox + valor adicional, accordion expansível):
  - Colisão + Terceiros + APP (+R$ placeholder/mês)
  - Vidros Completo (+R$ placeholder/mês)
- Detalhes expandidos de cada cobertura com descrição completa
- **Toggle Mensal / Anual** com valores diferentes
- Resumo financeiro: Mensalidade, Taxa de ativação, Subtotal, Total
- Campo "Adicionar cupom" com ícone de tag
- Selo "Compra segura" com ícone de cadeado
- Botão grande "Contratar →" em verde
- Texto legal/regulatório no rodapé
- Botão flutuante do WhatsApp

## Tela 5 – Pagamento
- Header com fundo verde escuro + logo
- Card do associado (nome expansível)
- Título "Pagamento" com ícone
- **Resumo da contratação** com as coberturas selecionadas (checks verdes)
- **Resumo da compra**: Mensalidade, Taxa de ativação, Subtotal, Total
- **Formulário de Cartão de Crédito**:
  - Badge "Cartão de crédito" destacado
  - Número do cartão (com máscara)
  - Data de expiração (MM/AA)
  - CVV (3 dígitos)
  - Nome do titular
- Checkbox de aceite: "Li e concordo com o Contrato de prestação de serviço, Termos de uso e Política de privacidade"
- Botão "Finalizar →"

## Tela 6 – Confirmação (Bônus)
- Mensagem de sucesso após a contratação
- Resumo da proteção contratada
- Botão para voltar ao início

---

## Design e Experiência
- **Mobile-first** — otimizado para telas de celular
- Paleta de cores: Verde escuro (#0D5C3E) como cor principal, Amarelo/Dourado (#F2B705) como cor de destaque
- Botões arredondados, grandes e com seta (→)
- Cards com bordas suaves e sombras leves
- Accordions para detalhes das coberturas
- Indicador de progresso colorido nas etapas de cotação
- Botão flutuante do WhatsApp nas telas de detalhes/pagamento
- Validação de formulários com máscaras (CPF, telefone, CEP, cartão)

## Observações Técnicas
- **Sem backend** — todos os dados ficam em estado local (React state)
- **Coberturas e valores** usarão placeholders — serão customizados depois
- Logo SAVE CAR BRASIL será incorporada como asset do projeto
- Navegação via React Router entre as telas

