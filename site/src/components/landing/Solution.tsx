import { motion } from "framer-motion";
import { FileText, Calendar, Users, MessageCircle, Wallet } from "lucide-react";

const solutions = [
  { icon: FileText, title: "Prontuário automático", desc: "Gerado automaticamente com IA a partir da sua sessão." },
  { icon: Calendar, title: "Agenda integrada", desc: "Controle suas sessões, horários e disponibilidade em um só lugar." },
  { icon: Users, title: "Gestão de pacientes", desc: "Histórico completo, dados organizados e acesso rápido." },
  { icon: MessageCircle, title: "Lembretes via WhatsApp", desc: "Seus pacientes nunca mais esquecem a sessão." },
  { icon: Wallet, title: "Financeiro simples", desc: "Saiba quem pagou, quem deve e quanto você faturou." },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, type: "spring", stiffness: 100 } },
};

const Solution = () => {
  return (
    <section id="solucao" className="py-16 md:py-24">
      <div className="container">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            O <span style={{ color: "#2563EB" }}>E</span>THOS resolve tudo isso
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Uma plataforma completa para simplificar sua rotina clínica.
          </p>
        </motion.div>

        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {solutions.map((s) => (
            <motion.div
              key={s.title}
              className="p-6 rounded-xl border border-border bg-card hover:border-accent/40 transition-colors"
              style={{ boxShadow: 'var(--shadow-card)' }}
              variants={cardVariants}
              whileHover={{ y: -4, boxShadow: 'var(--shadow-card-hover)' }}
            >
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <s.icon size={20} className="text-accent" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Solution;
