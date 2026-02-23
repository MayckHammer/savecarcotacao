
# Corrigir bloqueio no Step 2 apos consultar placa

## Problema

Quando o CRM nao retorna dados do veiculo (marca, modelo, ano sao null), o sistema:
1. Define `plateConsulted = true` (escondendo os campos manuais da FIPE)
2. Nao mostra o card "Veiculo Identificado" (porque marca esta vazia)
3. A validacao falha em "Marca nao identificada" / "Modelo nao identificado"
4. O usuario fica preso -- sem campos visiveis e sem poder avancar

Isso acontece porque o CRM retorna `carModel: null` e `carModelYear: null` na resposta da cotacao.

## Solucao

Duas mudancas:

### 1. Frontend: `src/pages/Quote.tsx`

Na funcao `handleConsultaPlaca`, so definir `plateConsulted = true` se o CRM realmente retornou dados do veiculo (brand e model nao vazios). Caso contrario, manter os campos manuais visiveis:

```typescript
if (data?.vehicle) {
  const v = data.vehicle;
  updateVehicle({
    brand: v.brand || "",
    model: v.model || "",
    year: v.year || "",
    color: v.color || "",
    type: v.type || "carro",
  });
  // So marcar como consultado se o CRM realmente identificou o veiculo
  if (v.brand && v.model) {
    setPlateConsulted(true);
    toast.success("Veiculo identificado com sucesso!");
  } else {
    setPlateConsulted(false);
    toast.info("Veiculo nao identificado pelo CRM. Preencha manualmente.");
  }
}
```

### 2. Edge Function: `supabase/functions/consulta-placa-crm/index.ts`

Melhorar a extracao de dados do veiculo. Os logs mostram que a resposta do CRM tem campos como `plate`, `carModel`, `carModelYear` no nivel raiz. Atualizar os caminhos de leitura:

```typescript
const brand = v?.brand || v?.brandName || v?.marca || qttnData?.carModel || "";
const model = v?.model || v?.modelName || v?.modelo || qttnData?.carModel || "";
const year = v?.year || v?.ano || v?.modelYear || qttnData?.carModelYear || "";
```

Tambem retornar `vehicle: null` quando todos os campos estiverem vazios, para que o frontend trate corretamente.

## Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/Quote.tsx` | So definir `plateConsulted=true` quando brand+model existirem |
| `supabase/functions/consulta-placa-crm/index.ts` | Melhorar extracao de campos + retornar null se vazio |

## Resultado esperado

- Se CRM identificar o veiculo: mostra card com dados, usuario so confirma tipo e uso
- Se CRM NAO identificar: mostra campos manuais FIPE normalmente, usuario preenche
- Em ambos os casos, a cotacao ja foi criada no CRM (tag + inspecao feitas)
- Botao "Avancar" funciona em ambos os cenarios
