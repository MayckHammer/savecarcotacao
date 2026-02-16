import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useQuote } from "@/contexts/QuoteContext";
import { maskCardNumber, maskExpiry, maskCVV } from "@/lib/masks";

const CardForm = () => {
  const { quote, updateCard } = useQuote();

  return (
    <Card className="border-border">
      <CardContent className="p-4 space-y-3">
        <div>
          <Label className="text-xs">Número do cartão</Label>
          <Input
            placeholder="0000 0000 0000 0000"
            value={quote.cardNumber}
            onChange={(e) => updateCard({ cardNumber: maskCardNumber(e.target.value) })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Validade</Label>
            <Input
              placeholder="MM/AA"
              value={quote.cardExpiry}
              onChange={(e) => updateCard({ cardExpiry: maskExpiry(e.target.value) })}
            />
          </div>
          <div>
            <Label className="text-xs">CVV</Label>
            <Input
              placeholder="000"
              value={quote.cardCvv}
              onChange={(e) => updateCard({ cardCvv: maskCVV(e.target.value) })}
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">Nome do titular</Label>
          <Input
            placeholder="Nome como está no cartão"
            value={quote.cardName}
            onChange={(e) => updateCard({ cardName: e.target.value.toUpperCase() })}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default CardForm;
