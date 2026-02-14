import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, CreditCard, Lock, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Header from "@/components/Header";
import WhatsAppButton from "@/components/WhatsAppButton";
import { useQuote } from "@/contexts/QuoteContext";
import { maskCardNumber, maskExpiry, maskCVV } from "@/lib/masks";

const Payment = () => {
  const navigate = useNavigate();
  const { quote, getTotal } = useQuote();
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const total = getTotal();
  const selectedCoverages = [
    "Furto e Roubo",
    "Assistência 24h + Carro reserva",
    ...quote.optionalCoverages.filter((c) => c.selected).map((c) => c.name),
  ];

  const handleFinalize = () => {
    if (!cardNumber || !expiry || !cvv || !cardName || !acceptTerms) return;
    navigate("/confirmacao");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <Header dark />

      <div className="flex-1 px-4 py-6 space-y-4">
        {/* User Info */}
        <Card className="border-border">
          <button
            onClick={() => setShowUserInfo(!showUserInfo)}
            className="w-full p-4 flex items-center justify-between text-left"
          >
            <p className="text-sm font-semibold text-foreground">{quote.personal.name || "Associado"}</p>
            {showUserInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showUserInfo && (
            <CardContent className="pt-0 pb-4 px-4 text-sm text-muted-foreground border-t border-border">
              <p>{quote.personal.email}</p>
              <p>{quote.personal.phone}</p>
            </CardContent>
          )}
        </Card>

        {/* Title */}
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Pagamento</h2>
        </div>

        {/* Coverage Summary */}
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Resumo da contratação</p>
            {selectedCoverages.map((name, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <Check className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground">{name}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Price Summary */}
        <Card className="border-border">
          <CardContent className="p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{quote.billingPeriod === "monthly" ? "Mensalidade" : "Anuidade"}</span>
              <span className="font-semibold">R$ {total.toFixed(2).replace(".", ",")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxa de ativação</span>
              <span className="font-semibold">R$ {quote.activationFee.toFixed(2).replace(".", ",")}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="font-bold">Total</span>
              <span className="font-bold text-primary text-lg">
                R$ {(total + quote.activationFee).toFixed(2).replace(".", ",")}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card Form */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
            <CreditCard className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-primary">Cartão de crédito</span>
          </div>

          <div>
            <Label>Número do cartão</Label>
            <Input
              placeholder="0000 0000 0000 0000"
              value={cardNumber}
              onChange={(e) => setCardNumber(maskCardNumber(e.target.value))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Validade</Label>
              <Input
                placeholder="MM/AA"
                value={expiry}
                onChange={(e) => setExpiry(maskExpiry(e.target.value))}
              />
            </div>
            <div>
              <Label>CVV</Label>
              <Input
                placeholder="000"
                value={cvv}
                onChange={(e) => setCvv(maskCVV(e.target.value))}
              />
            </div>
          </div>
          <div>
            <Label>Nome do titular</Label>
            <Input
              placeholder="Nome como está no cartão"
              value={cardName}
              onChange={(e) => setCardName(e.target.value.toUpperCase())}
            />
          </div>
        </div>

        {/* Terms */}
        <div className="flex items-start gap-3">
          <Checkbox
            checked={acceptTerms}
            onCheckedChange={(v) => setAcceptTerms(!!v)}
            className="mt-0.5"
          />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Li e concordo com o{" "}
            <a href="#" className="text-primary underline">Contrato de prestação de serviço</a>,{" "}
            <a href="#" className="text-primary underline">Termos de uso</a> e{" "}
            <a href="#" className="text-primary underline">Política de privacidade</a>.
          </p>
        </div>

        {/* Secure Badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-4 w-4" />
          Compra segura
        </div>

        {/* CTA */}
        <Button
          onClick={handleFinalize}
          disabled={!acceptTerms || !cardNumber || !expiry || !cvv || !cardName}
          className="w-full h-14 rounded-xl font-bold text-base"
        >
          Finalizar
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>

      <WhatsAppButton />
    </div>
  );
};

export default Payment;
