import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, AlertCircle, Loader2, Car } from "lucide-react";
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
import { maskCPF, maskPhone, maskCEP, maskPlate, validateCPF } from "@/lib/masks";
import { supabase } from "@/integrations/supabase/client";

interface FipeOption {
  code: string;
  name: string;
}

const Quote = () => {
  const navigate = useNavigate();
  const { quote, updatePersonal, updateVehicle, updateAddress, setSessionId } = useQuote();
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

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

  // Load brands on mount
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
      // data.price comes as formatted BRL string like "R$ 28.152,00"
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
    if (!quote.vehicle.brandCode) e.brand = "Selecione a marca";
    if (!quote.vehicle.modelCode) e.model = "Selecione o modelo";
    if (!quote.vehicle.yearCode) e.year = "Selecione o ano";
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
        const { data, error } = await supabase.functions.invoke("submit-to-crm", {
          body: {
            personal: quote.personal,
            vehicle: quote.vehicle,
            address: quote.address,
            plan: {},
          },
        });
        if (error) throw error;
        if (data?.session_id) {
          setSessionId(data.session_id);
        }
        navigate("/resultado");
      } catch (e) {
        console.error("Submit error:", e);
        // Navigate anyway — CRM failure shouldn't block user
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

  const ErrorMsg = ({ field }: { field: string }) =>
    errors[field] ? (
      <p className="text-destructive text-xs mt-1 flex items-center gap-1">
        <AlertCircle className="h-3 w-3" /> {errors[field]}
      </p>
    ) : null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <ProgressSteps currentStep={step} />

      <div className="flex-1 px-6 pb-8">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Seus Dados</h2>
            <div>
              <Label>Nome completo</Label>
              <Input placeholder="Digite seu nome" value={quote.personal.name} onChange={(e) => updatePersonal({ name: e.target.value })} />
              <ErrorMsg field="name" />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" placeholder="seu@email.com" value={quote.personal.email} onChange={(e) => updatePersonal({ email: e.target.value })} />
              <ErrorMsg field="email" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input placeholder="(00) 00000-0000" value={quote.personal.phone} onChange={(e) => updatePersonal({ phone: maskPhone(e.target.value) })} />
              <ErrorMsg field="phone" />
            </div>
            <div>
              <Label>CPF</Label>
              <Input placeholder="000.000.000-00" value={quote.personal.cpf} onChange={(e) => updatePersonal({ cpf: maskCPF(e.target.value) })} />
              <ErrorMsg field="cpf" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Dados do Veículo</h2>
            
            <div>
              <Label>Placa do veículo</Label>
              <Input
                placeholder="ABC1D23"
                value={quote.vehicle.plate}
                onChange={(e) => updateVehicle({ plate: maskPlate(e.target.value) })}
              />
              <ErrorMsg field="plate" />
            </div>

            {/* Tipo do veículo */}
            <div>
              <Label>Tipo do veículo</Label>
              <Select value={quote.vehicle.type} onValueChange={handleTypeChange}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="carro">Carro</SelectItem>
                  <SelectItem value="moto">Moto</SelectItem>
                  <SelectItem value="caminhao">Caminhão / Pick-up</SelectItem>
                </SelectContent>
              </Select>
              <ErrorMsg field="type" />
            </div>

            {/* Marca */}
            <div>
              <Label>Marca</Label>
              <SearchableSelect
                options={brands}
                value={quote.vehicle.brandCode}
                onValueChange={handleBrandChange}
                placeholder="Selecione a marca"
                searchPlaceholder="Buscar marca..."
                emptyMessage="Nenhuma marca encontrada."
                loading={brandsLoading}
                loadingMessage="Carregando marcas..."
              />
              <ErrorMsg field="brand" />
            </div>

            {/* Modelo */}
            <div>
              <Label>Modelo</Label>
              <SearchableSelect
                options={models}
                value={quote.vehicle.modelCode}
                onValueChange={handleModelChange}
                placeholder="Selecione o modelo"
                searchPlaceholder="Buscar modelo..."
                emptyMessage="Nenhum modelo encontrado."
                disabled={!quote.vehicle.brandCode}
                loading={modelsLoading}
                loadingMessage="Carregando modelos..."
              />
              <ErrorMsg field="model" />
            </div>

            {/* Ano */}
            <div>
              <Label>Ano</Label>
              <Select value={quote.vehicle.yearCode} onValueChange={handleYearChange} disabled={!quote.vehicle.modelCode || yearsLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={yearsLoading ? "Carregando anos..." : "Selecione o ano"} />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y.code} value={y.code}>{y.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {yearsLoading && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Carregando...</p>}
              <ErrorMsg field="year" />
            </div>

            {/* FIPE Price Loading */}
            {priceLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Consultando valor FIPE...</span>
              </div>
            )}

            {/* FIPE Error */}
            {fipeError && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{fipeError}</span>
              </div>
            )}

            {/* FIPE Value Card */}
            {quote.vehicle.fipeFormatted && !priceLoading && !fipeError && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                    <Car className="h-4 w-4" />
                    <span>Valor FIPE</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Marca</p>
                      <p className="font-medium text-foreground">{quote.vehicle.brand}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Ano</p>
                      <p className="font-medium text-foreground">{quote.vehicle.year}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs">Modelo</p>
                      <p className="font-medium text-foreground">{quote.vehicle.model}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs">Valor FIPE</p>
                      <p className="font-bold text-primary text-lg">{quote.vehicle.fipeFormatted}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            <div>
              <Label>Uso do veículo</Label>
              <Select value={quote.vehicle.usage} onValueChange={(v) => updateVehicle({ usage: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="particular">Particular</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="aplicativo">Aplicativo</SelectItem>
                </SelectContent>
              </Select>
              <ErrorMsg field="usage" />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Endereço</h2>
            <div>
              <Label>CEP</Label>
              <Input
                placeholder="00000-000"
                value={quote.address.cep}
                onChange={(e) => {
                  const masked = maskCEP(e.target.value);
                  updateAddress({ cep: masked });
                  fetchCEP(masked);
                }}
              />
              <ErrorMsg field="cep" />
            </div>
            <div>
              <Label>Rua</Label>
              <Input value={quote.address.street} onChange={(e) => updateAddress({ street: e.target.value })} />
              <ErrorMsg field="street" />
            </div>
            <div>
              <Label>Bairro</Label>
              <Input value={quote.address.neighborhood} onChange={(e) => updateAddress({ neighborhood: e.target.value })} />
              <ErrorMsg field="neighborhood" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Número</Label>
                <Input value={quote.address.number} disabled={quote.address.noNumber} onChange={(e) => updateAddress({ number: e.target.value })} />
                <ErrorMsg field="number" />
              </div>
              <div>
                <Label>Complemento</Label>
                <Input value={quote.address.complement} onChange={(e) => updateAddress({ complement: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={quote.address.noNumber} onCheckedChange={(checked) => updateAddress({ noNumber: !!checked, number: "" })} />
              <Label className="text-sm text-muted-foreground cursor-pointer">Não tenho número</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Estado</Label>
                <Input value={quote.address.state} onChange={(e) => updateAddress({ state: e.target.value })} />
                <ErrorMsg field="state" />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input value={quote.address.city} onChange={(e) => updateAddress({ city: e.target.value })} />
                <ErrorMsg field="city" />
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-8">
          <Button variant="outline" onClick={handleBack} className="flex-1 h-12 rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={handleNext} disabled={submitting} className="flex-1 h-12 rounded-xl font-bold">
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                Avançar
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Quote;
