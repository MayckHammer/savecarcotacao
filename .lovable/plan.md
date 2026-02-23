

# Corrigir tagId da tag "30 Seg" no submit-to-crm

## Resumo

Substituir o envio da tag como string `"30 seg"` pelo `tagId` numerico `23323` no endpoint `add-tag` do Power CRM.

## Mudanca

### Arquivo: `supabase/functions/submit-to-crm/index.ts`

Na chamada ao endpoint `add-tag`, substituir:

```typescript
body: JSON.stringify({
  quotationCode: crmQuotationCode,
  tag: "30 seg",
})
```

Por:

```typescript
body: JSON.stringify({
  quotationCode: crmQuotationCode,
  tagId: 23323,
})
```

## Impacto

- A tag "30 Seg" passara a ser adicionada corretamente nas cotacoes criadas pela aplicacao
- Nenhum outro arquivo precisa ser alterado
- O texto "[TAG: 30 seg]" no campo `observation` continua como referencia visual adicional

