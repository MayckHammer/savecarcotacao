## Objetivo
Fazer o ícone do Instagram no rodapé da Landing apontar para o perfil oficial:
`https://www.instagram.com/savecarbrasil?igsh=dWJjbnVhbGF1MzZz`

## Alteração

**`src/pages/Landing.tsx`** (linha 157) — no `<motion.a>` do ícone Instagram, trocar `href="#"` por:

```tsx
href="https://www.instagram.com/savecarbrasil?igsh=dWJjbnVhbGF1MzZz"
target="_blank"
rel="noopener noreferrer"
```

O link abrirá em nova aba com `rel="noopener noreferrer"` por segurança. O ícone do Facebook permanece inalterado.
