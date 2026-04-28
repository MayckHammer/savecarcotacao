import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Car,
  Bike,
  Truck,
  CheckCircle2,
  ChevronRight,
  MessageCircle,
  Shield,
  Zap,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuote } from "@/contexts/QuoteContext";
import logo from "@/assets/logo-savecar.png";

const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

const FIPE_RANGES = [
  { id: "0-25", label: "Até R$ 25.000" },
  { id: "25-50", label: "R$ 25k – 50k" },
  { id: "50-80", label: "R$ 50k – 80k" },
  { id: "80-120", label: "R$ 80k – 120k" },
  { id: "120+", label: "Acima de R$ 120k" },
];

const PRICE_TABLE: Record<string, { completo: number; premium: number }> = {
  "0-25":   { completo:  89.90, premium: 119.90 },
  "25-50":  { completo: 139.90, premium: 189.90 },
  "50-80":  { completo: 189.90, premium: 259.90 },
  "80-120": { completo: 249.90, premium: 339.90 },
  "120+":   { completo: 329.90, premium: 449.90 },
};

const TYPE_MULT: Record<string, number> = {
  carro: 1.0,
  moto: 0.78,
  caminhao: 1.32,
};

function calcPrices(fipeRange: string, vehicleType: string) {
  const base = PRICE_TABLE[fipeRange] ?? PRICE_TABLE["25-50"];
  const mult = TYPE_MULT[vehicleType] ?? 1;
  return {
    completo: Math.round(base.completo * mult * 100) / 100,
    premium:  Math.round(base.premium  * mult * 100) / 100,
  };
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
}

const PLAN_COVERAGES = {
  completo: [
    "Colisão até 100% FIPE",
    "Roubo e Furto até 100% FIPE",
    "Fenômenos da Natureza",
    "Incêndio",
    "RCF R$ 30.000 danos materiais",
    "Assistência 24h em todo Brasil",
    "Reboque em casos de colisão",
    "Chaveiro auto",
    "Troca de pneus",
    "Táxi ou app em emergências",
    "Clube CERTO de descontos",
  ],
  premium: [
    "Tudo do plano Completo",
    "RCF R$ 100.000 danos materiais",
    "Vidros totais ilimitados",
    "Reboque até 600 km",
    "Hospedagem emergencial",
    "Retorno a domicílio",
    "Assistência funeral Zelo",
  ],
};

