## Objetivo
Substituir o ícone do Facebook pelo ícone do LinkedIn no rodapé da Landing e apontar para a página oficial da empresa: `https://www.linkedin.com/company/save-car-brasil/`.

## Alterações em `src/pages/Landing.tsx`

1. **Imports (linha 2)** — trocar `Facebook` por `Linkedin`:
   ```tsx
   import { ArrowRight, HelpCircle, MessageCircle, Instagram, Linkedin, ShieldCheck } from "lucide-react";
   ```

2. **Link social do Facebook (linhas ~162-169)** — substituir pelo link do LinkedIn, abrindo em nova aba:
   ```tsx
   <motion.a
     whileHover={{ scale: 1.2, rotate: 5 }}
     whileTap={{ scale: 0.9 }}
     href="https://www.linkedin.com/company/save-car-brasil/"
     target="_blank"
     rel="noopener noreferrer"
     className="text-muted-foreground hover:text-primary transition-colors"
   >
     <Linkedin className="h-5 w-5" />
   </motion.a>
   ```

O ícone do Instagram permanece inalterado.
