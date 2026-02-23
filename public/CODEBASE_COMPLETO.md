# SAVE CAR BRASIL — Codebase Completo

> Documento gerado em 23/02/2026 para verificação e análise.
> Projeto: Cotação de proteção veicular com integração Power CRM + FIPE API.

---

## ARQUITETURA

```
Rotas:
  /           → Landing (página inicial)
  /cotacao    → Quote (formulário 3 etapas: dados, veículo, endereço)
  /resultado  → Result (resumo + carrega planos CRM)
  /detalhes   → PlanDetails (seleção plano, cobertura, pagamento)
  /vistoria   → Inspection (acompanhamento vistoria)
  /pagamento  → Payment (finalização)
  /confirmacao → Confirmation (sucesso)
  /admin      → Admin (painel vistorias)

Edge Functions (Deno/Supabase):
  consulta-placa       → API FIPE (brands, models, years, price)
  consulta-placa-crm   → Power CRM (criar cotação + buscar veículo)
  submit-to-crm        → Salvar DB + enviar ao Power CRM
  get-crm-plans        → Buscar planos/preços do CRM
  get-inspection-link  → Buscar link de vistoria do CRM
  update-inspection    → Atualizar status da vistoria

Banco de Dados (Supabase):
  Tabela: quotes
    - id, session_id, personal_data, vehicle_data, address_data, plan_data
    - crm_quotation_code, crm_submitted, crm_error
    - inspection_status (pending|released|approved|rejected), inspection_link
    - created_at, updated_at
```

---

## 1. src/App.tsx

```tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QuoteProvider } from "@/contexts/QuoteContext";
import Landing from "./pages/Landing";
import Quote from "./pages/Quote";
import Result from "./pages/Result";
import PlanDetails from "./pages/PlanDetails";
import Payment from "./pages/Payment";
import Inspection from "./pages/Inspection";
import Admin from "./pages/Admin";
import Confirmation from "./pages/Confirmation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <QuoteProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/cotacao" element={<Quote />} />
            <Route path="/resultado" element={<Result />} />
            <Route path="/detalhes" element={<PlanDetails />} />
            <Route path="/pagamento" element={<Payment />} />
            <Route path="/vistoria" element={<Inspection />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/confirmacao" element={<Confirmation />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </QuoteProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
```

---

## 2. src/contexts/QuoteContext.tsx

