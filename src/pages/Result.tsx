import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import { useQuote } from "@/contexts/QuoteContext";
import { supabase } from "@/integrations/supabase/client";

const Result = () => {
  const navigate = useNavigate();
  const { quote, resetQuote, setCrmPlans } = useQuote();
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [planWarning, setPlanWarning] = useState<string | null>(null);
  const [progressDots, setProgressDots] = useState(".");

  // Animated dots while loading
  useEffect(() => {
    if (!loadingPlans) return;
    const t = setInterval(() => {
      setProgressDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 500);
    return () => clearInterval(t);
  }, [loadingPlans]);

  useEffect(() => {
    let cancelled = false;

    const fetchCrmPlans = async () => {
      if (!quote.sessionId) {
        setLoadingPlans(false);
        return;
      }

      try {
        // Short initial wait so the CRM has a chance to process the update
        await new Promise((r) => setTimeout(r, 1500));
        if (cancelled) return;

        const { data } = await supabase
          .from("quotes")
          .select("crm_quotation_code")
          .eq("session_id", quote.sessionId)
          .single();

        if (!data?.crm_quotation_code) {
          setLoadingPlans(false);
          return;
        }

        const { data: plansData, error } = await supabase.functions.invoke("get-crm-plans", {
          body: { quotationCode: data.crm_quotation_code },
        });

        if (cancelled) return;

        if (!error && plansData?.plans?.length > 0) {
          setCrmPlans(plansData.plans);
          console.log("CRM plans loaded:", plansData.plans);
          if (quote.vehicle.fipeFormatted) {
            toast.success(`Plano calculado com FIPE oficial: ${quote.vehicle.fipeFormatted}`);
          }
        } else if (plansData?.warning) {
          setPlanWarning(plansData.warning);
          console.warn("CRM plans warning:", plansData.warning);
        }
      } catch (err) {
        console.error("Error fetching CRM plans:", err);
      } finally {
        if (!cancelled) setLoadingPlans(false);
      }
    };

    fetchCrmPlans();
    return () => {
      cancelled = true;
    };
  }, [quote.sessionId, quote.vehicle.fipeFormatted, setCrmPlans]);

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

        {loadingPlans && (
          <div className="rounded-xl border border-border bg-card p-4 mb-4 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Calculando seu plano{progressDots}</p>
              <p className="text-xs text-muted-foreground">
                {quote.vehicle.fipeFormatted
                  ? `FIPE oficial encontrada (${quote.vehicle.fipeFormatted}); aguardando cálculo do CRM.`
                  : "Estamos consultando os melhores valores para o seu veículo."}
              </p>
            </div>
          </div>
        )}

        {!loadingPlans && planWarning && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 mb-4">
            <p className="text-xs text-yellow-700">
              {quote.vehicle.fipeFormatted ? `FIPE oficial: ${quote.vehicle.fipeFormatted}. Usando valores estimados — ${planWarning}` : `Usando valores estimados — ${planWarning}`}
            </p>
          </div>
        )}

        <div className="space-y-3 mt-6">
          <Button
            onClick={() => navigate("/detalhes")}
            className="w-full h-13 rounded-xl font-bold text-base"
            disabled={loadingPlans}
          >
            {loadingPlans ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Carregando planos{progressDots}
              </>
            ) : (
              <>
                Continuar
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
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
