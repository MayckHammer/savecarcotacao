import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UF_MAP: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AM: "Amazonas", AP: "Amapá", BA: "Bahia",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
  MA: "Maranhão", MG: "Minas Gerais", MS: "Mato Grosso do Sul",
  MT: "Mato Grosso", PA: "Pará", PB: "Paraíba", PE: "Pernambuco",
  PI: "Piauí", PR: "Paraná", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
  RO: "Rondônia", RR: "Roraima", RS: "Rio Grande do Sul",
  SC: "Santa Catarina", SE: "Sergipe", SP: "São Paulo", TO: "Tocantins",
};

// In-memory cache for state/city codes (lives for the worker lifetime)
const stateCityCache = new Map<string, number>(); // key: `${stateName}|${cityName}` -> cityId
let statesListCache: { nm: string; id: number }[] | null = null;

async function getCityCode(stateUF: string, cityName: string): Promise<number | null> {
  const stateName = UF_MAP[stateUF?.toUpperCase()] || stateUF;
  const cacheKey = `${stateName?.toLowerCase()}|${cityName?.toLowerCase()}`;
  if (stateCityCache.has(cacheKey)) return stateCityCache.get(cacheKey)!;

  try {
    if (!statesListCache) {
      const statesRes = await fetch("https://utilities.powercrm.com.br/state/stt");
      if (!statesRes.ok) return null;
      statesListCache = await statesRes.json();
    }
    const found = statesListCache!.find((s) => s.nm?.toLowerCase() === stateName?.toLowerCase());
    if (!found) return null;
    const citiesRes = await fetch(`https://utilities.powercrm.com.br/city/ct?st=${found.id}`);
    if (!citiesRes.ok) return null;
    const cities = await citiesRes.json() as { nm: string; id: number }[];
    const cityFound = cities.find((c) => c.nm?.toLowerCase() === cityName?.toLowerCase());
    if (cityFound) {
      stateCityCache.set(cacheKey, cityFound.id);
      return cityFound.id;
    }
    return null;
  } catch (e) {
    console.error("getCityCode error:", e);
    return null;
  }
}

