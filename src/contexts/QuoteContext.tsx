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
  coupon: string;
  sessionId: string;
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
  sessionId: localStorage.getItem("savecar_session_id") || "",
  coupon: "",
};

interface QuoteContextType {
  quote: QuoteData;
  updatePersonal: (data: Partial<PersonalData>) => void;
  updateVehicle: (data: Partial<VehicleData>) => void;
  updateAddress: (data: Partial<AddressData>) => void;
  setBillingPeriod: (period: "monthly" | "annual") => void;
  setPlanName: (plan: PlanName) => void;
  setCoupon: (coupon: string) => void;
  setSessionId: (id: string) => void;
  resetQuote: () => void;
  getTotal: () => number;
}

const QuoteContext = createContext<QuoteContextType | undefined>(undefined);

export const QuoteProvider = ({ children }: { children: ReactNode }) => {
  const [quote, setQuote] = useState<QuoteData>(defaultQuote);

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

  const setCoupon = (coupon: string) => setQuote((prev) => ({ ...prev, coupon }));

  const setSessionId = (id: string) => {
    localStorage.setItem("savecar_session_id", id);
    setQuote((prev) => ({ ...prev, sessionId: id }));
  };

  const resetQuote = () => setQuote(defaultQuote);

  const getTotal = () => {
    const base = quote.billingPeriod === "monthly" ? quote.monthlyPrice : quote.annualPrice;
    // PREMIUM adds a surcharge
    const planMultiplier = quote.planName === "PREMIUM" ? 1.35 : 1;
    return base * planMultiplier;
  };

  return (
    <QuoteContext.Provider
      value={{ quote, updatePersonal, updateVehicle, updateAddress, setBillingPeriod, setPlanName, setCoupon, setSessionId, resetQuote, getTotal }}
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
