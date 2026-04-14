import { motion } from "framer-motion";
import { Play } from "lucide-react";

const Demo = () => {
  return (
    <section className="py-16 md:py-24 bg-secondary">
      <div className="container">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Veja o Ethos em ação
          </h2>
          <p className="text-muted-foreground text-lg">Assista como funciona em menos de 2 minutos.</p>
        </motion.div>

        <motion.div
          className="max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="relative aspect-video rounded-xl border border-border bg-card overflow-hidden flex items-center justify-center cursor-pointer group" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="absolute inset-0 bg-foreground/5 group-hover:bg-foreground/10 transition-colors" />
            <div className="relative z-10 w-16 h-16 rounded-full bg-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play size={24} className="text-primary-foreground ml-1" />
            </div>
            <p className="absolute bottom-6 text-sm text-muted-foreground">Clique para assistir a demonstração</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Demo;
