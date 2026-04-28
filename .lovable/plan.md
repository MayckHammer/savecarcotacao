## Objetivo

1. Remover o aviso amarelo "Atenção: divergência FIPE detectada — CRM ainda não persistiu o valor FIPE" que aparece na tela de cotação.
2. Adicionar uma mensagem chamativa no início do mini-game informando que ao chegar a 2000 pontos o cliente ganha um brinde, e exibir destaque ao atingir a marca.
3. Validar visualmente com print do preview.

---

## 1. Remover o toast de divergência FIPE

**Arquivo:** `src/pages/Quote.tsx` (linhas 193–203)

Remover o bloco `if (check && !check.match) { toast.warning(...) }` e manter apenas os toasts de sucesso ("Modelo confirmado e FIPE conferida com sucesso." ou "Modelo confirmado com sucesso."). O cliente não verá mais qualquer aviso de divergência FIPE.

A lógica do backend (`consulta-placa-crm`) continua intacta — só removemos a exibição ao usuário.

---

## 2. Mensagem do brinde no mini-game

**Arquivo:** `src/components/CarMiniGame.tsx`

### 2.1 Banner chamativo no topo (sempre visível)

Logo acima do canvas, adicionar um banner em destaque com gradiente amarelo Loovi (`#F2B705`) e verde (`#0D5C3E`):

> 🎁 **Chegue a 2000 pontos e ganhe um brinde da SAVE CAR!**

Estilo: card pequeno arredondado, ícone `Gift` (lucide-react), texto bold, leve animação `animate-pulse` no ícone para chamar atenção.

### 2.2 Indicador de progresso durante o jogo

No overlay de score (canto superior do canvas), além de "X pts", mostrar uma barra de progresso fina indo até 2000 pts, na cor amarela Loovi. Quando chegar a 2000+, a barra fica verde e aparece um badge "🎁 BRINDE DESBLOQUEADO".

### 2.3 Tela de Game Over com brinde conquistado

No overlay de "Que pena!", se `finalScore >= 2000`:
- Trocar título de "Que pena!" para "Parabéns!"
- Adicionar card amarelo com: "🎁 Você ganhou um brinde! Nosso consultor entrará em contato para combinar a entrega."
- Mantém o botão "Jogar de novo".

Não precisa de backend — é puramente visual/motivacional. O consultor já entra em contato em até 5 minutos pelo fluxo normal.

---

## 3. Validação visual

Após as edições, usar `browser--navigate_to_sandbox` para abrir `/aguardando` e tirar screenshot mostrando:
- Banner do brinde no topo do mini-game
- Barra de progresso até 2000 pts visível ao iniciar o jogo

(O toast de FIPE só aparece no fluxo de cotação após confirmar modelo, então não precisa de print — basta confirmar a remoção no código.)

---

## Arquivos afetados

- `src/pages/Quote.tsx` — remover bloco do toast de divergência FIPE
- `src/components/CarMiniGame.tsx` — banner do brinde, barra de progresso até 2000 pts, mensagem de parabéns no game over