```tsx
import React, { createContext, useContext, useState, ReactNode } from "react";

export interface PersonalData {
  name: string;
  email: string;
  phone: string;
  cpf: string;
}

export interface VehicleData {
  plate: string;
  model: string;
  type: string;
  usage: string;
  brand: string;
  year: string;
  color: string;
  fipeValue: number;
  fipeFormatted: string;
  brandCode: string;
  modelCode: string;
  yearCode: string;
}

export interface AddressData {
  cep: string;
  street: string;
  neighborhood: string;
  number: string;
  complement: string;
  state: string;
  city: string;
  noNumber: boolean;
}

export type PlanName = "COMPLETO" | "PREMIUM";

export interface CrmPlan {
  id: string | null;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  coverages: string[];
}

export const PLAN_COVERAGES: Record<PlanName, string[]> = {
  COMPLETO: [
    "Colisão (Até 100% FIPE)",
    "Incêndio somente por colisão (Até 100% FIPE)",
    "Acidentes (Até 100% FIPE)",
    "Roubo e Furto (Até 100% FIPE)",
    "Fenômenos da Natureza (Até 100% FIPE)",
    "Veículos de leilão/+25 anos: 75% FIPE",
    "RCF R$ 30.000,00 — Danos materiais",
    "Clube de vantagens",
    "Assistência 24h em Todo Brasil",
    "Reboque em Casos de Colisão",
    "Chaveiro Auto",
    "Mão de obra para troca de pneus",
    "Auxílio na Falta de Combustível",
    "Táxi ou veículo de Aplicativo",
    "Retorno a Domicílio em caso de acidente",
    "Hospedagem Emergencial",
    "Assistência 24h — 300 km totais (150 ida/150 volta), 1 acionamento a cada 30 dias, limitado a 4 por ano",
    "Clube de Descontos (CLUBE CERTO)",
    "Assistência funeral Zelo (carência 90 dias)",
  ],
  PREMIUM: [
    "Colisão (Até 100% FIPE)",
    "Incêndio somente por colisão (Até 100% FIPE)",
    "Acidentes (Até 100% FIPE)",
    "Roubo e Furto (Até 100% FIPE)",
    "Fenômenos da Natureza (Até 100% FIPE)",
    "Veículos de leilão/+25 anos: 75% FIPE",
    "RCF R$ 100.000,00 — Danos materiais (cota de participação R$ 1.000 para danos acima de R$ 50 mil)",
    "Vidros Totais ilimitado (carência 30 dias, cota 50% XENON/LED e 20% demais)",
    "Clube de vantagens",
    "Assistência 24h em Todo Brasil",
    "Reboque em Casos de Colisão",
    "Chaveiro Auto",
    "Mão de obra para troca de pneus",
    "Auxílio na Falta de Combustível",
    "Táxi ou veículo de Aplicativo",
    "Retorno a Domicílio em caso de acidente",
    "Hospedagem Emergencial",
    "Assistência 24h — 600 km totais (300 ida/300 volta), 1 acionamento a cada 30 dias",
    "Clube de Descontos (CLUBE CERTO)",
    "Assistência funeral Zelo (carência 90 dias)",
  ],
};

export interface QuoteData {
  personal: PersonalData;
  vehicle: VehicleData;
  address: AddressData;
  monthlyPrice: number;
  annualPrice: number;
  activationFee: number;
  vehicleValue: string;
  billingPeriod: "monthly" | "annual";
  planName: PlanName;
  paymentMethod: "credit" | "pix";
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
  cardName: string;
  coupon: string;
  sessionId: string;
  crmQuotationCode: string;
  crmNegotiationCode: string;
}

const defaultQuote: QuoteData = {
  personal: { name: "", email: "", phone: "", cpf: "" },
  vehicle: { plate: "", model: "", type: "", usage: "", brand: "", year: "", color: "", fipeValue: 0, fipeFormatted: "", brandCode: "", modelCode: "", yearCode: "" },
  address: { cep: "", street: "", neighborhood: "", number: "", complement: "", state: "", city: "", noNumber: false },
  monthlyPrice: 189.9,
  annualPrice: 1899.0,
  activationFee: 299.9,
  vehicleValue: "R$ 50.000 — R$ 70.000",
  billingPeriod: "monthly",
  planName: "COMPLETO",
  paymentMethod: "credit",
  cardNumber: "",
  cardExpiry: "",
  cardCvv: "",
  cardName: "",
  sessionId: localStorage.getItem("savecar_session_id") || "",
  coupon: "",
  crmQuotationCode: "",
  crmNegotiationCode: "",
};

interface QuoteContextType {
  quote: QuoteData;
  crmPlans: CrmPlan[];
  setCrmPlans: (plans: CrmPlan[]) => void;
  updatePersonal: (data: Partial<PersonalData>) => void;
  updateVehicle: (data: Partial<VehicleData>) => void;
  updateAddress: (data: Partial<AddressData>) => void;
  setBillingPeriod: (period: "monthly" | "annual") => void;
  setPlanName: (plan: PlanName) => void;
  setPaymentMethod: (method: "credit" | "pix") => void;
  updateCard: (data: Partial<Pick<QuoteData, "cardNumber" | "cardExpiry" | "cardCvv" | "cardName">>) => void;
  setCoupon: (coupon: string) => void;
  setCrmQuotationCode: (code: string) => void;
  setCrmNegotiationCode: (code: string) => void;
  setSessionId: (id: string) => void;
  resetQuote: () => void;
  getTotal: () => number;
  getSubtotalWithoutDiscount: () => number;
}

const QuoteContext = createContext<QuoteContextType | undefined>(undefined);

export const QuoteProvider = ({ children }: { children: ReactNode }) => {
  const [quote, setQuote] = useState<QuoteData>(defaultQuote);
  const [crmPlans, setCrmPlans] = useState<CrmPlan[]>([]);

  const updatePersonal = (data: Partial<PersonalData>) =>
    setQuote((prev) => ({ ...prev, personal: { ...prev.personal, ...data } }));

  const updateVehicle = (data: Partial<VehicleData>) =>
    setQuote((prev) => ({ ...prev, vehicle: { ...prev.vehicle, ...data } }));

  const updateAddress = (data: Partial<AddressData>) =>
    setQuote((prev) => ({ ...prev, address: { ...prev.address, ...data } }));

  const setBillingPeriod = (period: "monthly" | "annual") =>
    setQuote((prev) => ({ ...prev, billingPeriod: period }));

  const setPlanName = (planName: PlanName) =>
    setQuote((prev) => ({ ...prev, planName }));

  const setPaymentMethod = (paymentMethod: "credit" | "pix") =>
    setQuote((prev) => ({ ...prev, paymentMethod }));

  const updateCard = (data: Partial<Pick<QuoteData, "cardNumber" | "cardExpiry" | "cardCvv" | "cardName">>) =>
    setQuote((prev) => ({ ...prev, ...data }));

  const setCoupon = (coupon: string) => setQuote((prev) => ({ ...prev, coupon }));

  const setCrmQuotationCode = (crmQuotationCode: string) =>
    setQuote((prev) => ({ ...prev, crmQuotationCode }));

  const setCrmNegotiationCode = (crmNegotiationCode: string) =>
    setQuote((prev) => ({ ...prev, crmNegotiationCode }));

  const setSessionId = (id: string) => {
    localStorage.setItem("savecar_session_id", id);
    setQuote((prev) => ({ ...prev, sessionId: id }));
  };

  const resetQuote = () => {
    setQuote(defaultQuote);
    setCrmPlans([]);
  };

  const getCrmPlanForCurrent = (): CrmPlan | undefined => {
    return crmPlans.find((p) =>
      p.name?.toUpperCase().includes(quote.planName)
    );
  };

  const getSubtotalWithoutDiscount = () => {
    const crmPlan = getCrmPlanForCurrent();
    if (crmPlan) {
      return quote.billingPeriod === "monthly" ? crmPlan.monthlyPrice : crmPlan.annualPrice;
    }
    const base = quote.billingPeriod === "monthly" ? quote.monthlyPrice : quote.annualPrice;
    const planMultiplier = quote.planName === "PREMIUM" ? 1.35 : 1;
    return base * planMultiplier;
  };

  const getTotal = () => {
    const subtotal = getSubtotalWithoutDiscount();
    const discount = quote.paymentMethod === "credit" ? 0.9 : 1;
    return subtotal * discount;
  };

  return (
    <QuoteContext.Provider
      value={{ quote, crmPlans, setCrmPlans, updatePersonal, updateVehicle, updateAddress, setBillingPeriod, setPlanName, setPaymentMethod, updateCard, setCoupon, setCrmQuotationCode, setCrmNegotiationCode, setSessionId, resetQuote, getTotal, getSubtotalWithoutDiscount }}
    >
      {children}
    </QuoteContext.Provider>
  );
};

export const useQuote = () => {
  const context = useContext(QuoteContext);
  if (!context) throw new Error("useQuote must be used within QuoteProvider");
  return context;
};
```

