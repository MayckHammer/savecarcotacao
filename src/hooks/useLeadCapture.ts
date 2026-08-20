import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LeadCaptureData {
  sessionId: string | null;
  phone: string;
  name?: string;
  email?: string;
  attendantSlug?: string | null;
  lgpdConsent?: boolean;
  vehicleInfo?: Record<string, unknown>;
}

const digitsOf = (v: string) => (v || "").replace(/\D/g, "");

/**
 * Captura (e atualiza) o lead parcial assim que houver telefone válido.
 * - dispara com debounce enquanto o usuário preenche
 * - reenvia quando dados relevantes mudam (nome, e-mail, veículo, cidade...)
 * - envia uma última atualização ao sair da página
 */
export const useLeadCapture = (data: LeadCaptureData, options?: { enabled?: boolean }) => {
  const enabled = options?.enabled ?? true;
  const latest = useRef(data);
  latest.current = data;

  const lastPayload = useRef<string>("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const send = useCallback(
    async (converted = false, force = false) => {
      const d = latest.current;
      const phone = digitsOf(d.phone);
      if (!d.sessionId || phone.length < 10 || phone.length > 13) return;

      const payload = {
        sessionId: d.sessionId,
        phone,
        name: d.name || null,
        email: d.email || null,
        attendantSlug: d.attendantSlug || null,
        lgpdConsent: Boolean(d.lgpdConsent),
        converted,
        vehicleInfo: d.vehicleInfo || {},
      };

      const signature = JSON.stringify(payload);
      if (!force && signature === lastPayload.current) return;
      lastPayload.current = signature;

      try {
        await supabase.functions.invoke("capture-lead", { body: payload });
      } catch (e) {
        console.error("capture-lead error", e);
      }
    },
    []
  );

  // debounce automático sempre que algo relevante muda
  useEffect(() => {
    if (!enabled) return;
    if (digitsOf(data.phone).length < 10) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void send(), 1500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enabled,
    data.sessionId,
    data.phone,
    data.name,
    data.email,
    data.attendantSlug,
    data.lgpdConsent,
    JSON.stringify(data.vehicleInfo || {}),
  ]);

  // última tentativa ao sair / trocar de aba
  useEffect(() => {
    if (!enabled) return;
    const flush = () => {
      if (document.visibilityState === "hidden") void send();
    };
    const onHide = () => void send();
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", onHide);
    };
  }, [enabled, send]);

  return { capture: send };
};
