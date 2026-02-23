

## Correção: CEP não retorna endereço (erro CORS)

### Problema
A chamada direta do frontend para `https://viacep.com.br/ws/{cep}/json/` está falhando com "Failed to fetch" devido a restrições de CORS do navegador. Os logs de rede confirmam esse comportamento.

### Solução
Criar uma função backend que faz a consulta ao ViaCEP e retorna os dados para o frontend, eliminando o problema de CORS.

---

### Etapas

**1. Criar a edge function `consulta-cep`**
- Nova função em `supabase/functions/consulta-cep/index.ts`
- Recebe o CEP no body da requisição
- Faz a chamada para `https://viacep.com.br/ws/{cep}/json/` no servidor (sem CORS)
- Retorna os dados de endereço (logradouro, bairro, cidade, estado)
- Inclui headers CORS para permitir chamadas do frontend

**2. Atualizar `src/pages/Quote.tsx`**
- Alterar a função `fetchCEP` para chamar a edge function via Supabase client em vez de chamar o ViaCEP diretamente
- Usar `supabase.functions.invoke('consulta-cep', { body: { cep } })` 
- Manter a mesma lógica de preenchimento dos campos de endereço

---

### Detalhes Técnicos

A edge function terá a seguinte estrutura:

```text
POST /consulta-cep
Body: { "cep": "38400739" }
Response: { "logradouro": "...", "bairro": "...", "localidade": "...", "uf": "..." }
```

No frontend, a chamada mudará de:
```text
fetch("https://viacep.com.br/ws/{cep}/json/")
```
Para:
```text
supabase.functions.invoke("consulta-cep", { body: { cep: clean } })
```

