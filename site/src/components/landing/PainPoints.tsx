import { motion } from "framer-motion";
import { Clock, DollarSign, FileX, Users } from "lucide-react";

const pains = [
  { icon: Clock, title: "Horas escrevendo prontuários", desc: "Tempo que poderia ser dedicado aos seus pacientes é gasto com burocracia." },
  { icon: DollarSign, title: "Controle financeiro confuso", desc: "Pagamentos esquecidos, planilhas perdidas e sem visão clara do financeiro." },
  { icon: FileX, title: "Sistemas desorganizados", desc: "Word, papel, WhatsApp… suas informações estão espalhadas em vários lugares." },
  { icon: Users, title: "Pacientes sem organização", desc: "Histórico difícil de acessar, dados desatualizados e falta de acompanhamento." },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const cardVariants = {
  hidden: { opacity: 0, x: -20, scale: 0.95 },
  visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.5, type: "spring", stiffness: 100 } },
};

const PainPoints = () => {
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
            Você se identifica?
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            A rotina clínica não precisa ser tão trabalhosa.
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {pains.map((pain) => (
            <motion.div
              key={pain.title}
              className="flex gap-4 p-6 rounded-xl bg-card border border-border"
              style={{ boxShadow: 'var(--shadow-card)' }}
              variants={cardVariants}
              whileHover={{ y: -3, boxShadow: 'var(--shadow-card-hover)' }}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <pain.icon size={20} className="text-destructive" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground mb-1">{pain.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{pain.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default PainPoints;
