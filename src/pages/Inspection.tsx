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

        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366]/10">
            <svg viewBox="0 0 32 32" className="h-5 w-5 fill-[#25D366]">
              <path d="M16.004 0h-.008C7.174 0 0 7.176 0 16.004c0 3.5 1.132 6.744 3.054 9.378L1.056 31.4l6.246-1.968a15.916 15.916 0 008.702 2.572C24.828 32 32 24.826 32 16.004 32 7.176 24.828 0 16.004 0zm9.318 22.614c-.39 1.098-1.936 2.01-3.152 2.276-.834.178-1.922.32-5.588-1.2-4.694-1.946-7.71-6.706-7.944-7.016-.226-.31-1.846-2.46-1.846-4.692 0-2.232 1.168-3.328 1.584-3.784.39-.426 1.036-.618 1.652-.618.198 0 .376.01.536.018.456.02.684.046.984.762.376.896 1.292 3.148 1.404 3.376.114.228.228.534.066.844-.152.318-.284.516-.512.79-.228.274-.47.484-.698.778-.206.258-.44.534-.186.996.252.456 1.122 1.85 2.41 2.996 1.66 1.476 3.058 1.936 3.492 2.148.342.166.75.14.996-.114.312-.324.7-.862 1.092-1.394.278-.378.63-.424.998-.282.376.136 2.374 1.12 2.782 1.324.408.206.678.304.778.476.098.172.098.998-.292 2.096z"/>
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">
            Você receberá as informações da vistoria no WhatsApp cadastrado:{" "}
            <span className="font-semibold text-foreground">
              {(() => {
                const phone = quote.personal.phone.replace(/\D/g, "");
                if (phone.length >= 10) {
                  const ddd = phone.slice(0, 2);
                  const last4 = phone.slice(-4);
                  return `(${ddd}) ${"*".repeat(phone.length - 6)}-${last4}`;
                }
                return phone || "—";
              })()}
            </span>
          </p>
        </div>
      </div>

      <WhatsAppButton />
    </div>
  );
};

export default Inspection;