---

## 3. src/pages/Landing.tsx

```tsx
import { useNavigate } from "react-router-dom";
import { ArrowRight, HelpCircle, MessageCircle, Instagram, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import logo from "@/assets/logo-savecar.png";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <img src={logo} alt="SAVE CAR BRASIL" className="h-44 mb-8 object-contain" />
        <h1 className="text-2xl font-bold text-center text-foreground mb-3">
          Proteção Veicular <span className="text-primary">de Verdade</span>
        </h1>
        <p className="text-muted-foreground text-center mb-10 max-w-xs">
          Proteja seu veículo com as melhores coberturas do mercado. Simples, rápido e seguro.
        </p>
        <Button onClick={() => navigate("/cotacao")} className="w-full max-w-xs h-14 text-base font-bold rounded-xl shadow-lg" size="lg">
          Cotação em menos de 30 segundos
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
      <div className="px-6 pb-8 space-y-3 max-w-xs mx-auto w-full">
        <a href="#" className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm text-foreground hover:bg-muted transition-colors">
          <HelpCircle className="h-5 w-5 text-primary" />
          Dúvidas sobre a cotação?
        </a>
        <a href="https://wa.me/5500000000000" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm text-foreground hover:bg-muted transition-colors">
          <MessageCircle className="h-5 w-5 text-primary" />
          Atendimento pelo WhatsApp
        </a>
      </div>
      <footer className="px-6 pb-6 text-center">
        <div className="flex items-center justify-center gap-4 mb-4">
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors"><Instagram className="h-5 w-5" /></a>
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors"><Facebook className="h-5 w-5" /></a>
        </div>
        <p className="text-xs text-muted-foreground">© 2026 SAVE CAR BRASIL. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default Landing;
```

---

## 4. src/pages/Quote.tsx (639 linhas)

```tsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, AlertCircle, Loader2, Car, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SearchableSelect from "@/components/SearchableSelect";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import ProgressSteps from "@/components/ProgressSteps";
import { useQuote } from "@/contexts/QuoteContext";
import { toast } from "sonner";
import { maskCPF, maskPhone, maskCEP, maskPlate, validateCPF } from "@/lib/masks";
import { supabase } from "@/integrations/supabase/client";

interface FipeOption {
  code: string;
  name: string;
}

const Quote = () => {
  const navigate = useNavigate();
  const { quote, updatePersonal, updateVehicle, updateAddress, setSessionId, setCrmQuotationCode, setCrmNegotiationCode } = useQuote();
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [plateLoading, setPlateLoading] = useState(false);
  const [plateConsulted, setPlateConsulted] = useState(false);

  // FIPE cascade state
  const [brands, setBrands] = useState<FipeOption[]>([]);
  const [models, setModels] = useState<FipeOption[]>([]);
  const [years, setYears] = useState<FipeOption[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [yearsLoading, setYearsLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [fipeError, setFipeError] = useState("");

  const vehicleTypeMap: Record<string, string> = {
    carro: 'cars',
    moto: 'motorcycles',
    caminhao: 'trucks',
  };

  const getApiType = () => vehicleTypeMap[quote.vehicle.type] || 'cars';

  const callFipe = useCallback(async (action: string, params: Record<string, string> = {}) => {
    const { data, error } = await supabase.functions.invoke("consulta-placa", {
      body: { action, ...params },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const loadBrands = useCallback(async (apiType: string) => {
    setBrandsLoading(true);
    setBrands([]);
    setModels([]);
    setYears([]);
    setFipeError("");
    try {
      const data = await callFipe("brands", { vehicleType: apiType });
      setBrands(data.map((b: any) => ({ code: String(b.code), name: b.name })));
    } catch {
      setFipeError("Erro ao carregar marcas.");
    } finally {
      setBrandsLoading(false);
    }
  }, [callFipe]);

  useEffect(() => {
    loadBrands(getApiType());
  }, []);

  const handleTypeChange = (type: string) => {
    updateVehicle({ type, brandCode: "", brand: "", modelCode: "", model: "", yearCode: "", year: "", fipeValue: 0, fipeFormatted: "" });
    const apiType = vehicleTypeMap[type] || 'cars';
    loadBrands(apiType);
  };

  const handleBrandChange = async (brandCode: string) => {
    const brand = brands.find(b => b.code === brandCode);
    updateVehicle({ brandCode, brand: brand?.name || "", modelCode: "", model: "", yearCode: "", year: "", fipeValue: 0, fipeFormatted: "" });
    setModels([]);
    setYears([]);
    setFipeError("");
    setModelsLoading(true);
    try {
      const data = await callFipe("models", { brandCode, vehicleType: getApiType() });
      setModels(data.map((m: any) => ({ code: String(m.code), name: m.name })));
    } catch {
      setFipeError("Erro ao carregar modelos.");
    } finally {
      setModelsLoading(false);
    }
  };

  const handleModelChange = async (modelCode: string) => {
    const model = models.find(m => m.code === modelCode);
    updateVehicle({ modelCode, model: model?.name || "", yearCode: "", year: "", fipeValue: 0, fipeFormatted: "" });
    setYears([]);
    setFipeError("");
    setYearsLoading(true);
    try {
      const data = await callFipe("years", { brandCode: quote.vehicle.brandCode, modelCode, vehicleType: getApiType() });
      setYears(data.map((y: any) => ({ code: String(y.code), name: y.name })));
    } catch {
      setFipeError("Erro ao carregar anos.");
    } finally {
      setYearsLoading(false);
    }
  };

  const handleYearChange = async (yearCode: string) => {
    const year = years.find(y => y.code === yearCode);
    updateVehicle({ yearCode, year: year?.name || "" });
    setFipeError("");
    setPriceLoading(true);
    try {
      const data = await callFipe("price", { brandCode: quote.vehicle.brandCode, modelCode: quote.vehicle.modelCode, yearCode, vehicleType: getApiType() });
      const priceStr = String(data.price || "");
      const numericValue = Number(priceStr.replace(/[R$\s.]/g, "").replace(",", ".")) || 0;
      updateVehicle({
        yearCode,
        year: year?.name || "",
        fipeValue: numericValue,
        fipeFormatted: priceStr || "",
        brand: data.brand || quote.vehicle.brand,
        model: data.model || quote.vehicle.model,
      });
    } catch {
      setFipeError("Erro ao consultar valor FIPE.");
    } finally {
      setPriceLoading(false);
    }
  };

  const handleConsultaPlaca = async () => {
    const plateClean = quote.vehicle.plate.replace(/[^A-Za-z0-9]/g, "");
    if (plateClean.length < 7) {
      setErrors({ plate: "Placa inválida" });
      return;
    }
    setPlateLoading(true);
    setFipeError("");
    try {
      const { data, error } = await supabase.functions.invoke("consulta-placa-crm", {
        body: { personal: quote.personal, plate: quote.vehicle.plate },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.quotationCode) {
        setCrmQuotationCode(data.quotationCode);
        if (data.negotiationCode) setCrmNegotiationCode(data.negotiationCode);
      }

      if (data?.vehicle) {
        const v = data.vehicle;
        updateVehicle({
          brand: v.brand || "",
          model: v.model || "",
          year: v.year || "",
          color: v.color || "",
          type: v.type || "carro",
        });
        if (v.brand && v.model) {
          setPlateConsulted(true);
          toast.success("Veículo identificado com sucesso!");
        } else {
          setPlateConsulted(false);
          toast.info("Veículo não identificado pelo CRM. Preencha manualmente.");
        }
      } else {
        setPlateConsulted(false);
        toast.info("Veículo não identificado. Preencha manualmente.");
      }
    } catch (e: any) {
      console.error("Consulta placa error:", e);
      toast.error("Erro ao consultar placa. Preencha manualmente.");
    } finally {
      setPlateLoading(false);
    }
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!quote.personal.name.trim()) e.name = "Nome é obrigatório";
    if (!quote.personal.email.includes("@")) e.email = "E-mail inválido";
    if (quote.personal.phone.replace(/\D/g, "").length < 11) e.phone = "Telefone inválido";
    if (!validateCPF(quote.personal.cpf)) e.cpf = "CPF inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (quote.vehicle.plate.replace(/[^A-Za-z0-9]/g, "").length < 7) e.plate = "Placa inválida";
    if (!plateConsulted) {
      if (!quote.vehicle.brandCode) e.brand = "Selecione a marca";
      if (!quote.vehicle.modelCode) e.model = "Selecione o modelo";
      if (!quote.vehicle.yearCode) e.year = "Selecione o ano";
    } else {
      if (!quote.vehicle.brand) e.brand = "Marca não identificada";
      if (!quote.vehicle.model) e.model = "Modelo não identificado";
    }
    if (!quote.vehicle.type) e.type = "Selecione o tipo";
    if (!quote.vehicle.usage) e.usage = "Selecione o uso";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = () => {
    const e: Record<string, string> = {};
    if (quote.address.cep.replace(/\D/g, "").length < 8) e.cep = "CEP inválido";
    if (!quote.address.street.trim()) e.street = "Rua é obrigatória";
    if (!quote.address.neighborhood.trim()) e.neighborhood = "Bairro é obrigatório";
    if (!quote.address.noNumber && !quote.address.number.trim()) e.number = "Número é obrigatório";
    if (!quote.address.state.trim()) e.state = "Estado é obrigatório";
    if (!quote.address.city.trim()) e.city = "Cidade é obrigatória";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
    else if (step === 3 && validateStep3()) {
      setSubmitting(true);
      try {
        if (quote.crmQuotationCode) {
          const { data } = await supabase.functions.invoke("submit-to-crm", {
            body: {
              personal: quote.personal,
              vehicle: quote.vehicle,
              address: quote.address,
              plan: {},
              skipCrm: true,
            },
          });
          if (data?.session_id) setSessionId(data.session_id);
        } else {
          const { data, error } = await supabase.functions.invoke("submit-to-crm", {
            body: {
              personal: quote.personal,
              vehicle: quote.vehicle,
              address: quote.address,
              plan: {},
            },
          });
          if (error) throw error;
          if (data?.session_id) setSessionId(data.session_id);
        }
        navigate("/resultado");
      } catch (e) {
        console.error("Submit error:", e);
        navigate("/resultado");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (step === 1) navigate("/");
    else setStep(step - 1);
  };

  const fetchCEP = async (cep: string) => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const data = await res.json();
        if (!data.erro) {
          updateAddress({
            street: data.logradouro || "",
            neighborhood: data.bairro || "",
            city: data.localidade || "",
            state: data.uf || "",
          });
        }
      } catch {}
    }
  };

  // ... (JSX com formulário de 3 etapas: Dados Pessoais, Veículo, Endereço)
  // Step 1: Nome, Email, Telefone, CPF
  // Step 2: Placa + Consultar CRM, Tipo, Marca (SearchableSelect), Modelo, Ano, Valor FIPE
  // Step 3: CEP + auto-fill, Rua, Bairro, Número, Complemento, Estado, Cidade
  // Botões: Voltar / Avançar

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <ProgressSteps currentStep={step} />
      <div className="flex-1 px-6 pb-8">
        {/* Step 1: Dados Pessoais */}
        {/* Step 2: Dados do Veículo (com consulta placa CRM + seleção manual FIPE) */}
        {/* Step 3: Endereço (com consulta CEP via ViaCEP) */}
        {/* Botões Voltar/Avançar */}
      </div>
    </div>
  );
};

export default Quote;
```

