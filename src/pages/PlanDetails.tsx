import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
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
  ArrowRight,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import WhatsAppButton from "@/components/WhatsAppButton";
import PaymentMethodSelector from "@/components/PaymentMethodSelector";
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
  const navigate = useNavigate();
  const { quote, crmPlans, setPlanName, setCrmPlans, getTotal } = useQuote();
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [continuing, setContinuing] = useState(false);

  const chips = quote.planName === "PREMIUM" ? CHIPS_PREMIUM : CHIPS_COMPLETO;

  const handleContinue = async () => {
    setContinuing(true);
    try {
      const selectedPlan = crmPlans.find((p) =>
        p.name?.toUpperCase().includes(quote.planName)
      );
      await supabase.functions.invoke("submit-to-crm", {
        body: {
          personal: quote.personal,
          vehicle: quote.vehicle,
          address: quote.address,
          plan: {
            planName: quote.planName,
            paymentMethod: quote.paymentMethod,
            billingPeriod: quote.billingPeriod,
            total: getTotal(),
            coverages: selectedPlan?.coverages || [],
          },
          skipCrm: true,
          crmQuotationCode: quote.crmQuotationCode,
          crmNegotiationCode: quote.crmNegotiationCode,
        },
      });
    } catch (err) {
      console.error("Error syncing plan to CRM:", err);
    } finally {
      setContinuing(false);
      navigate("/aguardando");
    }
  };

  // Fetch CRM plans on mount (silently — keeps prices in context for downstream use).
  // Pulamos se o Quote.tsx já trouxe os planos via consulta-placa-crm (caminho rápido).
  useEffect(() => {
    if (crmPlans.length > 0) {
      setLoadingPlans(false);
      return;
    }
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
        </motion.div>

        {/* Pretensão de pagamento */}
        <motion.div variants={item}>
          <PaymentMethodSelector />
        </motion.div>

        {/* Continuar */}
        <motion.div variants={item} className="pt-2">
          <Button
            onClick={handleContinue}
            disabled={continuing}
            className="w-full h-13 rounded-xl font-bold text-base"
          >
            {continuing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                Continuar
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </motion.div>
      </motion.div>

      <WhatsAppButton />
    </div>
  );
};

export default PlanDetails;
