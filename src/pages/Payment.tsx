import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, CreditCard, Lock, ChevronDown, ChevronUp, QrCode, Copy, CheckCircle2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import Header from "@/components/Header";
import WhatsAppButton from "@/components/WhatsAppButton";
import FinancialSummary from "@/components/FinancialSummary";
import { useQuote } from "@/contexts/QuoteContext";
import { supabase } from "@/integrations/supabase/client";

const Payment = () => {
  const navigate = useNavigate();
  const { quote, getTotal } = useQuote();
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);

  const pixKey = "savecar@savecar.com.br";

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

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 3000);
  };

  const total = getTotal();

  const handleFinalize = () => {
    if (!acceptTerms) return;
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
            <div className="flex items-center gap-2 py-1">
              <Check className="h-4 w-4 text-primary" />
              <span className="text-sm text-foreground">Plano {quote.planName}</span>
            </div>
            <div className="flex items-center gap-2 py-1">
              <Check className="h-4 w-4 text-primary" />
              <span className="text-sm text-foreground">
                {quote.paymentMethod === "credit" ? "Cartão de Crédito (10% OFF)" : "PIX / Boleto (Carnê)"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <FinancialSummary />

        {/* Payment info based on selected method */}
        <Card className="border-border">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              {quote.paymentMethod === "credit" ? (
                <CreditCard className="h-4 w-4 text-primary" />
              ) : (
                <FileText className="h-4 w-4 text-primary" />
              )}
              <span className="text-sm font-semibold text-foreground">
                {quote.paymentMethod === "credit" ? "Cartão de Crédito" : "PIX / Boleto"}
              </span>
            </div>
            {quote.paymentMethod === "credit" ? (
              <p className="text-xs text-muted-foreground">
                Os dados do cartão serão solicitados pela nossa equipe após a aprovação da vistoria. Você receberá as instruções via WhatsApp.
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">• Adesão: R$ {quote.activationFee.toFixed(2).replace(".", ",")} via PIX</p>
                <p className="text-xs text-muted-foreground">• 11 boletos mensais enviados por e-mail</p>
                <div className="mt-3 w-full bg-muted rounded-lg p-3 flex items-center justify-between gap-2">
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
              </>
            )}
          </CardContent>
        </Card>

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
          disabled={!acceptTerms}
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
