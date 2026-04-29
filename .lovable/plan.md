## Problema
No mobile, há um espaço vazio grande entre o botão "Fazer Cotação" e o bloco "Dúvidas / WhatsApp / redes sociais". Isso acontece porque o hero usa `flex-1` + `justify-center`, esticando o container e empurrando o CTA para cima do centro vertical, enquanto o resto fica ancorado ao fim da página.

## Solução
Em `src/pages/Landing.tsx`, alterar apenas o container do hero (linha 52) para que ele não estique mais — todo o conteúdo flui de cima pra baixo de forma harmonizada e contínua.

### Mudança
- Linha 52: `className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-6"`
  → `className="relative z-10 flex flex-col items-center px-6 pt-8 pb-4"`

Removemos `flex-1` e `justify-center` (que causavam o vão) e usamos paddings explícitos (`pt-8 pb-4`) para dar respiro consistente entre logo, CTA e a seção de links logo abaixo.

Nenhum outro elemento precisa mudar — espaçamentos internos do hero (mb-3, mb-2, mb-5) e da seção de links (`space-y-2 pb-4`) já estão calibrados.

## Resultado
- Botão CTA fica naturalmente próximo dos cards "Dúvidas" e "WhatsApp".
- Ícones sociais permanecem no rodapé com seu pulse.
- Layout fluido sem o "buraco" visual atual, sem perder espaços confortáveis.
