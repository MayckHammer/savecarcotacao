import { motion } from "framer-motion";
import { Tag, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import WhatsAppButton from "@/components/WhatsAppButton";
import CarMiniGame from "@/components/CarMiniGame";
import { useQuote } from "@/contexts/QuoteContext";

const Aguardando = () => {
  const { quote, setCoupon } = useQuote();
  const [couponInput, setCouponInput] = useState(quote.coupon);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <Header dark />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex-1 px-4 py-6 space-y-5"
      >
        {/* Thank-you card */}
        <motion.div variants={item}>
          <Card className="border-0 overflow-hidden bg-gradient-to-br from-[#0D5C3E] to-[#0a4a32] text-white shadow-lg">
            <CardContent className="p-5 flex gap-3">
              <div className="h-10 w-10 rounded-full bg-[#F2B705] flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-6 w-6 text-[#0D5C3E]" />
              </div>
              <div>
                <p className="font-bold text-base leading-snug">
                  Obrigado por escolher a SAVE CAR BRASIL!
                </p>
                <p className="text-sm text-white/85 mt-1 leading-snug">
                  Em até 5 minutos um de nossos consultores entrará em contato
                  para finalizar seu cadastro e confirmar o pagamento.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Mini-game */}
        <motion.div variants={item}>
          <CarMiniGame />
        </motion.div>

        {/* Coupon */}
        <motion.div variants={item} className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-bold text-foreground">Adicionar cupom</span>
          </div>
          <div className="flex gap-2">
            <Input
              id="coupon-input"
              placeholder="Código do cupom"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
            />
            <Button
              variant="outline"
              onClick={() => setCoupon(couponInput)}
              className="shrink-0"
            >
              Aplicar
            </Button>
          </div>
        </motion.div>

        {/* Legal */}
        <motion.p
          variants={item}
          className="text-[10px] text-muted-foreground text-center leading-relaxed mt-2"
        >
          A SAVE CAR BRASIL é uma associação de proteção veicular. Não se trata
          de seguro. Os valores e coberturas apresentados são ilustrativos e
          sujeitos à aprovação cadastral.
        </motion.p>
      </motion.div>

      <WhatsAppButton />
    </div>
  );
};

export default Aguardando;
