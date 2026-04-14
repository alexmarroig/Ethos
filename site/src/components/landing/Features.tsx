import { motion } from "framer-motion";
import { Shield, Mic, Calendar, Wallet, UserCircle, BookHeart, Bell } from "lucide-react";

const features = [
  { icon: Shield, title: "Prontuário padrão CRP", desc: "Estruturado conforme as normas do Conselho Regional de Psicologia." },
  { icon: Mic, title: "Transcrição com IA", desc: "Converta sessões de áudio em texto estruturado automaticamente." },
  { icon: Calendar, title: "Agenda de sessões", desc: "Visualize e gerencie todos os seus horários facilmente." },
  { icon: Wallet, title: "Controle financeiro", desc: "Acompanhe pagamentos, recibos e faturamento mensal." },
  { icon: UserCircle, title: "Portal do paciente", desc: "Seus pacientes acessam agendamentos e informações online." },
  { icon: BookHeart, title: "Diário emocional", desc: "Pacientes registram emoções entre sessões para melhor acompanhamento." },
  { icon: Bell, title: "Lembretes automáticos", desc: "Notificações por WhatsApp para reduzir faltas." },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 15 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.4, type: "spring", stiffness: 120 } },
};

const Features = () => {
  return (
    <section id="funcionalidades" className="py-16 md:py-24">
      <div className="container">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Tudo que você precisa
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Funcionalidades pensadas para o dia a dia do psicólogo.
          </p>
        </motion.div>

        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              className="flex items-start gap-3 p-5 rounded-lg border border-border bg-card"
              variants={itemVariants}
              whileHover={{ y: -3, boxShadow: 'var(--shadow-card-hover)' }}
            >
              <motion.div whileHover={{ rotate: 10, scale: 1.1 }}>
                <f.icon size={18} className="text-accent mt-0.5 flex-shrink-0" />
              </motion.div>
              <div>
                <h3 className="font-display font-semibold text-foreground text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Features;