---

## 5. src/pages/Result.tsx

```tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import { useQuote } from "@/contexts/QuoteContext";
import { supabase } from "@/integrations/supabase/client";

const Result = () => {
  const navigate = useNavigate();
  const { quote, resetQuote, setCrmPlans } = useQuote();
  const [loadingPlans, setLoadingPlans] = useState(false);

  useEffect(() => {
    const fetchCrmPlans = async () => {
      if (!quote.sessionId) return;
      try {
        const { data } = await supabase
          .from("quotes")
          .select("crm_quotation_code")
          .eq("session_id", quote.sessionId)
          .single();
        if (!data?.crm_quotation_code) return;
        setLoadingPlans(true);
        const { data: plansData, error } = await supabase.functions.invoke("get-crm-plans", {
          body: { quotationCode: data.crm_quotation_code },
        });
        if (!error && plansData?.plans?.length > 0) {
          setCrmPlans(plansData.plans);
        }
      } catch (err) {
        console.error("Error fetching CRM plans:", err);
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchCrmPlans();
  }, [quote.sessionId, setCrmPlans]);

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
          <Button onClick={() => navigate("/detalhes")} className="w-full h-13 rounded-xl font-bold text-base" disabled={loadingPlans}>
            {loadingPlans ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" />Carregando planos...</>) : (<>Continuar<ArrowRight className="ml-2 h-5 w-5" /></>)}
          </Button>
          <Button variant="outline" onClick={() => { resetQuote(); navigate("/cotacao"); }} className="w-full h-12 rounded-xl">
            <RotateCcw className="mr-2 h-4 w-4" />Nova cotação
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Result;
```

