import { useNavigate } from "react-router-dom";
import { CheckCircle, ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import { useQuote } from "@/contexts/QuoteContext";

const Confirmation = () => {
  const navigate = useNavigate();
  const { quote, resetQuote } = useQuote();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header dark />

      <div className="flex-1 px-6 py-10 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <CheckCircle className="h-10 w-10 text-primary" />
        </div>

        <h1 className="text-2xl font-bold text-foreground text-center mb-2">
          Contratação realizada!
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-8 max-w-xs">
          Parabéns, {quote.personal.name.split(" ")[0]}! Sua proteção veicular SAVE CAR BRASIL está ativa.
        </p>

        <Card className="w-full border-border mb-8">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm font-bold text-foreground">Resumo da proteção</span>
            </div>
            <div className="text-sm space-y-1 text-muted-foreground">
              <p>Veículo: {quote.vehicle.model}</p>
              <p>Placa: {quote.vehicle.plate}</p>
              <p>Plano: {quote.billingPeriod === "monthly" ? "Mensal" : "Anual"}</p>
              <p className="font-semibold text-foreground">
                Coberturas: Furto e Roubo, Assistência 24h
                {quote.optionalCoverages.filter(c => c.selected).map(c => `, ${c.name}`).join("")}
              </p>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={() => {
            resetQuote();
            navigate("/");
          }}
          className="w-full max-w-xs h-14 rounded-xl font-bold text-base"
        >
          Voltar ao início
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default Confirmation;
