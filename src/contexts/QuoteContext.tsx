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

export interface OptionalCoverage {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  selected: boolean;
}

export interface QuoteData {
  personal: PersonalData;
  vehicle: VehicleData;
  address: AddressData;
  monthlyPrice: number;
  annualPrice: number;
  activationFee: number;
  vehicleValue: string;
  billingPeriod: "monthly" | "annual";
  optionalCoverages: OptionalCoverage[];
  coupon: string;
}

const defaultQuote: QuoteData = {
  personal: { name: "", email: "", phone: "", cpf: "" },
  vehicle: { plate: "", model: "", type: "", usage: "", brand: "", year: "", color: "", fipeValue: 0, fipeFormatted: "" },
  address: { cep: "", street: "", neighborhood: "", number: "", complement: "", state: "", city: "", noNumber: false },
  monthlyPrice: 189.9,
  annualPrice: 1899.0,
  activationFee: 299.9,
  vehicleValue: "R$ 50.000 — R$ 70.000",
  billingPeriod: "monthly",
  optionalCoverages: [
    {
      id: "collision",
      name: "Colisão + Terceiros + APP",
      description: "Cobertura para danos causados por colisão, proteção contra terceiros e Acidentes Pessoais de Passageiros.",
      monthlyPrice: 49.9,
      annualPrice: 499.0,
      selected: false,
    },
    {
      id: "glass",
      name: "Vidros Completo",
      description: "Cobertura para todos os vidros do veículo: para-brisa, traseiro, laterais e retrovisores.",
      monthlyPrice: 29.9,
      annualPrice: 299.0,
      selected: false,
    },
  ],
  coupon: "",
};

interface QuoteContextType {
  quote: QuoteData;
  updatePersonal: (data: Partial<PersonalData>) => void;
  updateVehicle: (data: Partial<VehicleData>) => void;
  updateAddress: (data: Partial<AddressData>) => void;
  setBillingPeriod: (period: "monthly" | "annual") => void;
  toggleOptionalCoverage: (id: string) => void;
  setCoupon: (coupon: string) => void;
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

  const toggleOptionalCoverage = (id: string) =>
    setQuote((prev) => ({
      ...prev,
      optionalCoverages: prev.optionalCoverages.map((c) =>
        c.id === id ? { ...c, selected: !c.selected } : c
      ),
    }));

  const setCoupon = (coupon: string) => setQuote((prev) => ({ ...prev, coupon }));

  const resetQuote = () => setQuote(defaultQuote);

  const getTotal = () => {
    const base = quote.billingPeriod === "monthly" ? quote.monthlyPrice : quote.annualPrice;
    const extras = quote.optionalCoverages
      .filter((c) => c.selected)
      .reduce((sum, c) => sum + (quote.billingPeriod === "monthly" ? c.monthlyPrice : c.annualPrice), 0);
    return base + extras;
  };

  return (
    <QuoteContext.Provider
      value={{ quote, updatePersonal, updateVehicle, updateAddress, setBillingPeriod, toggleOptionalCoverage, setCoupon, resetQuote, getTotal }}
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
