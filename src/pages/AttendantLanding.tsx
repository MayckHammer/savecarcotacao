import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Landing from "./Landing";
import NotFound from "./NotFound";
import { useAttendant } from "@/contexts/AttendantContext";

// Reserved routes that must never be treated as an attendant slug.
const RESERVED = new Set([
  "cotacao", "cotacao-detalhada", "planos", "resultado", "aguardando",
  "pagamento", "vistoria", "admin", "confirmacao", "codebase", "simulacao",
]);

const AttendantLanding = () => {
  const { attendantSlug = "" } = useParams();
  const slug = attendantSlug.toLowerCase();
  const { setAttendantBySlug } = useAttendant();
  const [state, setState] = useState<"loading" | "ok" | "notfound">("loading");

  useEffect(() => {
    if (!slug || RESERVED.has(slug)) {
      setState("notfound");
      return;
    }
    let cancelled = false;
    setAttendantBySlug(slug).then((a) => {
      if (cancelled) return;
      setState(a ? "ok" : "notfound");
    });
    return () => { cancelled = true; };
  }, [slug, setAttendantBySlug]);

  if (RESERVED.has(slug)) return <NotFound />;
  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (state === "notfound") return <NotFound />;
  return <Landing />;
};

export default AttendantLanding;
