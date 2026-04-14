import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "O prontuário segue o CRP?",
    a: "Sim. Todos os prontuários gerados pelo ETHOS seguem as diretrizes do Conselho Regional de Psicologia, com estrutura completa e campos obrigatórios."
  },
  {
    q: "Funciona no celular?",
    a: "Sim. O ETHOS é totalmente responsivo e funciona perfeitamente em smartphones, tablets e computadores."
  },
  {
    q: "Preciso instalar algo?",
    a: "Não. O ETHOS funciona 100% no navegador. Basta acessar pelo link e começar a usar."
  },
  {
    q: "Meus dados estão seguros?",
    a: "Sim. Utilizamos criptografia de ponta a ponta, servidores seguros e seguimos as normas da LGPD para proteção de dados sensíveis."
  },
];

const Faq = () => {
  return (
    <section id="faq" className="py-16 md:py-24">
      <div className="container">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Perguntas frequentes
          </h2>
        </motion.div>

        <motion.div
          className="max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-lg px-5 bg-card">
                <AccordionTrigger className="text-sm font-display font-semibold text-foreground hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default Faq;