---

## 6. src/pages/PlanDetails.tsx

```tsx
// Página de seleção de plano (COMPLETO/PREMIUM), coberturas, período (mensal/anual),
// forma de pagamento (cartão com 10% OFF / PIX-boleto), cupom, resumo financeiro.
// Botão "Contratar" navega para /vistoria.
// Componentes usados: PaymentMethodSelector, FinancialSummary, WhatsAppButton
```

---

## 7. src/pages/Inspection.tsx

```tsx
// Acompanhamento da vistoria com 4 status: pending, released, approved, rejected.
// Polling a cada 15s via supabase.from("quotes").select("inspection_status, inspection_link")
// Se pending, tenta buscar link via edge function get-inspection-link.
// Se released + link, mostra botão "Fazer Vistoria" (abre link externo).
// Se approved, mostra botão "Continuar para Pagamento" → /pagamento.
```

---

## 8. src/pages/Payment.tsx

```tsx
// Gate: verifica se inspection_status === "approved", senão redireciona para /vistoria.
// Mostra resumo da contratação, FinancialSummary.
// Se cartão: informa que dados serão coletados via WhatsApp após aprovação.
// Se PIX: mostra chave PIX "savecar@savecar.com.br" com botão copiar.
// Checkbox aceitar termos → Botão Finalizar → /confirmacao.
```

---

## 9. src/pages/Confirmation.tsx

```tsx
// Tela de sucesso com ícone CheckCircle, resumo (veículo, placa, plano).
// Botão "Voltar ao início" que faz resetQuote() + navega para /.
```

---

## 10. src/pages/Admin.tsx

```tsx
// Painel protegido por senha "Save@2026".
// Lista todas as cotações (quotes) ordenadas por data desc.
// Mostra: nome, telefone, veículo, placa, data, status CRM, status vistoria.
// Input para link de vistoria.
// Botões: Liberar Vistoria, Aprovar, Reprovar (via edge function update-inspection).
```

---

## 11. COMPONENTES

### src/components/Header.tsx
```tsx
// Logo Save Car centralizada, fundo branco.
```

### src/components/ProgressSteps.tsx
```tsx
// Barra de progresso 3 etapas: "Seus Dados", "Veículo", "Endereço"
```

### src/components/FinancialSummary.tsx
```tsx
// Card com: Plano (nome + período), desconto cartão 10%, taxa ativação R$ 299,90, total.
// Usa getTotal() e getSubtotalWithoutDiscount() do QuoteContext.
```

