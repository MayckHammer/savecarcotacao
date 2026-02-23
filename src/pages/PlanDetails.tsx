import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Tag, Lock, ChevronDown, ChevronUp, Shield, Star, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import WhatsAppButton from "@/components/WhatsAppButton";
import PaymentMethodSelector from "@/components/PaymentMethodSelector";
import FinancialSummary from "@/components/FinancialSummary";
import { useQuote, PLAN_COVERAGES, PlanName } from "@/contexts/QuoteContext";

const PlanDetails = () => {
  const navigate = useNavigate();
  const { quote, setBillingPeriod, setPlanName, setCoupon } = useQuote();
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [couponInput, setCouponInput] = useState(quote.coupon);
  const [expandedCoverage, setExpandedCoverage] = useState<number | null>(null);

  const coverages = PLAN_COVERAGES[quote.planName];

  // Group coverages into categories for accordion display
  const coverageGroups = [
    {
      title: "Furto e Roubo",
      included: true,
      items: coverages.filter(c => c.toLowerCase().includes("roubo") || c.toLowerCase().includes("furto")),
    },
    {
      title: "Assistência 24h + Carro reserva",
      included: true,
      items: coverages.filter(c =>
        c.toLowerCase().includes("assistência") ||
        c.toLowerCase().includes("reboque") ||
        c.toLowerCase().includes("chaveiro") ||
        c.toLowerCase().includes("pneu") ||
        c.toLowerCase().includes("combustível") ||
        c.toLowerCase().includes("táxi") ||
        c.toLowerCase().includes("domicílio") ||
        c.toLowerCase().includes("hospedagem")
      ),
    },
    {
      title: "Colisão + Terceiros + APP",
      included: false,
      price: "R$ 58,00",
      items: coverages.filter(c =>
        c.toLowerCase().includes("colisão") ||
        c.toLowerCase().includes("incêndio") ||
        c.toLowerCase().includes("acidentes") ||
        c.toLowerCase().includes("natureza") ||
        c.toLowerCase().includes("rcf") ||
        c.toLowerCase().includes("leilão") ||
        c.toLowerCase().includes("fenômenos")
      ),
    },
    {
      title: "Vidros Completo",
      included: quote.planName === "PREMIUM",
      price: quote.planName === "PREMIUM" ? undefined : "R$ 35,00",
      items: coverages.filter(c => c.toLowerCase().includes("vidro")),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <Header dark />

      <div className="flex-1 px-4 py-6 space-y-4">
        {/* User Info Card */}
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
            {showUserInfo ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
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

        {/* Meu plano section */}
        <div className="flex items-center gap-2">
          <Car className="h-5 w-5 text-foreground" />
          <h2 className="text-lg font-bold text-foreground">Meu plano</h2>
        </div>

        {/* Vehicle + Plan name */}
        <div className="flex items-center gap-2">
          <Check className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold text-primary">
            {quote.vehicle.model || "Veículo"} — {quote.planName}
          </span>
        </div>

        {/* Plan Selector */}
        <div className="grid grid-cols-2 gap-3">
          {(["COMPLETO", "PREMIUM"] as PlanName[]).map((plan) => (
            <button
              key={plan}
              onClick={() => setPlanName(plan)}
              className={`relative rounded-xl border-2 p-4 text-center transition-all ${
                quote.planName === plan
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-card hover:border-muted-foreground/30"
              }`}
            >
              {plan === "PREMIUM" && (
                <Star className="absolute top-2 right-2 h-4 w-4 text-primary fill-primary" />
              )}
              <div className="flex flex-col items-center gap-1">
                <Shield className={`h-6 w-6 ${quote.planName === plan ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-bold ${quote.planName === plan ? "text-primary" : "text-foreground"}`}>
                  {plan}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Coverage Accordion Items */}
        <div className="space-y-3">
          {coverageGroups.map((group, i) => (
            <Card key={i} className={`border-border ${group.included ? "bg-primary/5" : ""}`}>
              <button
                onClick={() => setExpandedCoverage(expandedCoverage === i ? null : i)}
                className="w-full p-4 flex items-center gap-3"
              >
                <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                  group.included
                    ? "bg-primary text-primary-foreground"
                    : "border-2 border-border bg-card"
                }`}>
                  {group.included && <Check className="h-4 w-4" />}
                </div>
                <div className="flex-1 text-left">
                  <span className="text-sm font-bold text-foreground">{group.title}</span>
                  {group.price && !group.included && (
                    <p className="text-xs text-muted-foreground">+ {group.price} Mês</p>
                  )}
                </div>
                {expandedCoverage === i ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>
              {expandedCoverage === i && group.items.length > 0 && (
                <CardContent className="pt-0 pb-4 px-4 border-t border-border">
                  <div className="space-y-1.5 mt-2">
                    {group.items.map((item, j) => (
                      <p key={j} className="text-xs text-muted-foreground">• {item}</p>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Payment Method Selector */}
        <PaymentMethodSelector />

        {/* Financial Summary (includes billing toggle + price hero) */}
        <FinancialSummary />

        {/* Coupon */}
        <div className="flex items-center gap-2 px-1">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <button
            onClick={() => {
              const el = document.getElementById("coupon-input");
              if (el) el.focus();
            }}
            className="text-sm font-bold text-foreground"
          >
            Adicionar cupom
          </button>
        </div>
        <div className="flex gap-2">
          <Input
            id="coupon-input"
            placeholder="Código do cupom"
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value)}
          />
          <Button variant="outline" onClick={() => setCoupon(couponInput)} className="shrink-0">
            Aplicar
          </Button>
        </div>

        {/* Secure Badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
          <Lock className="h-4 w-4" />
          Compra segura
        </div>

        {/* CTA */}
        <Button
          onClick={() => navigate("/vistoria")}
          className="w-full h-14 rounded-2xl font-bold text-base"
        >
          Contratar
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>

        {/* Legal */}
        <p className="text-[10px] text-muted-foreground text-center leading-relaxed mt-4">
          A SAVE CAR BRASIL é uma associação de proteção veicular. Não se trata de seguro. Os valores e coberturas apresentados são ilustrativos e sujeitos à aprovação cadastral.
        </p>
      </div>

      <WhatsAppButton />
    </div>
  );
};

export default PlanDetails;
