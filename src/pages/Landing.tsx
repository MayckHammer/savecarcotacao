import { useNavigate } from "react-router-dom";
import { ArrowRight, HelpCircle, MessageCircle, Instagram, Linkedin, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-savecar.png";
import bordaSuperior from "@/assets/borda-superior.png";
import bordaMaior from "@/assets/borda-maior.png";

const Landing = () => {
  const navigate = useNavigate();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.05 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none" aria-hidden="true">
        <motion.img
          src={bordaSuperior}
          alt=""
          initial={{ opacity: 0, x: 40, y: -20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="absolute top-0 right-0 w-[60%] max-w-[280px] object-contain"
        />
        <motion.img
          src={bordaMaior}
          alt=""
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
          className="absolute top-[55%] -left-8 w-[110%] max-w-none object-contain"
        />
      </div>

      {/* Hero Section */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-6"
      >
        <motion.img
          variants={item}
          src={logo}
          alt="SAVE CAR BRASIL"
          className="h-40 mb-3 object-contain drop-shadow-sm"
          whileHover={{ scale: 1.03, rotate: -1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        />

        <motion.div
          variants={item}
          className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Proteção 100% confiável
        </motion.div>

        <motion.h1
          variants={item}
          className="text-2xl font-bold text-center text-foreground mb-2 tracking-tight"
        >
          Proteção Veicular <span className="text-primary">de Verdade</span>
        </motion.h1>
        <motion.p
          variants={item}
          className="text-muted-foreground text-center mb-5 max-w-xs leading-relaxed"
        >
          Proteja seu veículo com as melhores coberturas do mercado. Simples, rápido e seguro.
        </motion.p>

        <motion.div variants={item} className="w-full max-w-xs">
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button
              onClick={() => navigate("/cotacao")}
              className="group relative w-full h-12 text-base font-bold rounded-xl shadow-lg shadow-primary/25 overflow-hidden"
              size="lg"
            >
              <span className="relative z-10 flex items-center justify-center">
                Fazer Cotação
                <motion.span
                  className="ml-2 inline-flex"
                  initial={{ x: 0 }}
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                >
                  <ArrowRight className="h-5 w-5" />
                </motion.span>
              </span>
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </Button>
          </motion.div>
        </motion.div>

      </motion.div>

      {/* Links Section */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 px-6 pb-4 space-y-2 max-w-xs mx-auto w-full"
      >
        <motion.a
          variants={item}
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          href="#"
          className="flex items-center gap-3 rounded-xl border border-border bg-card/80 backdrop-blur p-3 text-sm text-foreground hover:bg-muted hover:border-primary/30 transition-colors shadow-sm"
        >
          <HelpCircle className="h-5 w-5 text-primary" />
          Dúvidas sobre a cotação?
        </motion.a>
        <motion.a
          variants={item}
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          href="https://wa.me/5534998679585"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border border-border bg-card/80 backdrop-blur p-3 text-sm text-foreground hover:bg-muted hover:border-primary/30 transition-colors shadow-sm"
        >
          <MessageCircle className="h-5 w-5 text-primary" />
          Atendimento pelo WhatsApp
        </motion.a>
      </motion.div>

      {/* Social + Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="relative z-10 px-6 pb-4 text-center"
      >
        <div className="flex items-center justify-center gap-5 mb-3">
          {/* Instagram com gradiente nativo + pulse */}
          <motion.a
            whileHover={{ scale: 1.15, rotate: -5 }}
            whileTap={{ scale: 0.9 }}
            href="https://www.instagram.com/savecarbrasil?igsh=dWJjbnVhbGF1MzZz"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram Save Car Brasil"
            className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg shadow-pink-500/30 hover:shadow-xl hover:shadow-pink-500/50 transition-shadow"
            style={{
              background:
                "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
            }}
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-2xl animate-ping opacity-40"
              style={{
                background: "linear-gradient(45deg, #f09433, #dc2743, #bc1888)",
              }}
            />
            <Instagram className="relative h-6 w-6" strokeWidth={2.2} />
          </motion.a>

          {/* LinkedIn com azul nativo + pulse */}
          <motion.a
            whileHover={{ scale: 1.15, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            href="https://www.linkedin.com/company/save-car-brasil/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn Save Car Brasil"
            className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A66C2] text-white shadow-lg shadow-[#0A66C2]/30 hover:shadow-xl hover:shadow-[#0A66C2]/50 transition-shadow"
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-2xl bg-[#0A66C2] animate-ping opacity-40"
            />
            <Linkedin className="relative h-6 w-6" strokeWidth={2.2} />
          </motion.a>
        </div>
        <p className="text-xs text-muted-foreground">
          © 2026 SAVE CAR BRASIL. Todos os direitos reservados.
        </p>
      </motion.footer>
    </div>
  );
};

export default Landing;
