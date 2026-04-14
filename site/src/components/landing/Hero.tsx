import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import dashboardImg from "@/assets/ethos-dashboard.jpg";

const Hero = () => {
  return (
    <section className="pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 150 }}
          >
            <span className="inline-block text-xs font-medium tracking-wider uppercase text-accent mb-4 px-3 py-1 rounded-full bg-accent/10">
              Para psicólogos
            </span>
          </motion.div>

          <motion.h1
            className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground leading-tight tracking-tight text-balance mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, type: "spring", stiffness: 80 }}
          >
            Transforme suas sessões em prontuários prontos automaticamente
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 text-balance"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            Agenda, pacientes, prontuário clínico e lembretes em um só lugar — feito para psicólogos.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <a href="/login">
                <Button size="lg" className="gap-2 text-base px-8">
                  Testar grátis <ArrowRight size={16} />
                </Button>
              </a>
            </motion.div>
            <span className="text-sm text-muted-foreground">7 dias grátis · sem cartão</span>
          </motion.div>
        </div>

        <motion.div
          className="max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 60, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.8, delay: 0.5, type: "spring", stiffness: 60 }}
          style={{ perspective: 1000 }}
        >
          <div className="rounded-xl border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-hero)' }}>
            <img
              src={dashboardImg}
              alt="Painel do ETHOS mostrando prontuários e gestão de pacientes"
              width={1440}
              height={900}
              className="w-full h-auto"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
