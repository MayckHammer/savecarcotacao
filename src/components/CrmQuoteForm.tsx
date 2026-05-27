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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuote } from "@/contexts/QuoteContext";
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
    updatePersonal,
    updateVehicle,
    updateAddress,
    setCrmPlans,
    setCrmQuotationCode,
  } = useQuote();

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

  const [brands, setBrands] = useState<Opt[]>([]);
  const [years, setYears] = useState<Opt[]>([]);
  const [models, setModels] = useState<Opt[]>([]);
  const [states, setStates] = useState<Opt[]>([]);
  const [cities, setCities] = useState<Opt[]>([]);

  const [loading, setLoading] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const canSubmit =
    name.trim().length > 1 &&
    phone.replace(/\D/g, "").length >= 10 &&
    vehicleType &&
    brand &&
    year &&
    model &&
    stateId &&
    cityId &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
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
          observation: "Lead via app Loovi (cotação express)",
        },
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

      // 3) Busca os valores reais (compareTables) — pode levar alguns segundos
      try {
        const plansRes = await call("plans", { qttnCd });
        const plans = (plansRes.plans || []).map(
          (p: { name: string; monthlyPrice: number; annualPrice: number }) => ({
            id: null,
            name: p.name,
            monthlyPrice: p.monthlyPrice,
            annualPrice: p.annualPrice,
            coverages: [],
          }),
        );
        setCrmPlans(plans);
      } catch (err) {
        console.warn("plans fetch warning:", err);
      }

      toast.success("Cotação enviada! Veja seus planos.");
      navigate("/detalhes");
    } catch (err) {
      console.error("submit pwrcrm error", err);
      toast.error(
        "Não foi possível enviar agora. Tente o formulário detalhado abaixo.",
      );
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
            <Input id="phone" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(__) _____-____" />
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
          <Select value={brand} onValueChange={setBrand} disabled={!vehicleType || loading === "brands"}>
            <SelectTrigger><SelectValue placeholder={loading === "brands" ? "Carregando..." : "Selecione a marca"} /></SelectTrigger>
            <SelectContent>
              {brands.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>{b.text}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Ano</Label>
            <Select value={year} onValueChange={setYear} disabled={!brand || loading === "years"}>
              <SelectTrigger><SelectValue placeholder={loading === "years" ? "..." : "Ano"} /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y.id} value={String(y.id)}>{y.text}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Modelo</Label>
            <Select value={model} onValueChange={setModel} disabled={!year || loading === "models"}>
              <SelectTrigger><SelectValue placeholder={loading === "models" ? "..." : "Modelo"} /></SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>{m.text}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Estado</Label>
            <Select value={stateId} onValueChange={setStateId}>
              <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
              <SelectContent>
                {states.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.text}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cidade</Label>
            <Select value={cityId} onValueChange={setCityId} disabled={!stateId || loading === "cities"}>
              <SelectTrigger><SelectValue placeholder={loading === "cities" ? "..." : "Cidade"} /></SelectTrigger>
              <SelectContent>
                {cities.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.text}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        onClick={() => navigate("/cotacao")}
        className="block w-full text-center text-xs text-muted-foreground underline mt-2"
      >
        Problemas? Usar o formulário detalhado
      </button>
    </motion.form>
  );
};

export default CrmQuoteForm;
