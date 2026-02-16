import { CreditCard, QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuote } from "@/contexts/QuoteContext";

const PaymentMethodSelector = () => {
  const { quote, setPaymentMethod } = useQuote();

  return (
    <div>
      <h3 className="text-sm font-bold text-foreground mb-2">Forma de pagamento</h3>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setPaymentMethod("credit")}
          className={`relative rounded-xl border-2 p-4 text-center transition-all ${
            quote.paymentMethod === "credit"
              ? "border-primary bg-primary/5 shadow-md"
              : "border-border bg-card hover:border-muted-foreground/30"
          }`}
        >
          <Badge className="absolute -top-2 right-2 bg-green-600 text-white text-[10px] px-1.5 py-0">
            10% OFF
          </Badge>
          <div className="flex flex-col items-center gap-1">
            <CreditCard className={`h-6 w-6 ${quote.paymentMethod === "credit" ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`text-xs font-bold ${quote.paymentMethod === "credit" ? "text-primary" : "text-foreground"}`}>
              Cartão de Crédito
            </span>
            <span className="text-[10px] text-muted-foreground">Adesão + 11x</span>
          </div>
        </button>

        <button
          onClick={() => setPaymentMethod("pix")}
          className={`relative rounded-xl border-2 p-4 text-center transition-all ${
            quote.paymentMethod === "pix"
              ? "border-primary bg-primary/5 shadow-md"
              : "border-border bg-card hover:border-muted-foreground/30"
          }`}
        >
          <div className="flex flex-col items-center gap-1">
            <QrCode className={`h-6 w-6 ${quote.paymentMethod === "pix" ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`text-xs font-bold ${quote.paymentMethod === "pix" ? "text-primary" : "text-foreground"}`}>
              PIX / Boleto
            </span>
            <span className="text-[10px] text-muted-foreground">Carnê 11x</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
