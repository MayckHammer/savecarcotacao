import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { QuoteProvider } from "@/contexts/QuoteContext";
import { AttendantProvider, useAttendant } from "@/contexts/AttendantContext";
import Landing from "./pages/Landing";

const Quote = lazy(() => import("./pages/Quote"));
const Result = lazy(() => import("./pages/Result"));
const Aguardando = lazy(() => import("./pages/Aguardando"));
const Payment = lazy(() => import("./pages/Payment"));
const Inspection = lazy(() => import("./pages/Inspection"));
const Admin = lazy(() => import("./pages/Admin"));
const Confirmation = lazy(() => import("./pages/Confirmation"));
const NotFound = lazy(() => import("./pages/NotFound"));
const QuickQuote = lazy(() => import("./pages/QuickQuote"));
const QuoteExpress = lazy(() => import("./pages/QuoteExpress"));
const PlansFromCrm = lazy(() => import("./pages/PlansFromCrm"));
const AttendantLanding = lazy(() => import("./pages/AttendantLanding"));

import ScrollToTop from "./components/ScrollToTop";
import GradualBlur from "./components/GradualBlur";
import ScrollHint from "./components/ScrollHint";
import { KeniaRedirect } from "./components/KeniaRedirect";


const queryClient = new QueryClient();


const GlobalOverlays = () => {
  const { pathname } = useLocation();
  if (pathname === "/") return null;
  return (
    <>
      <GradualBlur target="page" position="bottom" height="5rem" strength={2} divCount={5} curve="bezier" />
      <ScrollHint />
    </>
  );
};

const NeutralLanding = () => {
  const { clear } = useAttendant();
  useEffect(() => {
    clear();
  }, [clear]);
  return <Landing />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AttendantProvider>
        <QuoteProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <GlobalOverlays />
            <Routes>
              <Route path="/" element={<NeutralLanding />} />
              <Route path="/cotacao" element={<QuoteExpress />} />
              <Route path="/cotacao-detalhada" element={<Quote />} />
              <Route path="/planos" element={<PlansFromCrm />} />
              <Route path="/resultado" element={<Result />} />

              <Route path="/aguardando" element={<Aguardando />} />
              <Route path="/pagamento" element={<Payment />} />
              <Route path="/vistoria" element={<Inspection />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/confirmacao" element={<Confirmation />} />
              
              <Route path="/simulacao" element={<QuickQuote />} />
              {/* Legacy traffic redirect — noindex + canonical to root */}
              <Route path="/kenia" element={<KeniaRedirect />} />
              {/* Personalized attendant link: /josi, /joao, etc. */}
              <Route path="/:attendantSlug" element={<AttendantLanding />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </QuoteProvider>
      </AttendantProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
