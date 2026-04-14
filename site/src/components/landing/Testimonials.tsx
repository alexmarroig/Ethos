import { motion } from "framer-motion";

const testimonials = [
  {
    name: "Dra. Marina Costa",
    role: "Psicóloga Clínica · CRP 06/12345",
    quote: "Antes eu passava 2 horas por dia escrevendo prontuários. Com o ETHOS, reduzi para 15 minutos.",
  },
  {
    name: "Dr. Rafael Mendes",
    role: "Psicólogo · TCC · CRP 05/67890",
    quote: "A transcrição automática mudou minha rotina. Consigo focar 100% no paciente durante a sessão.",
  },
  {
    name: "Dra. Camila Freitas",
    role: "Psicóloga · Psicanálise · CRP 06/11111",
    quote: "Finalmente um sistema que entende a rotina do psicólogo. Agenda, financeiro e prontuário em um só lugar.",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, type: "spring", stiffness: 100 } },
};

const Testimonials = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            O que dizem nossos psicólogos
          </h2>
          <p className="text-muted-foreground text-lg">Profissionais que transformaram sua rotina.</p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              className="p-6 rounded-xl border border-border bg-card"
              style={{ boxShadow: "var(--shadow-card)" }}
              variants={cardVariants}
              whileHover={{ y: -3, boxShadow: "var(--shadow-card-hover)" }}
            >
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 italic">"{t.quote}"</p>
              <div>
                <p className="font-display font-semibold text-foreground text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
