## Objetivo
Aumentar os ícones sociais do rodapé da Landing e dar a eles as cores nativas das marcas (Instagram com gradiente rosa/laranja/roxo, LinkedIn com azul `#0A66C2`), com um efeito de **pulsar** contínuo em volta de cada ícone.

## Alterações em `src/pages/Landing.tsx` (rodapé social, linhas ~153-174)

Substituir os dois `<motion.a>` atuais por versões maiores e com cor de marca:

- **Container**: `gap-6` (mais espaço entre ícones).
- **Botões**: caixa quadrada arredondada `h-12 w-12 rounded-2xl`, ícone `h-6 w-6` (antes `h-5 w-5`), `strokeWidth={2.2}` para ficar mais nítido.
- **Cores nativas**:
  - Instagram: `linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)` aplicado via `style`.
  - LinkedIn: `bg-[#0A66C2]`.
- **Pulse**: `<span>` absoluto irmão do ícone com `animate-ping opacity-40` na mesma cor de fundo, criando o anel pulsante por trás.
- **Sombra colorida** + leve aumento no hover/tap mantidos via `framer-motion`.
- `aria-label` adicionado em cada link.

### Snippet resultante
```tsx
<div className="flex items-center justify-center gap-6 mb-4">
  {/* Instagram */}
  <motion.a
    whileHover={{ scale: 1.15, rotate: -5 }}
    whileTap={{ scale: 0.9 }}
    href="https://www.instagram.com/savecarbrasil?igsh=dWJjbnVhbGF1MzZz"
    target="_blank" rel="noopener noreferrer"
    aria-label="Instagram Save Car Brasil"
    className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg shadow-pink-500/30 hover:shadow-xl hover:shadow-pink-500/50 transition-shadow"
    style={{ background: "linear-gradient(45deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)" }}
  >
    <span className="absolute inset-0 rounded-2xl animate-ping opacity-40"
          style={{ background: "linear-gradient(45deg,#f09433,#dc2743,#bc1888)" }} aria-hidden />
    <Instagram className="relative h-6 w-6" strokeWidth={2.2} />
  </motion.a>

  {/* LinkedIn */}
  <motion.a
    whileHover={{ scale: 1.15, rotate: 5 }}
    whileTap={{ scale: 0.9 }}
    href="https://www.linkedin.com/company/save-car-brasil/"
    target="_blank" rel="noopener noreferrer"
    aria-label="LinkedIn Save Car Brasil"
    className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A66C2] text-white shadow-lg shadow-[#0A66C2]/30 hover:shadow-xl hover:shadow-[#0A66C2]/50 transition-shadow"
  >
    <span className="absolute inset-0 rounded-2xl bg-[#0A66C2] animate-ping opacity-40" aria-hidden />
    <Linkedin className="relative h-6 w-6" strokeWidth={2.2} />
  </motion.a>
</div>
```

Nota: usamos as cores oficiais das marcas inline (não fazem parte da paleta semântica do app), pois é o uso pretendido pelo usuário e essas cores são padrão de identidade dos serviços externos.
