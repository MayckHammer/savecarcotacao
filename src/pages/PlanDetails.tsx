import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Tag,
  ChevronDown,
  ChevronUp,
  Shield,
  Star,
  Car,
  CheckCircle2,
  Wrench,
  KeyRound,
  Fuel,
  Hotel,
  PhoneCall,
  Truck,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import WhatsAppButton from "@/components/WhatsAppButton";
import PaymentMethodSelector from "@/components/PaymentMethodSelector";
import CarMiniGame from "@/components/CarMiniGame";
import { useQuote, PlanName } from "@/contexts/QuoteContext";
import { supabase } from "@/integrations/supabase/client";

interface CoverageChip {
  icon: typeof Shield;
  label: string;
}

const CHIPS_COMPLETO: CoverageChip[] = [
  { icon: Shield, label: "Colisão 100% FIPE" },
  { icon: Car, label: "Roubo & Furto" },
  { icon: Sparkles, label: "Fenômenos naturais" },
  { icon: Truck, label: "Reboque 300km" },
  { icon: Wrench, label: "Assistência 24h" },
  { icon: KeyRound, label: "Chaveiro auto" },
  { icon: Fuel, label: "Pane seca" },
  { icon: Hotel, label: "Hospedagem" },
  { icon: PhoneCall, label: "Táxi/App" },
  { icon: Tag, label: "Clube de descontos" },
];

const CHIPS_PREMIUM: CoverageChip[] = [
  { icon: Shield, label: "Colisão 100% FIPE" },
  { icon: Car, label: "Roubo & Furto" },
  { icon: Sparkles, label: "Vidros ilimitado" },
  { icon: Shield, label: "RCF R$100 mil" },
  { icon: Truck, label: "Reboque 600km" },
  { icon: Wrench, label: "Assistência 24h" },
  { icon: KeyRound, label: "Chaveiro auto" },
  { icon: Fuel, label: "Pane seca" },
  { icon: Hotel, label: "Hospedagem" },
  { icon: PhoneCall, label: "Táxi/App" },
  { icon: Tag, label: "Clube de descontos" },
  { icon: Sparkles, label: "Funeral Zelo" },
];

const PlanDetails = () => {
  const { quote, setPlanName, setCoupon, setCrmPlans } = useQuote();
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [couponInput, setCouponInput] = useState(quote.coupon);
  const [loadingPlans, setLoadingPlans] = useState(true);

  const chips = quote.planName === "PREMIUM" ? CHIPS_PREMIUM : CHIPS_COMPLETO;

  // Fetch CRM plans on mount (silently — keeps prices in context for downstream use)
  useEffect(() => {
    let cancelled = false;
    const fetchCrmPlans = async () => {
      if (!quote.sessionId) {
        setLoadingPlans(false);
        return;
      }
      try {
        await new Promise((r) => setTimeout(r, 1200));
        if (cancelled) return;

        const { data } = await supabase
          .from("quotes")
          .select("crm_quotation_code")
          .eq("session_id", quote.sessionId)
          .single();

        if (!data?.crm_quotation_code) {
          setLoadingPlans(false);
          return;
        }

        const { data: plansData, error } = await supabase.functions.invoke(
          "get-crm-plans",
          { body: { quotationCode: data.crm_quotation_code } }
        );

        if (cancelled) return;
        if (!error && plansData?.plans?.length > 0) {
          setCrmPlans(plansData.plans);
        }
      } catch (err) {
        console.error("Error fetching CRM plans:", err);
      } finally {
        if (!cancelled) setLoadingPlans(false);
      }
    };
    fetchCrmPlans();
    return () => {
      cancelled = true;
    };
  }, [quote.sessionId, setCrmPlans]);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
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
        {/* User Info Card */}
        <motion.div variants={item}>
          <Card className="border-border">
            <button
              onClick={() => setShowUserInfo(!showUserInfo)}
              className="w-full p-4 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground text-lg">👤</span>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {quote.personal.name || "Associado"}
                </span>
              </div>
              {showUserInfo ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {showUserInfo && (
              <CardContent className="pt-0 pb-4 px-4 space-y-3 border-t border-border">
                <div>
                  <p className="text-xs font-semibold text-primary">Email</p>
                  <p className="text-sm text-foreground">{quote.personal.email}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-primary">Telefone</p>
                  <p className="text-sm text-foreground">{quote.personal.phone}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-primary">CPF ou CNPJ</p>
                  <p className="text-sm text-foreground">{quote.personal.cpf}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-primary">Endereço</p>
                  <p className="text-sm text-foreground">
                    {quote.address.street}, {quote.address.number || "S/N"}
                  </p>
                  <p className="text-sm text-foreground">{quote.address.neighborhood}</p>
                  <p className="text-sm text-foreground">
                    {quote.address.city}, {quote.address.state}
                  </p>
                  <p className="text-sm text-foreground">{quote.address.cep}</p>
                </div>
              </CardContent>
            )}
          </Card>
        </motion.div>

        {/* Vehicle line */}
        <motion.div variants={item} className="flex items-center gap-2">
          <Car className="h-5 w-5 text-foreground" />
          <h2 className="text-lg font-bold text-foreground">Meu plano</h2>
        </motion.div>

        {quote.vehicle.model && (
          <motion.div variants={item} className="flex items-center gap-2 -mt-3">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-primary truncate">
              {quote.vehicle.model}
            </span>
          </motion.div>
        )}

        {/* Plan Selector */}
        <motion.div variants={item} className="grid grid-cols-2 gap-3">
          {(["COMPLETO", "PREMIUM"] as PlanName[]).map((plan) => (
            <button
              key={plan}
              onClick={() => setPlanName(plan)}
              className={`relative rounded-2xl border-2 p-5 text-center transition-all ${
                quote.planName === plan
                  ? "border-primary bg-primary/5 shadow-md scale-[1.02]"
                  : "border-border bg-card hover:border-muted-foreground/30"
              }`}
            >
              {plan === "PREMIUM" && (
                <Star className="absolute top-2 right-2 h-4 w-4 text-primary fill-primary" />
              )}
              <div className="flex flex-col items-center gap-2">
                <Shield
                  className={`h-7 w-7 ${
                    quote.planName === plan ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <span
                  className={`text-sm font-bold ${
                    quote.planName === plan ? "text-primary" : "text-foreground"
                  }`}
                >
                  {plan}
                </span>
              </div>
            </button>
          ))}
        </motion.div>

        {/* Visual coverage chips */}
        <motion.div variants={item}>
          <div className="grid grid-cols-2 gap-2">
            {chips.map((chip, i) => {
              const Icon = chip.icon;
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5"
                >
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-xs font-semibold text-foreground leading-tight">
                    {chip.label}
                  </span>
                </div>
              );
            })}
          </div>
          {loadingPlans && (
            <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Carregando seu plano personalizado...
            </div>
          )}
        </motion.div>

        {/* Pretensão de pagamento */}
        <motion.div variants={item}>
          <PaymentMethodSelector />
        </motion.div>

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

export default PlanDetails;