### src/components/PaymentMethodSelector.tsx
```tsx
// Grid 2 colunas: Cartão de Crédito (com badge "10% OFF") / PIX-Boleto.
```

### src/components/SearchableSelect.tsx
```tsx
// Combobox com busca (Command/Popover do shadcn). Usado para marca e modelo FIPE.
```

### src/components/CardForm.tsx
```tsx
// Formulário de cartão: número, validade, CVV, nome titular. (Não usado atualmente)
```

### src/components/WhatsAppButton.tsx
```tsx
// Botão flutuante verde no canto inferior direito, abre wa.me.
```

### src/components/NavLink.tsx
```tsx
// Wrapper do NavLink do react-router com suporte a className condicional.
```

---

## 12. src/lib/masks.ts

```tsx
export const maskCPF = (value: string): string => {
  return value.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

export const maskPhone = (value: string): string => {
  return value.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
};

export const maskCEP = (value: string): string => {
  return value.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
};

export const maskPlate = (value: string): string => {
  return value.toUpperCase().slice(0, 7);
};

export const maskCardNumber = (value: string): string => {
  return value.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
};

export const maskExpiry = (value: string): string => {
  return value.replace(/\D/g, "").slice(0, 4).replace(/(\d{2})(\d)/, "$1/$2");
};

export const maskCVV = (value: string): string => {
  return value.replace(/\D/g, "").slice(0, 3);
};

export const validateCPF = (cpf: string): boolean => {
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11 || /^(\d)\1+$/.test(clean)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(clean[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  return rest === parseInt(clean[10]);
};
```

---

## 13. src/index.css (Design Tokens)

```css
:root {
  --background: 0 0% 97%;
  --foreground: 160 75% 10%;
  --card: 0 0% 100%;
  --primary: 153 75% 21%;          /* Verde escuro Save Car */
  --primary-foreground: 0 0% 100%;
  --secondary: 43 90% 49%;         /* Dourado/amarelo */
  --muted: 150 10% 92%;
  --muted-foreground: 160 10% 45%;
  --accent: 43 90% 49%;
  --destructive: 0 84% 60%;
  --border: 150 15% 88%;
  --ring: 153 75% 21%;
  --radius: 0.75rem;
}
/* Fontes: Inter (body) + Poppins (headings) */
```

---

## 14. EDGE FUNCTIONS

### supabase/functions/consulta-placa/index.ts
```typescript
// Proxy para API FIPE (https://fipe.parallelum.com.br/api/v2)
// Ações: brands, models, years, price
// Usa token FIPE_ONLINE_TOKEN
// Suporta: cars, motorcycles, trucks
```

### supabase/functions/consulta-placa-crm/index.ts
```typescript
// Fluxo completo:
// 1. POST /api/quotation/add → cria cotação no Power CRM
// 2. POST /api/quotation/add-tag → adiciona tag "30 seg" (tagId: 23323)
// 3. POST /api/quotation/open-inspection → abre vistoria
// 4. Aguarda 5 segundos (processamento DENATRAN)
// 5. GET /api/negotiation/{negotiationCode} → tenta buscar dados do veículo
// 6. GET /api/quotation/quotationFipeApi?quotationCode=xxx → busca dados FIPE
// 7. GET /api/quotation/{quotationCode} → fallback final
// 8. Retorna: { quotationCode, negotiationCode, vehicle }
// Usa token POWERCRM_API_TOKEN
```

### supabase/functions/submit-to-crm/index.ts
```typescript
// 1. Salva cotação na tabela quotes (Supabase)
// 2. Se skipCrm=true, pula envio ao CRM (já criado via consulta-placa-crm)
// 3. Se skipCrm=false:
//    - Resolve códigos estado/cidade via utilities.powercrm.com.br
//    - POST /api/quotation/add com observation detalhada (TAG 30 seg, plano, associado, veículo, endereço, coberturas)
//    - POST /api/quotation/add-tag (tagId: 23323)
//    - POST /api/quotation/open-inspection
//    - GET /api/quotation/{code} → busca link de vistoria
// 4. Atualiza quotes com resultado CRM
// 5. Retorna { session_id, crm_submitted, crm_quotation_code, crm_error }
```

### supabase/functions/get-crm-plans/index.ts
```typescript
// GET /api/quotation/plansQuotation?quotationCode=xxx
// Retorna planos com nome, preço mensal/anual, coberturas
// Usa token POWERCRM_API_TOKEN
```

