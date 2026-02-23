import { Card, CardContent } from "@/components/ui/card";
import { useQuote } from "@/contexts/QuoteContext";
import { CreditCard, Sparkles } from "lucide-react";

interface FinancialSummaryProps {
  showToggle?: boolean;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const FinancialSummary = ({ showToggle = true }: FinancialSummaryProps) => {
  const { quote, getTotal, getSubtotalWithoutDiscount, setBillingPeriod } = useQuote();

  const subtotal = getSubtotalWithoutDiscount();
  const total = getTotal();
  const isCredit = quote.paymentMethod === "credit";
  const isMonthly = quote.billingPeriod === "monthly";
  const periodLabel = isMonthly ? "Mês" : "Ano";

  return (
    <div className="space-y-4">
      {showToggle && (
      <div className="flex rounded-2xl overflow-hidden border border-border bg-muted p-1 gap-1">
        <button
          onClick={() => setBillingPeriod("monthly")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
            isMonthly
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Mensal
        </button>
        <button
          onClick={() => setBillingPeriod("monthly")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
            !isMonthly
              ? "bg-card text-primary shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Anual
        </button>
      </div>
      )}

      {/* Price Hero */}
      <Card className="border-border">
        <CardContent className="p-5 space-y-4">
          {/* Large price */}
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-foreground">
                R$ {fmt(isCredit ? total : subtotal)}
              </span>
              <span className="text-base text-muted-foreground font-medium">/{periodLabel}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Taxa única de ativação: R$ {fmt(quote.activationFee)}
            </p>
            {isCredit && (
              <p className="text-xs text-primary font-semibold mt-1">
                10% de desconto no cartão de crédito
              </p>
            )}
          </div>

          {/* Primeiro pagamento breakdown */}
          <div>
            <h4 className="text-sm font-bold text-foreground mb-3">Primeiro pagamento</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {isMonthly ? "Mensalidade" : "Anuidade"}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  R$ {fmt(isCredit ? total : subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Taxa única de ativação</span>
                <span className="text-sm font-semibold text-foreground">
                  R$ {fmt(quote.activationFee)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-sm font-semibold text-foreground">
                  R$ {fmt((isCredit ? total : subtotal) + quote.activationFee)}
                </span>
              </div>
            </div>

            {/* Dashed separator */}
            <div className="border-t border-dashed border-border my-3" />

            <div className="flex justify-between items-center">
              <span className="text-base font-bold text-foreground">Total:</span>
              <span className="text-base font-bold text-foreground">
                R$ {fmt((isCredit ? total : subtotal) + quote.activationFee)}
              </span>
            </div>

            <div className="border-t border-dashed border-border my-3" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialSummary;
