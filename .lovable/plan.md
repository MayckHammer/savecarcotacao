

# Adicionar opção de pagamento via PIX

## O que sera feito
Adicionar uma segunda aba/opcao de pagamento na tela de Pagamento, permitindo ao usuario escolher entre **Cartao de credito** e **PIX**.

## Alteracoes

### Arquivo: `src/pages/Payment.tsx`

1. Adicionar estado `paymentMethod` com valores `"credit"` ou `"pix"`
2. Criar dois botoes/badges selecionaveis lado a lado: "Cartao de credito" e "PIX"
3. Renderizar condicionalmente:
   - Se `paymentMethod === "credit"`: formulario de cartao atual (numero, validade, CVV, nome)
   - Se `paymentMethod === "pix"`: secao com instrucoes de PIX, QR code placeholder e chave PIX copiavel
4. Ajustar validacao do botao "Finalizar": quando PIX, nao exigir campos de cartao
5. Manter o restante da tela igual (resumo, coberturas, termos, etc.)

### Secao PIX incluira:
- Icone de QR Code
- Texto explicativo: "Escaneie o QR Code ou copie a chave PIX"
- QR Code placeholder (imagem ou componente visual)
- Botao "Copiar chave PIX" com feedback visual
- Valor total destacado