### supabase/functions/get-inspection-link/index.ts
```typescript
// 1. Busca quote no DB pelo session_id
// 2. Se já tem inspection_link, retorna
// 3. Se não, GET /api/quotation/{code} no CRM → busca inspectionLink
// 4. Se encontrar, atualiza DB e retorna
```

### supabase/functions/update-inspection/index.ts
```typescript
// Atualiza inspection_status e inspection_link na tabela quotes
// Status válidos: pending, released, approved, rejected
```

---

## 15. CONFIGURAÇÃO

### supabase/config.toml
```toml
project_id = "vjrzedpujsdcyeoqbzfg"

[functions.consulta-placa]
verify_jwt = false

[functions.submit-to-crm]
verify_jwt = false

[functions.update-inspection]
verify_jwt = false

[functions.get-inspection-link]
verify_jwt = false

[functions.get-crm-plans]
verify_jwt = false

[functions.consulta-placa-crm]
verify_jwt = false
```

### Secrets necessários
- `POWERCRM_API_TOKEN` — Token Bearer da API Power CRM
- `FIPE_ONLINE_TOKEN` — Token X-Subscription-Token da API FIPE Parallelum
- `SUPABASE_URL` — URL do projeto Supabase (automático)
- `SUPABASE_SERVICE_ROLE_KEY` — Chave service role (automático)

---

## 16. BANCO DE DADOS

### Tabela: public.quotes
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID (PK) | Auto-gerado |
| session_id | TEXT | Identificador da sessão |
| personal_data | JSONB | { name, email, phone, cpf } |
| vehicle_data | JSONB | { plate, model, brand, year, type, usage, fipeValue, fipeFormatted, brandCode, modelCode, yearCode } |
| address_data | JSONB | { cep, street, neighborhood, number, complement, state, city, noNumber } |
| plan_data | JSONB | { planName, total, coverages, activationFee, billingPeriod, paymentMethod } |
| crm_quotation_code | TEXT | Código da cotação no Power CRM |
| crm_submitted | BOOLEAN | Se foi enviado ao CRM com sucesso |
| crm_error | TEXT | Mensagem de erro do CRM (se houver) |
| inspection_status | TEXT | pending, released, approved, rejected |
| inspection_link | TEXT | Link da vistoria (appvisto) |
| created_at | TIMESTAMPTZ | Data de criação |
| updated_at | TIMESTAMPTZ | Última atualização |

---

## 17. FLUXO DO USUÁRIO

```
1. Landing (/) → Botão "Cotação em 30 seg"
2. Quote (/cotacao) → Step 1: Dados pessoais
3. Quote (/cotacao) → Step 2: Placa + consulta CRM ou seleção manual FIPE
4. Quote (/cotacao) → Step 3: Endereço (CEP auto-fill via ViaCEP)
5. Submit → Edge function submit-to-crm → Salva DB + envia CRM
6. Result (/resultado) → Mostra valor FIPE + carrega planos CRM
7. PlanDetails (/detalhes) → Escolhe plano, pagamento, vê coberturas
8. Inspection (/vistoria) → Aguarda liberação/aprovação da vistoria
9. Payment (/pagamento) → Resumo + aceitar termos + finalizar
10. Confirmation (/confirmacao) → Tela de sucesso
```

---

## 18. APIs EXTERNAS

### Power CRM (api.powercrm.com.br)
- `POST /api/quotation/add` — Criar cotação
- `POST /api/quotation/add-tag` — Adicionar tag
- `POST /api/quotation/open-inspection` — Abrir vistoria
- `GET /api/quotation/{code}` — Detalhes da cotação
- `GET /api/negotiation/{code}` — Detalhes da negociação (veículo)
- `GET /api/quotation/quotationFipeApi?quotationCode=xxx` — Dados FIPE do veículo
- `GET /api/quotation/plansQuotation?quotationCode=xxx` — Planos disponíveis

### FIPE Parallelum (fipe.parallelum.com.br/api/v2)
- `GET /{type}/brands` — Marcas
- `GET /{type}/brands/{id}/models` — Modelos
- `GET /{type}/brands/{id}/models/{id}/years` — Anos
- `GET /{type}/brands/{id}/models/{id}/years/{id}` — Preço

### Utilities Power CRM (utilities.powercrm.com.br)
- `GET /state/stt` — Lista de estados
- `GET /city/ct?st={id}` — Cidades por estado

### ViaCEP (viacep.com.br)
- `GET /ws/{cep}/json/` — Busca endereço por CEP
