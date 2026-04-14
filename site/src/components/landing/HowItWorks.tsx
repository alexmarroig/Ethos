import { motion } from "framer-motion";

const steps = [
  { num: "01", title: "Grave ou registre a sessão", desc: "Use áudio, vídeo ou anotações durante o atendimento." },
  { num: "02", title: "Receba o prontuário automaticamente", desc: "A IA transcreve e estrutura o prontuário no padrão CRP." },
  { num: "03", title: "Ajuste e salve", desc: "Revise, edite se necessário e salve com um clique." },
];

const HowItWorks = () => {
  return (
    <section className="py-16 md:py-24 bg-secondary">
      <div className="container">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Como funciona
          </h2>
          <p className="text-muted-foreground text-lg">Simples como deveria ser.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-8 left-[20%] right-[20%] h-px bg-border" />
          
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              className="text-center relative"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.2, type: "spring", stiffness: 80 }}
            >
              <motion.span
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-2xl font-display font-bold text-primary mb-4"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {step.num}
              </motion.span>
              <h3 className="font-display font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
