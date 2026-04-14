import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CtaFinal = () => {
  return (
    <section className="py-16 md:py-24 bg-primary">
      <div className="container">
        <motion.div
          className="text-center max-w-2xl mx-auto"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, type: "spring", stiffness: 80 }}
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
            Comece agora e simplifique sua rotina clínica
          </h2>
          <p className="text-primary-foreground/70 text-lg mb-8">
            Junte-se a psicólogos que já economizam horas toda semana.
          </p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            <a href="/login">
              <Button size="lg" variant="secondary" className="gap-2 text-base px-8">
                Testar grátis por 7 dias <ArrowRight size={16} />
              </Button>
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default CtaFinal;
