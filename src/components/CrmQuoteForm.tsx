import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, ArrowRight, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SearchableSelect from "@/components/SearchableSelect";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuote } from "@/contexts/QuoteContext";
import { useAttendant } from "@/contexts/AttendantContext";
import { maskPhone, maskPlate } from "@/lib/masks";

type Opt = { id: number | string; text: string };

const VEHICLE_TYPES: Opt[] = [
  { id: 1, text: "Carro ou utilitário pequeno" },
  { id: 2, text: "Moto" },
  { id: 3, text: "Caminhão ou micro-ônibus" },
];

const call = async (action: string, extra: Record<string, unknown> = {}) => {
  const { data, error } = await supabase.functions.invoke("pwrcrm-quote", {
    body: { action, ...extra },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
};

const CrmQuoteForm = () => {
  const navigate = useNavigate();
  const {
    quote,
    setSessionId,
    updatePersonal,
    updateVehicle,
    updateAddress,
    setCrmQuotationCode,
  } = useQuote();
  const { attendant } = useAttendant();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [plate, setPlate] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [brand, setBrand] = useState("");
  const [year, setYear] = useState("");
  const [model, setModel] = useState("");
  const [stateId, setStateId] = useState("");
  const [cityId, setCityId] = useState("");
  const [isWork, setIsWork] = useState(false);
  const [lgpdConsent, setLgpdConsent] = useState(false);

  const [brands, setBrands] = useState<Opt[]>([]);
  const [years, setYears] = useState<Opt[]>([]);
  const [models, setModels] = useState<Opt[]>([]);
  const [states, setStates] = useState<Opt[]>([]);
  const [cities, setCities] = useState<Opt[]>([]);

  const [loading, setLoading] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const ensureSessionId = () => {
    if (quote.sessionId) return quote.sessionId;
    const id =
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    setSessionId(id);
    return id;
  };

  // Captura o lead parcial assim que houver telefone válido + consentimento LGPD
  const captureLead = async (converted = false) => {
    const digits = phone.replace(/\D/g, "");
    if (!lgpdConsent || digits.length < 10) return;
    try {
      await supabase.functions.invoke("capture-lead", {
        body: {
          sessionId: ensureSessionId(),
          phone: digits,
          name,
          email,
          attendantSlug: attendant?.slug || null,
          lgpdConsent: true,
          converted,
          vehicleInfo: { plate, vehicleType, brand, year, model, stateId, cityId, isWork },
        },
      });
    } catch (e) {
      console.error("capture-lead error", e);
    }
  };


  // load states once
  useEffect(() => {
    call("states")
      .then((r) => setStates(r.data || []))
      .catch(() => toast.error("Erro ao carregar estados"));
  }, []);

  // cascades
  useEffect(() => {
    setBrand("");
    setYear("");
    setModel("");
    setBrands([]);
    setYears([]);
    setModels([]);
    if (!vehicleType) return;
    setLoading("brands");
    call("brands", { vehicleType })
      .then((r) => setBrands(r.data || []))
      .catch(() => toast.error("Erro ao carregar marcas"))
      .finally(() => setLoading(null));
  }, [vehicleType]);

  useEffect(() => {
    setYear("");
    setModel("");
    setYears([]);
    setModels([]);
    if (!brand) return;
    setLoading("years");
    call("years", { branchId: brand })
      .then((r) => setYears(r.data || []))
      .catch(() => toast.error("Erro ao carregar anos"))
      .finally(() => setLoading(null));
  }, [brand]);

  useEffect(() => {
    setModel("");
    setModels([]);
    if (!brand || !year) return;
    setLoading("models");
    call("models", { branchId: brand, year })
      .then((r) => setModels(r.data || []))
      .catch(() => toast.error("Erro ao carregar modelos"))
      .finally(() => setLoading(null));
  }, [year]);

  useEffect(() => {
    setCityId("");
    setCities([]);
    if (!stateId) return;
    setLoading("cities");
    call("cities", { stateId })
      .then((r) => setCities(r.data || []))
      .catch(() => toast.error("Erro ao carregar cidades"))
      .finally(() => setLoading(null));
  }, [stateId]);

  const getValidationErrors = (): string[] => {
    const errors: string[] = [];
    if (name.trim().length <= 1) errors.push("Nome");
    if (phone.replace(/\D/g, "").length < 10) errors.push("Telefone");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.push("E-mail inválido");
    if (!vehicleType) errors.push("Tipo do veículo");
    if (!brand) errors.push("Marca");
    if (!year) errors.push("Ano");
    if (!model) errors.push("Modelo");
    if (!stateId) errors.push("Estado");
    if (!cityId) errors.push("Cidade");
    if (!lgpdConsent) errors.push("Autorização LGPD");
    return errors;
  };

  const canSubmit = !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const errors = getValidationErrors();
    if (errors.length > 0) {
      toast.error("Informações incompletas ou erradas para gerar cotação", {
        description: `Verifique: ${errors.join(", ")}`,
      });
      return;
    }
    setSubmitting(true);
    void captureLead(true);
    try {

      // 1) Cria cotação oficial no PowerCRM
      const submitRes = await call("submit", {
        payload: {
          clientName: name,
          clientEmail: email,
          clientPhone: phone,
          clientCity: cityId,
          vehiclePlate: plate,
          vehicleType,
          vehicleBranch: brand,
          vehicleModel: model,
          vehicleYear: year,
          vehicleIsWork: isWork,
          observation: attendant ? `Atendente: ${attendant.name} (${attendant.slug})` : "",
        },
        attendantSlug: attendant?.slug || null,
      });
      const qttnCd = submitRes.qttnCd;
      if (!qttnCd) throw new Error("CRM não retornou código de cotação");
      setCrmQuotationCode(qttnCd);

      // 2) Sincroniza dados no contexto Loovi
      updatePersonal({ name, email, phone, cpf: "" });
      const brandText = brands.find((b) => String(b.id) === brand)?.text || "";
      const modelText = models.find((m) => String(m.id) === model)?.text || "";
      const yearText = years.find((y) => String(y.id) === year)?.text || "";
      const stateText = states.find((s) => String(s.id) === stateId)?.text || "";
      const cityText = cities.find((c) => String(c.id) === cityId)?.text || "";

      updateVehicle({
        plate: plate.toUpperCase(),
        brand: brandText,
        model: modelText,
        year: yearText,
        type:
          vehicleType === "2"
            ? "moto"
            : vehicleType === "3"
            ? "caminhao"
            : "carro",
        usage: isWork ? "trabalho" : "particular",
        crmBrandId: Number(brand),
        crmModelId: Number(model),
        crmYearId: Number(year),
      });
      updateAddress({ state: stateText, city: cityText, cep: "", street: "", neighborhood: "", number: "", complement: "", noNumber: false });

      toast.success("Cotação enviada! Carregando seus planos...");
      navigate(`/planos?h=${encodeURIComponent(qttnCd)}`);
    } catch (err) {
      console.error("submit pwrcrm error", err);
      toast.error("Informações incompletas ou erradas para gerar cotação", {
        description: "Revise os dados preenchidos e tente novamente.",
      });
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="name">Nome completo</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Como devemos te chamar" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="phone">Telefone *</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} onBlur={() => void captureLead()} placeholder="(__) _____-____" />
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="opcional" />
          </div>
        </div>

        <div>
          <Label htmlFor="plate">Placa</Label>
          <div className="relative">
            <Input id="plate" value={plate} onChange={(e) => setPlate(maskPlate(e.target.value))} placeholder="ABC1D23" className="uppercase" />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div>
          <Label>Tipo do veículo</Label>
          <Select value={vehicleType} onValueChange={setVehicleType}>
            <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
            <SelectContent>
              {VEHICLE_TYPES.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>{t.text}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Marca</Label>
          <SearchableSelect
            options={brands.map((b) => ({ code: String(b.id), name: b.text }))}
            value={brand}
            onValueChange={setBrand}
            disabled={!vehicleType}
            loading={loading === "brands"}
            placeholder="Selecione a marca"
            searchPlaceholder="Buscar marca..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Ano</Label>
            <SearchableSelect
              options={years.map((y) => ({ code: String(y.id), name: y.text }))}
              value={year}
              onValueChange={setYear}
              disabled={!brand}
              loading={loading === "years"}
              placeholder="Ano"
              searchPlaceholder="Buscar ano..."
            />
          </div>
          <div>
            <Label>Modelo</Label>
            <SearchableSelect
              options={models.map((m) => ({ code: String(m.id), name: m.text }))}
              value={model}
              onValueChange={setModel}
              disabled={!year}
              loading={loading === "models"}
              placeholder="Modelo"
              searchPlaceholder="Buscar modelo..."
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Estado</Label>
            <SearchableSelect
              options={states.map((s) => ({ code: String(s.id), name: s.text }))}
              value={stateId}
              onValueChange={setStateId}
              placeholder="UF"
              searchPlaceholder="Buscar estado..."
            />
          </div>
          <div>
            <Label>Cidade</Label>
            <SearchableSelect
              options={cities.map((c) => ({ code: String(c.id), name: c.text }))}
              value={cityId}
              onValueChange={setCityId}
              disabled={!stateId}
              loading={loading === "cities"}
              placeholder="Cidade"
              searchPlaceholder="Buscar cidade..."
            />
          </div>
        </div>


        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={isWork} onCheckedChange={(v) => setIsWork(Boolean(v))} />
          Veículo de trabalho (Táxi/Uber)
        </label>
      </div>

      <Button type="submit" disabled={!canSubmit} className="w-full h-12 rounded-xl font-bold">
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Calculando seus planos...
          </>
        ) : (
          <>
            Ver meus planos <ArrowRight className="ml-2 h-5 w-5" />
          </>
        )}
      </Button>

      <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
        <ShieldCheck className="h-3 w-3" /> Cotação oficial Save Car Brasil
      </p>

      <button
        type="button"
        onClick={() => navigate("/cotacao-detalhada")}
        className="block w-full text-center text-xs text-muted-foreground underline mt-2"
      >
        Problemas? Usar o formulário detalhado
      </button>
    </motion.form>
  );
};

export default CrmQuoteForm;
