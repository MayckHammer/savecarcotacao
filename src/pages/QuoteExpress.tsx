import { motion } from "framer-motion";
import Header from "@/components/Header";
import WhatsAppButton from "@/components/WhatsAppButton";
import CrmQuoteForm from "@/components/CrmQuoteForm";

const QuoteExpress = () => {
  return (
    <>
      <div className="flex min-h-screen flex-col bg-background pb-20">
        <Header dark />
        <main className="flex-1 px-4 py-6 max-w-xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h1 className="text-2xl font-bold text-foreground">
              Cotação online Save Car Brasil
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Preencha os dados e receba os valores dos planos COMPLETO e PREMIUM
              na hora.
            </p>
          </motion.div>
          <CrmQuoteForm />
        </main>
        <WhatsAppButton />
      </div>
    </>
  );
};

export default QuoteExpress;
