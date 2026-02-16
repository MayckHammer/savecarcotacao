import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Camera, CheckCircle2, XCircle, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import WhatsAppButton from "@/components/WhatsAppButton";
import { useQuote } from "@/contexts/QuoteContext";
import { supabase } from "@/integrations/supabase/client";

type InspectionStatus = "pending" | "released" | "approved" | "rejected";

const Inspection = () => {
  const navigate = useNavigate();
  const { quote } = useQuote();
  const [status, setStatus] = useState<InspectionStatus>("pending");
  const [inspectionLink, setInspectionLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sessionId = quote.sessionId || localStorage.getItem("savecar_session_id");

  useEffect(() => {
    if (!sessionId) {
      navigate("/");
      return;
    }

    const fetchStatus = async () => {
      const { data } = await supabase
        .from("quotes")
        .select("inspection_status, inspection_link")
        .eq("session_id", sessionId)
        .single();

      if (data) {
        setStatus(data.inspection_status as InspectionStatus);
        setInspectionLink(data.inspection_link);
      }
      setLoading(false);
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [sessionId, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statusConfig = {
    pending: {
      icon: Clock,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      title: "Aguardando liberação",
      description: "Estamos processando sua solicitação. Em breve você receberá a liberação para realizar a vistoria do veículo.",
    },
    released: {
      icon: Camera,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      title: "Vistoria liberada!",
      description: "Sua vistoria foi liberada. Clique no botão abaixo para realizar a vistoria do seu veículo.",
    },
    approved: {
      icon: CheckCircle2,
      color: "text-green-500",
      bg: "bg-green-500/10",
      title: "Vistoria aprovada!",
      description: "Parabéns! Sua vistoria foi aprovada. Agora você pode prosseguir para o pagamento.",
    },
    rejected: {
      icon: XCircle,
      color: "text-red-500",
      bg: "bg-red-500/10",
      title: "Vistoria reprovada",
      description: "Infelizmente sua vistoria não foi aprovada. Entre em contato conosco pelo WhatsApp para mais informações.",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <Header dark />

      <div className="flex-1 px-4 py-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold text-foreground">Acompanhamento da Vistoria</h1>
          <p className="text-sm text-muted-foreground">
            {quote.vehicle.model || "Veículo"} — Placa: {quote.vehicle.plate || "—"}
          </p>
        </div>

        <Card className="border-border">
          <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
            <div className={`w-20 h-20 rounded-full ${config.bg} flex items-center justify-center`}>
              <Icon className={`h-10 w-10 ${config.color}`} />
            </div>
            <h2 className="text-lg font-bold text-foreground">{config.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{config.description}</p>

            {status === "released" && inspectionLink && (
              <Button
                onClick={() => window.open(inspectionLink, "_blank")}
                className="w-full h-14 rounded-xl font-bold text-base"
              >
                <Camera className="mr-2 h-5 w-5" />
                Fazer Vistoria
              </Button>
            )}

            {status === "approved" && (
              <Button
                onClick={() => navigate("/pagamento")}
                className="w-full h-14 rounded-xl font-bold text-base"
              >
                Continuar para Pagamento
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            )}
          </CardContent>
        </Card>

        {status === "pending" && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Atualizando automaticamente...
          </div>
        )}
      </div>

      <WhatsAppButton />
    </div>
  );
};

export default Inspection;
