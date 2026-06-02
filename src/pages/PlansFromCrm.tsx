import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Check,
  X,
  ExternalLink,
  MessageCircle,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import Header from "@/components/Header";
import WhatsAppButton from "@/components/WhatsAppButton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useQuote } from "@/contexts/QuoteContext";
import { toast } from "sonner";

const WHATSAPP = "5534998679585";

type Plan = {
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  adhesion: number | null;
  participation: string | null;
  planId: string | null;
  tppId: string | null;
  acceptUrl: string;
};

type Coverage = {
  label: string;
  values: (boolean | string)[];
  highlight: boolean;
};

type ClientInfo = {
  name: string | null;
  vehicleDescription: string | null;
  fipeValue: number | null;
  fipeFormatted: string | null;
};

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PlansFromCrm = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qttnCd = params.get("h") || "";
  const { quote } = useQuote();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [coverages, setCoverages] = useState<Coverage[]>([]);
  const [planNames, setPlanNames] = useState<string[]>([]);
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState("");
  const [openAll, setOpenAll] = useState(false);

  useEffect(() => {
    if (!qttnCd) {
      navigate("/cotacao");
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "pwrcrm-quote",
          { body: { action: "plans", qttnCd } },
        );
        if (error) throw error;
        setPlans(data?.plans || []);
        setCoverages(data?.coverages || []);
        setPlanNames(data?.planNames || (data?.plans || []).map((p: Plan) => p.name));
        setClient(data?.client || null);
        setFallbackUrl(data?.fallbackUrl || "");
      } catch (e) {
        console.error(e);
        toast.error("Não foi possível carregar os planos agora.");
        setFallbackUrl(
          `https://app.powercrm.com.br/compareTables?h=${encodeURIComponent(qttnCd)}`,
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [qttnCd, navigate]);

  // Ordena com PREMIUM primeiro mas preservando indices originais para coverages.
  // Quando o modelo existe em mais de uma categoria do CRM (ex.: leve/utilitário),
  // a API retorna planos duplicados (2 PREMIUM + 2 COMPLETO). Mantemos apenas o
  // mais caro de cada nome.
  const orderedIndexes = useMemo(() => {
    const bestByName = new Map<string, number>();
    plans.forEach((p, i) => {
      const current = bestByName.get(p.name);
      if (current === undefined) {
        bestByName.set(p.name, i);
        return;
      }
      const prev = plans[current];
      const better =
        p.monthlyPrice > prev.monthlyPrice ||
        (p.monthlyPrice === prev.monthlyPrice && p.annualPrice > prev.annualPrice);
      if (better) bestByName.set(p.name, i);
    });
    const idx = Array.from(bestByName.values());
    return idx.sort((a, b) => {
      const order = (n: string) => (n === "PREMIUM" ? 0 : n === "COMPLETO" ? 1 : 2);
      return order(plans[a].name) - order(plans[b].name);
    });
  }, [plans]);

  const primaryCoverages = coverages.filter((c) => c.highlight).slice(0, 6);
  const extraCoverages = coverages.filter((c) => !primaryCoverages.includes(c));

  const vehicleLabel =
    client?.vehicleDescription ||
    [quote.vehicle?.brand, quote.vehicle?.model, quote.vehicle?.year]
      .filter(Boolean)
      .join(" ");

  const handleContratar = (plan: Plan) => {
    window.open(plan.acceptUrl, "_blank", "noopener,noreferrer");
  };

  const handleNegociar = (plan: Plan) => {
    const msg = `Olá! Quero negociar valores do plano ${plan.name} (${brl(plan.monthlyPrice)}/mês) para meu ${vehicleLabel || "veículo"}. Cotação: ${qttnCd}`;
    window.open(
      `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener,noreferrer",
    );
    navigate("/aguardando");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      <Header dark />
      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full space-y-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground">
            Seus planos Save Car
          </h1>
          {vehicleLabel && (
            <p className="text-sm text-muted-foreground mt-1">{vehicleLabel}</p>
          )}
          {client?.fipeFormatted && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Avaliação FIPE: {client.fipeFormatted}
            </p>
          )}
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Não conseguimos exibir os valores aqui. Abra a cotação oficial:
            </p>
            <Button
              onClick={() => window.open(fallbackUrl, "_blank", "noopener,noreferrer")}
              className="rounded-xl"
            >
              <ExternalLink className="mr-2 h-4 w-4" /> Abrir cotação oficial
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orderedIndexes.map((i) => {
                const plan = plans[i];
                const isPremium = plan.name === "PREMIUM";
                return (
                  <motion.div
                    key={plan.name}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`relative rounded-2xl border p-5 ${
                      isPremium
                        ? "border-[#F2B705] bg-card shadow-lg"
                        : "border-border bg-card"
                    }`}
                  >
                    {isPremium && (
                      <span className="absolute -top-2 right-4 rounded-full bg-[#F2B705] px-3 py-0.5 text-xs font-bold text-[#0D5C3E]">
                        Recomendado
                      </span>
                    )}
                    <p className="text-xs font-semibold tracking-widest text-[#0D5C3E]">
                      PLANO
                    </p>
                    <h2 className="text-xl font-extrabold mt-0.5">{plan.name}</h2>
                    <div className="mt-3">
                      <p className="text-3xl font-bold text-foreground">
                        {brl(plan.monthlyPrice)}
                      </p>
                      <p className="text-xs text-muted-foreground">Mensalidade</p>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                      {plan.adhesion !== null && (
                        <p>Adesão: <span className="text-foreground font-medium">{brl(plan.adhesion)}</span></p>
                      )}
                      {plan.participation && (
                        <p>Cota de participação: <span className="text-foreground font-medium">{plan.participation}</span></p>
                      )}
                    </div>

                    <div className="mt-5 space-y-2">
                      <Button
                        onClick={() => handleContratar(plan)}
                        className="w-full h-11 rounded-xl bg-[#0D5C3E] text-white hover:bg-[#0D5C3E]/90 font-bold"
                      >
                        Contratar Agora
                      </Button>
                      <Button
                        onClick={() => handleNegociar(plan)}
                        variant="outline"
                        className="w-full h-11 rounded-xl border-[#F2B705] text-[#0D5C3E] hover:bg-[#F2B705]/10 font-semibold"
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Negociar valores
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {coverages.length > 0 && (
              <section className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-base font-bold mb-3">Principais coberturas</h3>
                <CoverageHeader planNames={planNames} orderedIndexes={orderedIndexes} />
                <ul className="divide-y divide-border">
                  {primaryCoverages.map((c) => (
                    <CoverageRow key={c.label} c={c} orderedIndexes={orderedIndexes} />
                  ))}
                </ul>

                {extraCoverages.length > 0 && (
                  <Collapsible open={openAll} onOpenChange={setOpenAll}>
                    <CollapsibleContent>
                      <ul className="divide-y divide-border mt-1">
                        {extraCoverages.map((c) => (
                          <CoverageRow key={c.label} c={c} orderedIndexes={orderedIndexes} />
                        ))}
                      </ul>
                    </CollapsibleContent>
                    <CollapsibleTrigger asChild>
                      <button className="mt-4 flex w-full items-center justify-center gap-1 text-sm font-semibold text-[#0D5C3E]">
                        {openAll ? "Ocultar tabela completa" : "Ver tabela completa"}
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${openAll ? "rotate-180" : ""}`}
                        />
                      </button>
                    </CollapsibleTrigger>
                  </Collapsible>
                )}
              </section>
            )}

            <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3 w-3" /> Cotação oficial Save Car Brasil · #{qttnCd}
            </p>
          </>
        )}
      </main>
      <WhatsAppButton />
    </div>
  );
};

