import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QuoteProvider } from "@/contexts/QuoteContext";
import Landing from "./pages/Landing";
import Quote from "./pages/Quote";
import Result from "./pages/Result";
import PlanDetails from "./pages/PlanDetails";
import Payment from "./pages/Payment";
import Inspection from "./pages/Inspection";
import Admin from "./pages/Admin";
import Confirmation from "./pages/Confirmation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <QuoteProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/cotacao" element={<Quote />} />
            <Route path="/resultado" element={<Result />} />
            <Route path="/detalhes" element={<PlanDetails />} />
            <Route path="/pagamento" element={<Payment />} />
            <Route path="/vistoria" element={<Inspection />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/confirmacao" element={<Confirmation />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </QuoteProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