const BodySchema = z.object({
  personal: z.object({
    name: z.string().trim().max(200).optional().default(""),
    email: z.string().trim().max(255).optional().default(""),
    phone: z.string().trim().max(20).optional().default(""),
    cpf: z.string().trim().max(20).optional().default(""),
  }),
  vehicle: z.object({
    plate: z.string().trim().max(10).optional().default(""),
    brand: z.string().optional().default(""),
    model: z.string().optional().default(""),
    year: z.string().optional().default(""),
    color: z.string().optional().default(""),
    type: z.string().optional().default(""),
    usage: z.string().optional().default(""),
    fipeValue: z.number().optional().default(0),
    fipeFormatted: z.string().optional().default(""),
    fipeCode: z.string().optional().default(""),
    vehicleTypeId: z.union([z.string(), z.number()]).optional().nullable(),
    crmBrandId: z.union([z.string(), z.number()]).optional().nullable(),
    crmModelId: z.union([z.string(), z.number()]).optional().nullable(),
    crmYearId: z.union([z.string(), z.number()]).optional().nullable(),
  }).passthrough(),
  address: z.object({
    cep: z.string().optional().default(""),
    street: z.string().optional().default(""),
    number: z.string().optional().default(""),
    complement: z.string().optional().default(""),
    neighborhood: z.string().optional().default(""),
    state: z.string().optional().default(""),
    city: z.string().optional().default(""),
  }).passthrough(),
  plan: z.record(z.unknown()).optional().default({}),
  skipCrm: z.boolean().optional(),
  crmQuotationCode: z.string().optional().nullable(),
  crmNegotiationCode: z.string().optional().nullable(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const raw = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { personal, vehicle, address, plan, skipCrm, crmQuotationCode: existingQuotationCode, crmNegotiationCode: existingNegotiationCode } = parsed.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const sessionId = crypto.randomUUID();

    // Save quote to DB
    const { error: dbError } = await supabase.from("quotes").insert({
      session_id: sessionId,
      personal_data: personal,
      vehicle_data: vehicle,
      address_data: address,
      plan_data: plan || {},
      inspection_status: "pending",
      crm_submitted: false,
      vehicle_type: vehicle.type || null,
    });

    if (dbError) {
      console.error("DB insert error:", dbError);
      return new Response(JSON.stringify({ error: "Failed to save quote", session_id: sessionId }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phone = (personal.phone || "").replace(/\D/g, "");
    const cpfDigits = (personal.cpf || "").replace(/\D/g, "");

    const planObj = plan as Record<string, unknown>;
    const planName = (planObj?.planName as string) || "COMPLETO";
    const rawCrmPlanName = (planObj?.crmPlanName as string) || "";
    const crmMonthlyPrice = Number(planObj?.crmMonthlyPrice) || 0;
    const crmAnnualPrice = Number(planObj?.crmAnnualPrice) || 0;
    const totalValue = Number(planObj?.total) || crmMonthlyPrice || 0;
    const billingLabel = planObj?.billingPeriod === "annual" ? "Anual" : "Mensal";
    // Só considere "PLANO CRM" confirmado quando o CRM realmente devolveu um plano
    // com preço > 0. Caso contrário, deixe explícito que está aguardando o CRM —
    // evita gravar no card "PLANO CRM: COMPLETO / VALOR CRM: A definir" como se
    // fosse confirmado.
    const hasRealCrmPlan = crmMonthlyPrice > 0 && !!rawCrmPlanName;
    const crmPlanLabel = hasRealCrmPlan ? rawCrmPlanName : "Aguardando retorno do CRM";
    const crmPriceLabel = hasRealCrmPlan
      ? `R$ ${crmMonthlyPrice.toFixed(2).replace(".", ",")}/mês`
      : "A definir";
    const paymentMethodLabel = planObj?.paymentMethod === "credit"
      ? "Cartão de Crédito (Adesão + 11x)"
      : "PIX / Boleto (Carnê 11x)";

    const usageMap: Record<string, string> = {
      particular: "Particular",
      trabalho: "Trabalho",
      aplicativo: "Aplicativo (Uber/99/Táxi)",
      comercial: "Comercial",
      passeio: "Passeio",
    };
    const usageRaw = (vehicle.usage || "").toString().toLowerCase();
    const usageLabel = usageMap[usageRaw] || vehicle.usage || "N/A";

    const internalNote = [
      `► USO DO VEÍCULO: ${usageLabel}`,
      `► PLANO SELECIONADO: ${planName}`,
      `► PLANO CRM: ${crmPlanName}`,
      `► VALOR CRM: ${crmPriceLabel}`,
      `► PRETENSÃO DE PAGAMENTO: ${paymentMethodLabel}`,
    ].join("\n");

    const observation = [
      `[TAG: 30 seg]`,
      ``,
      `>>> DESTAQUE — INFORMAÇÕES DO CLIENTE <<<`,
      `► USO DO VEÍCULO: ${usageLabel}`,
      `► PLANO SELECIONADO: ${planName}`,
      `► PLANO CRM: ${crmPlanName}`,
      `► VALOR CRM: ${crmPriceLabel}`,
      `► PRETENSÃO DE PAGAMENTO: ${paymentMethodLabel}`,
      ``,
      `=== PLANO: ${planName} ===`,
      `Plano CRM: ${crmPlanName}`,
      `Valor mensal CRM: ${crmPriceLabel}`,
      `Valor: R$ ${totalValue ? totalValue.toFixed(2).replace(".", ",") : "A definir"}/${billingLabel === "Anual" ? "ano" : "mês"}`,
      `Periodicidade: ${billingLabel}`,
      `Forma de pagamento: ${paymentMethodLabel}`,
      ``,
      `=== ASSOCIADO ===`,
      `Nome: ${personal.name || "N/A"}`,
      `Telefone: ${personal.phone || "N/A"}`,
      `CPF: ${personal.cpf || "N/A"}`,
      `Email: ${personal.email || "N/A"}`,
      ``,
      `=== VEÍCULO ===`,
      `Marca: ${vehicle.brand || "N/A"}`,
      `Modelo: ${vehicle.model || "N/A"}`,
      `Ano: ${vehicle.year || "N/A"}`,
      `Cor: ${vehicle.color || "N/A"}`,
      `Placa: ${vehicle.plate || "N/A"}`,
      `Valor FIPE: ${vehicle.fipeFormatted || "N/A"}`,
      `Uso: ${vehicle.usage || "N/A"}`,
      ``,
      `=== ENDEREÇO ===`,
      `${address.street || ""}, ${address.number || "S/N"} — ${address.neighborhood || ""}, ${address.city || ""}/${address.state || ""}`,
      `CEP: ${address.cep || "N/A"}`,
      ``,
      `=== COBERTURAS ===`,
      Array.isArray(planObj?.coverages) ? (planObj.coverages as string[]).join(", ") : "A definir",
    ].join("\n");

    const cityCode = await getCityCode(address.state || "", address.city || "");

    const crmPayload: Record<string, unknown> = {
      name: personal.name || "",
      phone: phone,
      email: personal.email || "",
      registration: cpfDigits,
      plts: vehicle.plate || "",
      workVehicle: vehicle.type === "caminhao" || vehicle.usage === "aplicativo",
      observation,
      noteContractInternal: internalNote,
    };
    if (cityCode) crmPayload.city = cityCode;
    const vtNew = (vehicle as Record<string, unknown>).vehicleTypeId;
    if (vtNew) {
      crmPayload.vhclType = vtNew;
    }

    const token = Deno.env.get("POWERCRM_API_TOKEN");
    let crmSuccess = !!skipCrm;
    let crmQuotationCode: string | null = null;
    let crmNegotiationCode: string | null = null;
    let crmError: string | null = null;
    let inspectionLink: string | null = null;

    // ----- Helper: open inspection (only after data is complete) -----
    const openInspection = async (quotationCode: string): Promise<string | null> => {
      try {
        const inspRes = await fetch("https://api.powercrm.com.br/api/quotation/open-inspection", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ quotationCode }),
        });
        const inspText = await inspRes.text();
        console.log("open-inspection response:", inspRes.status, inspText.substring(0, 300));
      } catch (e) {
        console.error("open-inspection error:", e);
      }
      // Try to fetch the link
      try {
        const qttnRes = await fetch(`https://api.powercrm.com.br/api/quotation/${quotationCode}`, {
          headers: { "Authorization": `Bearer ${token}` },
        });
        if (qttnRes.ok) {
          const qttnData = await qttnRes.json();
          return qttnData?.inspectionLink || qttnData?.inspection_link
            || qttnData?.data?.inspectionLink || qttnData?.negotiation?.inspectionLink || null;
        }
      } catch (e) {
        console.error("fetch inspection link error:", e);
      }
      return null;
    };

    // Helper: tenta salvar noteContractInternal (campo amarelo) usando o endpoint
    // interno que o formulário do card usa. Esse endpoint exige o quotationId NUMÉRICO.
    const saveInternalNote = async (quotationCode: string): Promise<boolean> => {
      if (!token) return false;
      try {
        // Resolve o quotationId numérico via GET /quotation/{code}
        const qRes = await fetch(`https://api.powercrm.com.br/api/quotation/${quotationCode}`, {
          headers: { "Authorization": `Bearer ${token}` },
        });
        if (!qRes.ok) {
          console.log("saveInternalNote: getQuotation failed", qRes.status);
          return false;
        }
        const qData = await qRes.json().catch(() => ({})) as Record<string, unknown>;
        const candidates = [
          qData.id, qData.quotationId, qData.idQuotation,
          (qData.data as Record<string, unknown> | undefined)?.id,
          (qData.quotation as Record<string, unknown> | undefined)?.id,
        ];
        let quotationId: number | null = null;
        for (const c of candidates) {
          const n = Number(c);
          if (Number.isFinite(n) && n > 0) { quotationId = n; break; }
        }
        if (!quotationId) {
          console.log("saveInternalNote: quotationId numérico não encontrado");
          return false;
        }

        // Lê os dados atuais do veículo no card para NÃO sobrescrever com vazio.
        const getStr = (k: string) =>
          String((qData[k] ?? (qData.data as Record<string, unknown> | undefined)?.[k] ?? "") || "").trim();
        const getNum = (k: string) => {
          const v = qData[k] ?? (qData.data as Record<string, unknown> | undefined)?.[k];
          const n = Number(v);
          return Number.isFinite(n) ? n : null;
        };

        const currentCarModel = getNum("mdl") ?? getNum("carModel");
        const currentCarYear = getNum("mdlYr") ?? getNum("carModelYear");
        const currentChassi = getStr("chassi") || getStr("vhclChassi");
        const currentColor = getStr("color") || getStr("vhclColor");
        const currentPlates = getStr("plts") || getStr("plates") || vehicle.plate || "";
        const currentFabYr = getNum("fabricationYear") ?? (() => {
          const yr = parseInt(String(vehicle.year || "").split("/")[0], 10);
          return Number.isFinite(yr) ? yr : null;
        })();

        // Modelo do CRM resolvido pela /consulta-placa-crm (preferir esses se ausentes no card)
        const crmModelId = Number((vehicle as Record<string, unknown>).crmModelId) || 0;
        const crmYearId = Number((vehicle as Record<string, unknown>).crmYearId) || 0;

        const innerBody: Record<string, unknown> = {
          quotationId,
          plates: currentPlates,
          chassi: currentChassi,
          renavam: "",
          carModel: String(currentCarModel || crmModelId || ""),
          carModelYear: currentCarYear ? String(currentCarYear) : (crmYearId ? String(crmYearId) : ""),
          fabricationYear: currentFabYr ? String(currentFabYr) : "",
          color: currentColor || (vehicle.color || ""),
          engineNumber: "",
          depreciationId: "0",
          expirationDay: 0,
          kmtr: "",
          noteContract: internalNote,           // Observações no termo
          noteContractInternal: internalNote,   // CAMPO AMARELO (Observações internas)
          protectedValue: null,                 // null = CRM mantém o valor calculado
          shift: null,
          fuel: null,
          city: null,
          workVehicle: vehicle.type === "caminhao" || vehicle.usage === "aplicativo",
        };

        console.log("saveInternalNote payload:", JSON.stringify(innerBody));
        const url = "https://app.powercrm.com.br/company/updateQuotationVehicleData";
        const attempts: Array<{ label: string; headers: HeadersInit }> = [
          { label: "bearer", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "Accept": "*/*" } },
          { label: "cookie", headers: { "Content-Type": "application/json", "Cookie": `token=${token}`, "Accept": "*/*" } },
        ];
        for (const { label, headers } of attempts) {
          try {
            const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(innerBody) });
            const text = await r.text();
            console.log(`saveInternalNote (${label}) → ${r.status} ${text.substring(0, 250)}`);
            if (r.ok) return true;
          } catch (e) {
            console.error(`saveInternalNote (${label}) error:`, e);
          }
        }
        return false;
      } catch (e) {
        console.error("saveInternalNote unexpected error:", e);
        return false;
      }
    };

    if (skipCrm) {
      crmQuotationCode = existingQuotationCode || null;
      crmNegotiationCode = existingNegotiationCode || null;
      console.log("Using existing CRM codes, will update quotation:", crmQuotationCode, crmNegotiationCode);

      if (crmQuotationCode && token) {
        const updatePayload: Record<string, unknown> = {
          code: crmQuotationCode,
          name: personal.name,
          phone,
          email: personal.email,
          registration: cpfDigits,
          phoneMobile1: phone,
          plates: vehicle.plate,
          plts: vehicle.plate,
          workVehicle: vehicle.type === "caminhao" || vehicle.usage === "aplicativo",
          addressZipcode: address.cep?.replace(/\D/g, ""),
          addressAddress: address.street,
          addressNumber: address.number || "S/N",
          addressComplement: address.complement || "",
          addressNeighborhood: address.neighborhood,
          protectedValue: vehicle.fipeValue || 0,
          observation,
          noteContract: internalNote,
        };
        if (cityCode) updatePayload.city = cityCode;
        // Reinforce vehicle type in case it was lost between steps
        const vt = (vehicle as Record<string, unknown>).vehicleTypeId;
        if (vt) {
          updatePayload.vhclType = vt;
        }

        // CRM internal IDs for the vehicle (resolved by consulta-placa-crm)
        const crmModelId = Number((vehicle as Record<string, unknown>).crmModelId) || 0;
        const crmYearId = Number((vehicle as Record<string, unknown>).crmYearId) || 0;
        if (crmModelId > 0) {
          updatePayload.mdl = crmModelId;
          updatePayload.carModel = crmModelId;
        }
        if (crmYearId > 0) {
          updatePayload.mdlYr = crmYearId;
          updatePayload.carModelYear = crmYearId;
        }
        if (vehicle.color) updatePayload.color = vehicle.color;
        if (vehicle.year) {
          const yr = parseInt(String(vehicle.year).split("/")[0], 10);
          if (yr) updatePayload.fabricationYear = yr;
        }
        // CRÍTICO: NÃO enviar cdFp/codFipe nem aliases de valor FIPE calculados localmente.
        // Mandar cdFp errado corrompe o card no PowerCRM (getQuotation 500, plansQuotation 404).
        // O cálculo FIPE oficial é feito pelo CRM via /quotation/quotationFipeApi
        // (já disparado pela consulta-placa-crm). Aqui só mandamos protectedValue acima
        // como referência inicial — o CRM sobrescreve com o valor correto.

        const sendUpdate = async () => {
          console.log("Updating CRM quotation:", JSON.stringify(updatePayload, null, 2));
          const updateRes = await fetch("https://api.powercrm.com.br/api/quotation/update", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(updatePayload),
          });
          const updateText = await updateRes.text();
          console.log("CRM update response:", updateRes.status, updateText.substring(0, 500));
          return updateRes.ok;
        };

        const verifyUpdate = async (): Promise<{ ok: boolean; protectedValue: number; hasAddress: boolean; hasModel: boolean }> => {
          try {
            const qttnRes = await fetch(`https://api.powercrm.com.br/api/quotation/${crmQuotationCode}`, {
              headers: { "Authorization": `Bearer ${token}` },
            });
            if (!qttnRes.ok) return { ok: false, protectedValue: 0, hasAddress: false, hasModel: false };
            const qttnData = await qttnRes.json();
            const pv = Number(qttnData?.protectedValue ?? qttnData?.data?.protectedValue ?? 0);
            const fipeVl = Number(qttnData?.vhclFipeVl ?? qttnData?.data?.vhclFipeVl ?? 0);
            const addr = qttnData?.addressZipcode || qttnData?.data?.addressZipcode || qttnData?.addressAddress;
            const mdl = qttnData?.mdl ?? qttnData?.data?.mdl ?? null;
            const hasModel = mdl !== null && mdl !== undefined;
            console.log("Post-update verify — protectedValue:", pv, "vhclFipeVl:", fipeVl, "hasAddress:", !!addr, "mdl:", mdl);
            return { ok: true, protectedValue: pv || fipeVl, hasAddress: !!addr, hasModel };
          } catch (e) {
            console.error("verify error:", e);
            return { ok: false, protectedValue: 0, hasAddress: false, hasModel: false };
          }
        };

        try {
          await sendUpdate();
          await new Promise((r) => setTimeout(r, 1500));
          let v = await verifyUpdate();
          if ((updatePayload.protectedValue as number) > 0 && v.protectedValue === 0) {
            console.log("protectedValue not persisted, retrying update once...");
            await sendUpdate();
            await new Promise((r) => setTimeout(r, 1500));
            v = await verifyUpdate();
          }

          // Save the YELLOW field (Observações internas) via internal endpoint.
          // /quotation/update does NOT persist noteContractInternal — only /add does, or
          // the company/updateQuotationVehicleData endpoint used by the card form.
          await saveInternalNote(crmQuotationCode);

          // Now that data is complete, open inspection
          if (v.protectedValue > 0 && v.hasAddress) {
            inspectionLink = await openInspection(crmQuotationCode);
          } else {
            console.log("Skipping open-inspection — data still incomplete in CRM");
          }
        } catch (updateErr) {
          console.error("Error updating CRM quotation:", updateErr);
        }
      }

      crmSuccess = true;
    } else {
      try {
        console.log("CRM payload (new quotation):", JSON.stringify(crmPayload, null, 2));
        const crmRes = await fetch("https://api.powercrm.com.br/api/quotation/add", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify(crmPayload),
        });

        const crmData = await crmRes.json();
        console.log("CRM response:", JSON.stringify(crmData, null, 2));

        if (crmData.quotationCode) {
          crmSuccess = true;
          crmQuotationCode = crmData.quotationCode || null;
          crmNegotiationCode = crmData.negotiationCode || crmData.negotationCode || null;

          // Add tag
          if (crmQuotationCode) {
            try {
              const tagRes = await fetch("https://api.powercrm.com.br/api/quotation/add-tag", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ quotationCode: crmQuotationCode, tagId: 23323 }),
              });
              const tagText = await tagRes.text();
              console.log("Tag response:", tagText);
            } catch (tagErr) {
              console.error("Error adding tag:", tagErr);
            }

            // Open inspection — at this point we have FIPE + address from the form
            if ((vehicle.fipeValue || 0) > 0 && address.cep) {
              inspectionLink = await openInspection(crmQuotationCode);
            }
          }
        } else {
          crmError = crmData.message || crmData.error || "CRM submission failed";
        }
      } catch (e) {
        crmError = `CRM request error: ${e.message}`;
        console.error("CRM submission error:", e);
      }
    }

    // Update quote with CRM result
    const updateQuote: Record<string, unknown> = {
      crm_submitted: crmSuccess,
      crm_quotation_code: crmQuotationCode,
      crm_error: crmError,
      last_crm_sync_at: new Date().toISOString(),
    };
    if (inspectionLink) {
      updateQuote.inspection_link = inspectionLink;
      updateQuote.inspection_status = "released";
    }
    await supabase.from("quotes").update(updateQuote).eq("session_id", sessionId);

    return new Response(
      JSON.stringify({
        session_id: sessionId,
        crm_submitted: crmSuccess,
        crm_quotation_code: crmQuotationCode,
        crm_negotiation_code: crmNegotiationCode,
        crm_error: crmError,
        inspection_link: inspectionLink,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Unexpected error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