const CoverageHeader = ({
  planNames,
  orderedIndexes,
}: {
  planNames: string[];
  orderedIndexes: number[];
}) => (
  <div className="grid grid-cols-[1fr_repeat(var(--cols),4rem)] items-center gap-2 pb-2 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
    style={{ ["--cols" as never]: orderedIndexes.length } as React.CSSProperties}>
    <span>Cobertura</span>
    {orderedIndexes.map((i) => (
      <span key={i} className="text-center">{planNames[i]}</span>
    ))}
  </div>
);

const CoverageIcon = ({ value }: { value: boolean | string }) => {
  if (value === true)
    return <Check className="h-4 w-4 text-[#0D5C3E] mx-auto" strokeWidth={3} />;
  if (value === false || value === "" || value == null)
    return <X className="h-4 w-4 text-muted-foreground/50 mx-auto" />;
  return <span className="text-[11px] font-medium text-foreground text-center block">{String(value)}</span>;
};

const CoverageRow = ({
  c,
  orderedIndexes,
}: {
  c: Coverage;
  orderedIndexes: number[];
}) => (
  <li
    className="grid grid-cols-[1fr_repeat(var(--cols),4rem)] items-center gap-2 py-2.5"
    style={{ ["--cols" as never]: orderedIndexes.length } as React.CSSProperties}
  >
    <span className="text-sm text-foreground leading-snug">{c.label}</span>
    {orderedIndexes.map((i) => (
      <span key={i} className="flex items-center justify-center">
        <CoverageIcon value={c.values?.[i] ?? false} />
      </span>
    ))}
  </li>
);

export default PlansFromCrm;
