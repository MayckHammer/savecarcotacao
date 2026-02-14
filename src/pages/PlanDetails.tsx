import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Tag, Lock, ChevronDown, ChevronUp, Shield, Car, Wrench, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import Header from "@/components/Header";
import WhatsAppButton from "@/components/WhatsAppButton";
import { useQuote } from "@/contexts/QuoteContext";

const PlanDetails = () => {
  const navigate = useNavigate();
  const { quote, setBillingPeriod, toggleOptionalCoverage, setCoupon, getTotal } = useQuote();
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [couponInput, setCouponInput] = useState(quote.coupon);

  const total = getTotal();
  const price = quote.billingPeriod === "monthly" ? total : total;

  const includedCoverages = [
    { icon: Shield, name: "Furto e Roubo", desc: "Proteção completa contra furto e roubo do veículo, com indenização integral baseada na tabela de referência." },
    { icon: Car, name: "Assistência 24h + Carro reserva", desc: "Assistência 24 horas com guincho, troca de pneus, socorro mecânico e carro reserva por até 7 dias." },
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
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Meu plano</p>
            <p className="text-sm font-bold text-foreground">{quote.vehicle.model || "Veículo não identificado"}</p>
            <p className="text-xs text-muted-foreground">Placa: {quote.vehicle.plate || "—"}</p>
          </CardContent>
        </Card>

        {/* Included Coverages */}
        <div>
          <h3 className="text-sm font-bold text-foreground mb-2">Coberturas incluídas</h3>
          <Accordion type="multiple">
            {includedCoverages.map((cov, i) => (
              <AccordionItem key={i} value={`inc-${i}`} className="border rounded-lg mb-2 px-3">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{cov.name}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-xs text-muted-foreground">{cov.desc}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Optional Coverages */}
        <div>
          <h3 className="text-sm font-bold text-foreground mb-2">Coberturas opcionais</h3>
          <Accordion type="multiple">
            {quote.optionalCoverages.map((cov) => (
              <AccordionItem key={cov.id} value={cov.id} className="border rounded-lg mb-2 px-3">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2 flex-1">
                    <Checkbox
                      checked={cov.selected}
                      onCheckedChange={() => toggleOptionalCoverage(cov.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="text-left">
                      <span className="text-sm font-medium">{cov.name}</span>
                      <span className="text-xs text-accent ml-2 font-semibold">
                        +R$ {(quote.billingPeriod === "monthly" ? cov.monthlyPrice : cov.annualPrice).toFixed(2).replace(".", ",")}/{quote.billingPeriod === "monthly" ? "mês" : "ano"}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-xs text-muted-foreground">{cov.description}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
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

        {/* Financial Summary */}
        <Card className="border-border">
          <CardContent className="p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {quote.billingPeriod === "monthly" ? "Mensalidade" : "Anuidade"}
              </span>
              <span className="font-semibold text-foreground">R$ {price.toFixed(2).replace(".", ",")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxa de ativação</span>
              <span className="font-semibold text-foreground">R$ {quote.activationFee.toFixed(2).replace(".", ",")}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="font-bold text-foreground">Total</span>
              <span className="font-bold text-primary text-lg">
                R$ {(price + quote.activationFee).toFixed(2).replace(".", ",")}
              </span>
            </div>
          </CardContent>
        </Card>

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
        <Button onClick={() => navigate("/pagamento")} className="w-full h-14 rounded-xl font-bold text-base">
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
