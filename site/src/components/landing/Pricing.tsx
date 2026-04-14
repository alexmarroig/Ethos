import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const included = [
  "Prontuário automático com IA",
  "Agenda integrada",
  "Controle financeiro",
  "Gestão de pacientes",
  "Lembretes via WhatsApp",
  "Portal do paciente",
  "Diário emocional",
  "Suporte por e-mail",
];

const Pricing = () => {
  return (
    <section id="preco" className="py-16 md:py-24">
      <div className="container">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Preço simples e transparente
          </h2>
          <p className="text-muted-foreground text-lg">Sem surpresas. Cancele quando quiser.</p>
        </motion.div>

        <motion.div
          className="max-w-md mx-auto p-8 rounded-2xl border border-border bg-card"
          style={{ boxShadow: 'var(--shadow-card-hover)' }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="text-center mb-6">
            <div className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium mb-4">
              7 dias grátis
            </div>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-sm text-muted-foreground">R$</span>
              <span className="text-5xl font-display font-bold text-foreground">49</span>
              <span className="text-muted-foreground">/mês</span>
            </div>
          </div>

          <ul className="space-y-3 mb-8">
            {included.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-foreground">
                <Check size={16} className="text-accent flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>

          <a href="/login"><Button className="w-full" size="lg">Começar teste grátis</Button></a>
          <p className="text-center text-xs text-muted-foreground mt-3">Sem cartão de crédito necessário</p>
        </motion.div>
      </div>
    </section>
  );
};

export default Pricing;
