import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Eye, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface Quote {
  id: string;
  session_id: string;
  personal_data: { name?: string; phone?: string; email?: string; cpf?: string };
  vehicle_data: { plate?: string; model?: string; brand?: string; year?: string };
  inspection_status: string;
  inspection_link: string | null;
  crm_submitted: boolean;
  crm_quotation_code: string | null;
  created_at: string;
}

const Admin = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [linkInputs, setLinkInputs] = useState<Record<string, string>>({});
  const [updating, setUpdating] = useState<string | null>(null);

  const ADMIN_PASSWORD = "Save@2026";

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      fetchQuotes();
    }
  };

  const fetchQuotes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("quotes")
      .select("*")
      .order("created_at", { ascending: false });
    setQuotes((data as Quote[]) || []);
    setLoading(false);
  };

  const updateStatus = async (sessionId: string, status: string, link?: string) => {
    setUpdating(sessionId);
    const body: Record<string, string> = { session_id: sessionId, inspection_status: status };
    if (link) body.inspection_link = link;

    await supabase.functions.invoke("update-inspection", { body });
    await fetchQuotes();
    setUpdating(null);
  };

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="p-6 space-y-4">
            <h1 className="text-lg font-bold text-foreground text-center">Admin — Save Car</h1>
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            <Button onClick={handleLogin} className="w-full">Entrar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      pending: { label: "Pendente", className: "bg-yellow-100 text-yellow-800" },
      released: { label: "Liberada", className: "bg-blue-100 text-blue-800" },
      approved: { label: "Aprovada", className: "bg-green-100 text-green-800" },
      rejected: { label: "Reprovada", className: "bg-red-100 text-red-800" },
    };
    const config = map[status] || map.pending;
    return <span className={`text-xs font-semibold px-2 py-1 rounded-full ${config.className}`}>{config.label}</span>;
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Painel de Vistorias</h1>
        <Button variant="outline" size="sm" onClick={fetchQuotes}>
          Atualizar
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : quotes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">Nenhuma cotação encontrada.</p>
      ) : (
        quotes.map((q) => (
          <Card key={q.id} className="border-border">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground">{q.personal_data?.name || "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground">{q.personal_data?.phone}</p>
                  <p className="text-xs text-muted-foreground">{q.vehicle_data?.model} — {q.vehicle_data?.plate}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(q.created_at).toLocaleDateString("pt-BR")} {new Date(q.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {q.crm_submitted && (
                    <p className="text-xs text-green-600 mt-1">✓ Enviado ao CRM {q.crm_quotation_code ? `(${q.crm_quotation_code})` : ""}</p>
                  )}
                </div>
                {statusBadge(q.inspection_status)}
              </div>

              {/* Inspection link input */}
              {(q.inspection_status === "pending" || q.inspection_status === "released") && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Link da vistoria (appvisto.link/...)"
                    value={linkInputs[q.session_id] ?? q.inspection_link ?? ""}
                    onChange={(e) => setLinkInputs((prev) => ({ ...prev, [q.session_id]: e.target.value }))}
                    className="text-xs"
                  />
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                {q.inspection_status === "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updating === q.session_id}
                    onClick={() => updateStatus(q.session_id, "released", linkInputs[q.session_id] || q.inspection_link || undefined)}
                  >
                    <Camera className="h-3 w-3 mr-1" />
                    Liberar Vistoria
                  </Button>
                )}
                {(q.inspection_status === "pending" || q.inspection_status === "released") && (
                  <>
                    <Button
                      size="sm"
                      disabled={updating === q.session_id}
                      onClick={() => updateStatus(q.session_id, "approved")}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={updating === q.session_id}
                      onClick={() => updateStatus(q.session_id, "rejected")}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Reprovar
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default Admin;
