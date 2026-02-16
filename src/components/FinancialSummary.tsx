import { Card, CardContent } from "@/components/ui/card";
import { useQuote } from "@/contexts/QuoteContext";

const fmt = (v: number) => v.toFixed(2).replace(".", ",");

const FinancialSummary = () => {
  const { quote, getTotal, getSubtotalWithoutDiscount } = useQuote();

  const subtotal = getSubtotalWithoutDiscount();
  const total = getTotal();
  const isCredit = quote.paymentMethod === "credit";
  const discount = isCredit ? subtotal * 0.1 : 0;
  const periodLabel = quote.billingPeriod === "monthly" ? "Mensal" : "Anual";
  const grandTotal = total + quote.activationFee;

  return (
    <Card className="border-border">
      <CardContent className="p-4 space-y-2 text-sm">
        {/* Plan line */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">
            Plano {quote.planName} — {periodLabel}
          </span>
          {isCredit ? (
            <div className="flex items-center gap-2">
              <span className="line-through text-muted-foreground text-xs">R$ {fmt(subtotal)}</span>
              <span className="font-semibold text-foreground">R$ {fmt(total)}</span>
            </div>
          ) : (
            <span className="font-semibold text-foreground">R$ {fmt(subtotal)}</span>
          )}
        </div>

        {/* Discount line */}
        {isCredit && (
          <div className="flex justify-between">
            <span className="text-green-600 text-xs">Desconto cartão (10%)</span>
            <span className="text-green-600 font-semibold text-xs">-R$ {fmt(discount)}</span>
          </div>
        )}

        {/* Activation fee */}
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            Taxa de ativação{isCredit ? "" : " (PIX)"}
          </span>
          <span className="font-semibold text-foreground">R$ {fmt(quote.activationFee)}</span>
        </div>

        {/* Total */}
        <div className="flex justify-between border-t border-border pt-2">
          <div>
            <span className="font-bold text-foreground">Total</span>
            <p className="text-[10px] text-muted-foreground">
              {isCredit
                ? `Adesão R$ ${fmt(quote.activationFee)} + 11x R$ ${fmt(total)}`
                : `Adesão R$ ${fmt(quote.activationFee)} + 11 boletos de R$ ${fmt(subtotal)}`}
            </p>
          </div>
          <span className="font-bold text-primary text-lg">
            R$ {fmt(grandTotal)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancialSummary;
