import { useNavigate } from "react-router-dom";
import { ArrowRight, HelpCircle, MessageCircle, Instagram, Facebook, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-savecar.png";

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
      <div className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute -top-32 -right-24 h-80 w-80 rounded-full bg-primary/15 blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, ease: "easeOut", delay: 0.2 }}
          className="absolute top-1/3 -left-24 h-72 w-72 rounded-full bg-secondary/20 blur-3xl"
        />
      </div>

      {/* Hero Section */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-1 flex-col items-center justify-center px-6 py-12"
      >
        <motion.img
          variants={item}
          src={logo}
          alt="SAVE CAR BRASIL"
          className="h-44 mb-6 object-contain drop-shadow-sm"
          whileHover={{ scale: 1.03, rotate: -1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        />

        <motion.div
          variants={item}
          className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Proteção 100% confiável
        </motion.div>

        <motion.h1
          variants={item}
          className="text-2xl font-bold text-center text-foreground mb-3 tracking-tight"
        >
          Proteção Veicular <span className="text-primary">de Verdade</span>
        </motion.h1>
        <motion.p
          variants={item}
          className="text-muted-foreground text-center mb-10 max-w-xs leading-relaxed"
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
              className="group relative w-full h-14 text-base font-bold rounded-xl shadow-lg shadow-primary/25 overflow-hidden"
              size="lg"
            >
              <span className="relative z-10 flex items-center justify-center">
                Cotação com Placa
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

        <motion.button
          variants={item}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/simulacao")}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-4 flex items-center gap-1 group"
        >
          Cotação sem placa
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </motion.button>
      </motion.div>

      {/* Links Section */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="px-6 pb-8 space-y-3 max-w-xs mx-auto w-full"
      >
        <motion.a
          variants={item}
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          href="#"
          className="flex items-center gap-3 rounded-xl border border-border bg-card/80 backdrop-blur p-4 text-sm text-foreground hover:bg-muted hover:border-primary/30 transition-colors shadow-sm"
        >
          <HelpCircle className="h-5 w-5 text-primary" />
          Dúvidas sobre a cotação?
        </motion.a>
        <motion.a
          variants={item}
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          href="https://wa.me/5500000000000"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border border-border bg-card/80 backdrop-blur p-4 text-sm text-foreground hover:bg-muted hover:border-primary/30 transition-colors shadow-sm"
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
        className="px-6 pb-6 text-center"
      >
        <div className="flex items-center justify-center gap-4 mb-4">
          <motion.a
            whileHover={{ scale: 1.2, rotate: -5 }}
            whileTap={{ scale: 0.9 }}
            href="#"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <Instagram className="h-5 w-5" />
          </motion.a>
          <motion.a
            whileHover={{ scale: 1.2, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            href="#"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <Facebook className="h-5 w-5" />
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
