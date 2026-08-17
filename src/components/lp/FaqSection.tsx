import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FAQ } from "@/lib/lp-content";

const FaqSection = () => (
  <Accordion type="single" collapsible className="mx-auto w-full max-w-3xl">
    {FAQ.map((item, index) => (
      <AccordionItem key={item.question} value={`faq-${index}`}>
        <AccordionTrigger className="text-left font-display text-base font-bold text-teal-900">
          {item.question}
        </AccordionTrigger>
        <AccordionContent className="text-sm text-muted-foreground">{item.answer}</AccordionContent>
      </AccordionItem>
    ))}
  </Accordion>
);

export default FaqSection;