const QuickQuote = () => {
  const navigate = useNavigate();
  const { updateVehicle } = useQuote();

  const [uf, setUf] = useState("");
  const [vehicleType, setVehicleType] = useState("carro");
  const [fipeRange, setFipeRange] = useState("");
  const [showPlans, setShowPlans] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<"completo" | "premium" | null>(null);

  const canSimulate = !!uf && !!fipeRange;
  const prices = canSimulate ? calcPrices(fipeRange, vehicleType) : null;

  const handleSimulate = () => {
    if (!canSimulate) return;
    setShowPlans(true);
    setTimeout(() => {
      document.getElementById("plans-section")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleProceed = (plan: "COMPLETO" | "PREMIUM") => {
    updateVehicle({ type: vehicleType });
    navigate("/cotacao", { state: { quickPlan: plan, quickUf: uf, quickFipeRange: fipeRange } });
  };

  const handleWhatsApp = () => {
    window.open(
      "https://wa.me/5500000000000?text=Olá!%20Quero%20cotar%20meu%20veículo%20com%20a%20SaveCar%20Brasil.",
      "_blank",
    );
  };

  const types = [
    { value: "carro", label: "Carro", Icon: Car },
    { value: "moto", label: "Moto", Icon: Bike },
    { value: "caminhao", label: "Caminhão", Icon: Truck },
  ];

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-border">
        <img
          src={logo}
          alt="SAVE CAR BRASIL"
          className="h-10 object-contain cursor-pointer"
          onClick={() => navigate("/")}
        />
        <button
          onClick={handleWhatsApp}
          className="flex items-center gap-1.5 text-xs font-medium text-primary"
        >
          <MessageCircle className="h-4 w-4" />
          Falar com consultor
        </button>
      </header>

      {/* Hero */}
      <section className="px-6 pt-8 pb-6 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
          <Zap className="h-3.5 w-3.5" />
          Cotação em 30 segundos
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2 leading-tight">
          Veja o preço agora.
          <br />
          <span className="text-primary">Sem precisar da placa.</span>
        </h1>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Simule grátis e descubra quanto custa proteger seu veículo. Sem análise de perfil.
        </p>
      </section>

      {/* Form */}
      <section className="px-6 space-y-5">
        {/* Tipo de veículo */}
        <div>
          <p className="text-xs font-semibold text-foreground mb-2">Tipo de veículo</p>
          <div className="grid grid-cols-3 gap-2">
            {types.map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => { setVehicleType(value); setShowPlans(false); }}
                className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 transition-all ${
                  vehicleType === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* UF */}
        <div>
          <p className="text-xs font-semibold text-foreground mb-2">Estado de circulação</p>
          <select
            value={uf}
            onChange={(e) => { setUf(e.target.value); setShowPlans(false); }}
            className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Selecione o estado</option>
            {UFS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        {/* Faixa FIPE */}
        <div>
          <p className="text-xs font-semibold text-foreground mb-2">Valor aproximado do veículo (FIPE)</p>
          <div className="space-y-2">
            {FIPE_RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => { setFipeRange(r.id); setShowPlans(false); }}
                className={`w-full flex items-center justify-between rounded-xl border-2 px-4 py-3 text-sm transition-all ${
                  fipeRange === r.id
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border bg-card text-foreground hover:border-primary/40"
                }`}
              >
                <span>{r.label}</span>
                {fipeRange === r.id && <CheckCircle2 className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </div>

        {/* Botão simular */}
        <Button
          onClick={handleSimulate}
          disabled={!canSimulate}
          className="w-full h-12 rounded-xl font-bold text-base shadow-lg"
          size="lg"
        >
          Ver meus preços agora
          <ArrowRight className="ml-1 h-5 w-5" />
        </Button>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2">
          <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5 text-primary" /> Sem análise de perfil</span>
          <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-primary" /> 100% da FIPE</span>
        </div>
      </section>

      {/* Planos */}
      {showPlans && prices && (
        <section id="plans-section" className="px-6 mt-10 space-y-4">
          <div className="text-center">
            <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-1">Resultado da simulação</p>
            <h2 className="text-xl font-bold text-foreground">Escolha seu plano</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Preços para {vehicleType === "carro" ? "carro" : vehicleType === "moto" ? "moto" : "caminhão"} • {uf} • {FIPE_RANGES.find(r => r.id === fipeRange)?.label}
            </p>
          </div>

          {/* COMPLETO */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="p-5">
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Plano</p>
                  <p className="text-lg font-bold text-foreground">Completo</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">a partir de</p>
                  <p className="text-2xl font-bold text-primary">{fmt(prices.completo)}</p>
                  <p className="text-xs text-muted-foreground">/mês</p>
                </div>
              </div>

              <div className="space-y-1.5 mb-4">
                {PLAN_COVERAGES.completo
                  .slice(0, expandedPlan === "completo" ? undefined : 4)
                  .map((c) => (
                    <div key={c} className="flex items-start gap-2 text-xs text-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{c}</span>
                    </div>
                  ))}
                {expandedPlan !== "completo" && (
                  <button
                    onClick={() => setExpandedPlan("completo")}
                    className="flex items-center gap-1 text-xs text-primary font-medium mt-1"
                  >
                    Ver todas as coberturas <ChevronRight className="h-3 w-3" />
                  </button>
                )}
              </div>

              <Button
                onClick={() => handleProceed("COMPLETO")}
                className="w-full h-11 rounded-xl font-bold"
              >
                Contratar Completo
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            <div className="bg-muted px-5 py-2.5 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                Ou <span className="font-semibold text-foreground">{fmt(prices.completo * 12 * 0.9)}</span>/ano com 10% de desconto
              </p>
            </div>
          </div>

          {/* PREMIUM */}
          <div className="relative rounded-2xl border-2 border-primary bg-card overflow-hidden shadow-md">
            <div className="absolute top-0 right-4 bg-primary text-primary-foreground text-[10px] font-bold tracking-wider px-2 py-1 rounded-b-md">
              MAIS COMPLETO
            </div>
            <div className="p-5 pt-7">
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Plano</p>
                  <p className="text-lg font-bold text-foreground">Premium</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">a partir de</p>
                  <p className="text-2xl font-bold text-primary">{fmt(prices.premium)}</p>
                  <p className="text-xs text-muted-foreground">/mês</p>
                </div>
              </div>

              <div className="space-y-1.5 mb-4">
                {PLAN_COVERAGES.premium
                  .slice(0, expandedPlan === "premium" ? undefined : 4)
                  .map((c) => (
                    <div key={c} className="flex items-start gap-2 text-xs text-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{c}</span>
                    </div>
                  ))}
                {expandedPlan !== "premium" && (
                  <button
                    onClick={() => setExpandedPlan("premium")}
                    className="flex items-center gap-1 text-xs text-primary font-medium mt-1"
                  >
                    Ver todas as coberturas <ChevronRight className="h-3 w-3" />
                  </button>
                )}
              </div>

              <Button
                onClick={() => handleProceed("PREMIUM")}
                className="w-full h-11 rounded-xl font-bold"
              >
                Contratar Premium
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            <div className="bg-muted px-5 py-2.5 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                Ou <span className="font-semibold text-foreground">{fmt(prices.premium * 12 * 0.9)}</span>/ano com 10% de desconto
              </p>
            </div>
          </div>

          {/* WhatsApp CTA */}
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <div className="h-10 w-10 rounded-full bg-[#25D366]/10 flex items-center justify-center shrink-0">
              <MessageCircle className="h-5 w-5 text-[#25D366]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Ficou com dúvidas?</p>
              <p className="text-xs text-muted-foreground">Nosso consultor responde na hora</p>
            </div>
            <button
              onClick={handleWhatsApp}
              className="text-xs font-bold text-[#25D366] px-3 py-2 rounded-lg border border-[#25D366]/30 hover:bg-[#25D366]/10 transition-colors"
            >
              WhatsApp
            </button>
          </div>

          <p className="text-[11px] text-muted-foreground text-center leading-relaxed px-2">
            * Valores estimados com base na faixa FIPE selecionada. O preço exato é calculado após informar a placa do veículo. Sem taxa de adesão para contratação online.
          </p>

          <button
            onClick={() => navigate("/cotacao")}
            className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Prefiro informar a placa agora
            <ChevronRight className="h-4 w-4" />
          </button>
        </section>
      )}

      {/* Footer mínimo */}
      {!showPlans && (
        <div className="px-6 mt-10 text-center">
          <p className="text-xs text-muted-foreground mb-2">Já sabe qual veículo quer proteger?</p>
          <button
            onClick={() => navigate("/cotacao")}
            className="text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            Consultar pela placa diretamente
          </button>
        </div>
      )}
    </div>
  );
};

export default QuickQuote;
