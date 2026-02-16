import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Check, Tag, Lock, ChevronDown, ChevronUp, Shield, Star, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import WhatsAppButton from "@/components/WhatsAppButton";
import PaymentMethodSelector from "@/components/PaymentMethodSelector";
import CardForm from "@/components/CardForm";
import FinancialSummary from "@/components/FinancialSummary";
import { useQuote, PLAN_COVERAGES, PlanName } from "@/contexts/QuoteContext";
import { supabase } from "@/integrations/supabase/client";

const PlanDetails = () => {
  const navigate = useNavigate();
  const { quote, setBillingPeriod, setPlanName, setCoupon, setSessionId, getTotal } = useQuote();
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [couponInput, setCouponInput] = useState(quote.coupon);
  const [submitting, setSubmitting] = useState(false);

  const coverages = PLAN_COVERAGES[quote.planName];

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
            <div>
              <p className="text-sm font-semibold text-foreground">{quote.personal.name || "Associado"}</p>
              <p className="text-xs text-muted-foreground">Dados do associado</p>
            </div>
            {showUserInfo ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {showUserInfo && (
            <CardContent className="pt-0 pb-4 px-4 text-sm space-y-1 text-muted-foreground border-t border-border">
              <p>E-mail: {quote.personal.email}</p>
              <p>Telefone: {quote.personal.phone}</p>
              <p>CPF: {quote.personal.cpf}</p>
              <p>Endereço: {quote.address.street}, {quote.address.number || "S/N"} — {quote.address.neighborhood}, {quote.address.city}/{quote.address.state}</p>
            </CardContent>
          )}
        </Card>

        {/* Vehicle Info */}
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Meu veículo</p>
            <p className="text-sm font-bold text-foreground">{quote.vehicle.model || "Veículo não identificado"}</p>
            <p className="text-xs text-muted-foreground">Placa: {quote.vehicle.plate || "—"}</p>
          </CardContent>
        </Card>

        {/* Plan Selector */}
        <div>
          <h3 className="text-sm font-bold text-foreground mb-2">Escolha seu plano</h3>
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
                  {plan === "PREMIUM" && (
                    <span className="text-[10px] text-muted-foreground">+Vidros +RCF 100k</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Coverages List */}
        <div>
          <h3 className="text-sm font-bold text-foreground mb-2">
            Coberturas — {quote.planName}
          </h3>
          <Card className="border-border">
            <CardContent className="p-4 space-y-2">
              {coverages.map((cov, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-xs text-muted-foreground">{cov}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Billing Toggle */}
        <div className="flex rounded-xl overflow-hidden border border-border">
          <button
            onClick={() => setBillingPeriod("monthly")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              quote.billingPeriod === "monthly" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setBillingPeriod("annual")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              quote.billingPeriod === "annual" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
            }`}
          >
            Anual
          </button>
        </div>

        {/* Payment Method Selector */}
        <PaymentMethodSelector />

        {/* Conditional: Card Form or PIX Info */}
        {quote.paymentMethod === "credit" ? (
          <CardForm />
        ) : (
          <Card className="border-border">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">PIX / Boleto</span>
              </div>
              <p className="text-xs text-muted-foreground">• Adesão paga via PIX</p>
              <p className="text-xs text-muted-foreground">• 11 boletos mensais enviados por e-mail</p>
            </CardContent>
          </Card>
        )}

        {/* Financial Summary */}
        <FinancialSummary />

        {/* Coupon */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Adicionar cupom"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              className="pl-10"
            />
          </div>
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
          onClick={async () => {
            setSubmitting(true);
            try {
              const totalValue = getTotal();
              const { data, error } = await supabase.functions.invoke("submit-to-crm", {
                body: {
                  personal: quote.personal,
                  vehicle: quote.vehicle,
                  address: quote.address,
                  plan: {
                    billingPeriod: quote.billingPeriod,
                    planName: quote.planName,
                    paymentMethod: quote.paymentMethod,
                    total: totalValue,
                    activationFee: quote.activationFee,
                    coverages: PLAN_COVERAGES[quote.planName],
                  },
                },
              });
              if (error) throw error;
              if (data?.session_id) {
                setSessionId(data.session_id);
              }
              navigate("/vistoria");
            } catch (e) {
              console.error("Submit error:", e);
              toast.error("Erro ao enviar cotação. Tente novamente.");
            } finally {
              setSubmitting(false);
            }
          }}
          disabled={submitting}
          className="w-full h-14 rounded-xl font-bold text-base"
        >
          {submitting ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Enviando...
            </>
          ) : (
            <>
              Contratar
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
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
