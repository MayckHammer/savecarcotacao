import { useNavigate } from "react-router-dom";
import { ArrowRight, HelpCircle, MessageCircle, Instagram, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import logo from "@/assets/logo-savecar.png";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Hero Section */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <img src={logo} alt="SAVE CAR BRASIL" className="h-44 mb-8 object-contain" />

        <h1 className="text-2xl font-bold text-center text-foreground mb-3">
          Proteção Veicular <span className="text-primary">de Verdade</span>
        </h1>
        <p className="text-muted-foreground text-center mb-10 max-w-xs">
          Proteja seu veículo com as melhores coberturas do mercado. Simples, rápido e seguro.
        </p>

        <Button
          onClick={() => navigate("/cotacao")}
          className="w-full max-w-xs h-14 text-base font-bold rounded-xl shadow-lg"
          size="lg">

          Cotação com Placa
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>

        <button
          onClick={() => navigate("/simulacao")}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-3 flex items-center gap-1"
        >
          Cotação sem placa
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Links Section */}
      <div className="px-6 pb-8 space-y-3 max-w-xs mx-auto w-full">
        <a
          href="#"
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm text-foreground hover:bg-muted transition-colors">

          <HelpCircle className="h-5 w-5 text-primary" />
          Dúvidas sobre a cotação?
        </a>
        <a
          href="https://wa.me/5500000000000"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm text-foreground hover:bg-muted transition-colors">

          <MessageCircle className="h-5 w-5 text-primary" />
          Atendimento pelo WhatsApp
        </a>
      </div>

      {/* Social + Footer */}
      <footer className="px-6 pb-6 text-center">
        <div className="flex items-center justify-center gap-4 mb-4">
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
            <Instagram className="h-5 w-5" />
          </a>
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
            <Facebook className="h-5 w-5" />
          </a>
        </div>
        <p className="text-xs text-muted-foreground">
          © 2026 SAVE CAR BRASIL. Todos os direitos reservados.
        </p>
      </footer>
    </div>);

};

export default Landing;
