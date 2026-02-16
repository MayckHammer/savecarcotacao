import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, CreditCard, Lock, ChevronDown, ChevronUp, QrCode, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Header from "@/components/Header";
import WhatsAppButton from "@/components/WhatsAppButton";
import { useQuote } from "@/contexts/QuoteContext";
import { maskCardNumber, maskExpiry, maskCVV } from "@/lib/masks";
import { supabase } from "@/integrations/supabase/client";

const Payment = () => {
  const navigate = useNavigate();
  const { quote, getTotal } = useQuote();
  const [showUserInfo, setShowUserInfo] = useState(false);

  // Gate: check inspection is approved
  useEffect(() => {
    const sessionId = quote.sessionId || localStorage.getItem("savecar_session_id");
    if (!sessionId) {
      navigate("/");
      return;
    }
    const check = async () => {
      const { data } = await supabase
        .from("quotes")
        .select("inspection_status")
        .eq("session_id", sessionId)
        .single();
      if (!data || data.inspection_status !== "approved") {
        navigate("/vistoria");
      }
    };
    check();
  }, [navigate, quote.sessionId]);
  const [paymentMethod, setPaymentMethod] = useState<"credit" | "pix">("credit");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);

  const pixKey = "savecar@savecar.com.br";

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 3000);
  };

  const total = getTotal();
  const selectedCoverages = [
    "Furto e Roubo",
    "Assistência 24h + Carro reserva",
    ...quote.optionalCoverages.filter((c) => c.selected).map((c) => c.name),
  ];

  const handleFinalize = () => {
    if (!acceptTerms) return;
    if (paymentMethod === "credit" && (!cardNumber || !expiry || !cvv || !cardName)) return;
    navigate("/confirmacao");
  };

  const isFormValid = acceptTerms && (paymentMethod === "pix" || (!!cardNumber && !!expiry && !!cvv && !!cardName));

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

        {/* Payment Method Tabs */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setPaymentMethod("credit")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold border-2 transition-all ${
                paymentMethod === "credit"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground"
              }`}
            >
              <CreditCard className="h-4 w-4" />
              Cartão de crédito
            </button>
            <button
              onClick={() => setPaymentMethod("pix")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold border-2 transition-all ${
                paymentMethod === "pix"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground"
              }`}
            >
              <QrCode className="h-4 w-4" />
              PIX
            </button>
          </div>

          {paymentMethod === "credit" ? (
            <div className="space-y-4">
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
          ) : (
            <Card className="border-border">
              <CardContent className="p-6 space-y-4 flex flex-col items-center text-center">
                <div className="w-48 h-48 bg-muted rounded-xl flex items-center justify-center border-2 border-dashed border-border">
                  <QrCode className="h-24 w-24 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Escaneie o QR Code acima ou copie a chave PIX abaixo
                </p>
                <div className="w-full bg-muted rounded-lg p-3 flex items-center justify-between gap-2">
                  <span className="text-xs text-foreground font-mono truncate">{pixKey}</span>
                  <button
                    onClick={handleCopyPix}
                    className="shrink-0 flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    {pixCopied ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copiar
                      </>
                    )}
                  </button>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Valor total a pagar</p>
                  <p className="text-2xl font-bold text-primary">
                    R$ {(total + quote.activationFee).toFixed(2).replace(".", ",")}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
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
          disabled={!isFormValid}
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
