import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/Header";
import ProgressSteps from "@/components/ProgressSteps";
import { useQuote } from "@/contexts/QuoteContext";
import { maskCPF, maskPhone, maskCEP, maskPlate, validateCPF } from "@/lib/masks";

const Quote = () => {
  const navigate = useNavigate();
  const { quote, updatePersonal, updateVehicle, updateAddress } = useQuote();
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    if (quote.vehicle.plate.replace(/\D/g, "").length < 7 && quote.vehicle.plate.length < 7) e.plate = "Placa inválida";
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

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) {
      if (!quote.vehicle.model) updateVehicle({ model: "Modelo Identificado (placeholder)" });
      setStep(3);
    } else if (step === 3 && validateStep3()) navigate("/resultado");
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
              <Input
                placeholder="Digite seu nome"
                value={quote.personal.name}
                onChange={(e) => updatePersonal({ name: e.target.value })}
              />
              <ErrorMsg field="name" />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={quote.personal.email}
                onChange={(e) => updatePersonal({ email: e.target.value })}
              />
              <ErrorMsg field="email" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                placeholder="(00) 00000-0000"
                value={quote.personal.phone}
                onChange={(e) => updatePersonal({ phone: maskPhone(e.target.value) })}
              />
              <ErrorMsg field="phone" />
            </div>
            <div>
              <Label>CPF</Label>
              <Input
                placeholder="000.000.000-00"
                value={quote.personal.cpf}
                onChange={(e) => updatePersonal({ cpf: maskCPF(e.target.value) })}
              />
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
            {quote.vehicle.model && (
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-sm text-primary">
                <Check className="h-4 w-4" />
                <span>{quote.vehicle.model}</span>
              </div>
            )}
            <a href="#" className="text-xs text-primary underline">Algum problema com a placa?</a>
            <div>
              <Label>Tipo do veículo</Label>
              <Select value={quote.vehicle.type} onValueChange={(v) => updateVehicle({ type: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="carro">Carro</SelectItem>
                  <SelectItem value="moto">Moto</SelectItem>
                  <SelectItem value="suv">Pick-up / Caminhonete / SUV</SelectItem>
                </SelectContent>
              </Select>
              <ErrorMsg field="type" />
            </div>
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
                <Input
                  value={quote.address.number}
                  disabled={quote.address.noNumber}
                  onChange={(e) => updateAddress({ number: e.target.value })}
                />
                <ErrorMsg field="number" />
              </div>
              <div>
                <Label>Complemento</Label>
                <Input value={quote.address.complement} onChange={(e) => updateAddress({ complement: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={quote.address.noNumber}
                onCheckedChange={(checked) => updateAddress({ noNumber: !!checked, number: "" })}
              />
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

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-8">
          <Button variant="outline" onClick={handleBack} className="flex-1 h-12 rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={handleNext} className="flex-1 h-12 rounded-xl font-bold">
            Avançar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Quote;
