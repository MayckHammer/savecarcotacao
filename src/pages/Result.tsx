import { useNavigate } from "react-router-dom";
import { ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import { useQuote } from "@/contexts/QuoteContext";

const Result = () => {
  const navigate = useNavigate();
  const { quote, resetQuote } = useQuote();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header dark />

      <div className="flex-1 px-6 py-8">
        <h1 className="text-xl font-bold text-foreground mb-1">
          Olá, {quote.personal.name.split(" ")[0] || "Associado"}!
        </h1>
        <p className="text-sm text-muted-foreground mb-6">Bem-vindo de volta!</p>

        <Card className="mb-4 border-border shadow-sm">
          <CardContent className="p-5 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Faixa de valor do veículo</p>
              <p className="text-lg font-bold text-foreground">
                {quote.vehicle.fipeFormatted || quote.vehicleValue}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3 mt-6">
          <Button onClick={() => navigate("/detalhes")} className="w-full h-13 rounded-xl font-bold text-base">
            Continuar
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              resetQuote();
              navigate("/cotacao");
            }}
            className="w-full h-12 rounded-xl"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Nova cotação
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Result;
