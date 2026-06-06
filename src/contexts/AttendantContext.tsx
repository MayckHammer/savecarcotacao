import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Attendant = { slug: string; name: string; phone: string };

const DEFAULT_PHONE = "5534998679585";
const STORAGE_KEY = "savecar_attendant";

type Ctx = {
  attendant: Attendant | null;
  whatsapp: string;
  setAttendantBySlug: (slug: string) => Promise<Attendant | null>;
  clear: () => void;
};

const AttendantContext = createContext<Ctx | null>(null);

export const AttendantProvider = ({ children }: { children: ReactNode }) => {
  const [attendant, setAttendant] = useState<Attendant | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Attendant) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (attendant) localStorage.setItem(STORAGE_KEY, JSON.stringify(attendant));
  }, [attendant]);

  const setAttendantBySlug = useCallback(async (slug: string) => {
    const normalized = slug.trim().toLowerCase();
    if (!normalized) return null;
    if (attendant?.slug === normalized) return attendant;
    try {
      const { data, error } = await supabase.functions.invoke("get-attendant", {
        body: { slug: normalized },
      });
      if (error || !data?.slug) return null;
      const a: Attendant = { slug: data.slug, name: data.name, phone: data.phone };
      setAttendant(a);
      return a;
    } catch {
      return null;
    }
  }, [attendant]);

  const clear = useCallback(() => {
    setAttendant(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AttendantContext.Provider
      value={{
        attendant,
        whatsapp: attendant?.phone || DEFAULT_PHONE,
        setAttendantBySlug,
        clear,
      }}
    >
      {children}
    </AttendantContext.Provider>
  );
};

export const useAttendant = () => {
  const ctx = useContext(AttendantContext);
  if (!ctx) throw new Error("useAttendant must be used inside AttendantProvider");
  return ctx;
};

export const useWhatsAppNumber = () => useAttendant().whatsapp;
