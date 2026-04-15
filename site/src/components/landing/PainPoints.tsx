import { motion } from "framer-motion";
import { Brain, Clock, FileX, HeartOff } from "lucide-react";

const pains = [
  {
    icon: Clock,
    stat: "3h+",
    title: "Perdidas por semana",
    desc: "Em cada prontuário escrito à mão após cada sessão. Tempo que poderia ir para mais pacientes — ou para você.",
  },
  {
    icon: Brain,
    stat: "87%",
    title: "Dos psicólogos relatam burnout",
    desc: "A burocracia clínica é apontada como principal causa de esgotamento na profissão.",
  },
  {
    icon: FileX,
    stat: "40%",
    title: "Do tempo em documentação",
    desc: "Quase metade da sua jornada vai para preenchimento de formulários, relatórios e prontuários.",
  },
  {
    icon: HeartOff,
    stat: "1 em 3",
    title: "Psicólogos abandonam a clínica",
    desc: "Nos primeiros 5 anos de carreira, por sobrecarga administrativa e falta de suporte tecnológico.",
  },
];

const PainPoints = () => {
  return (
    <section id="problema" className="py-28 md:py-36 relative overflow-hidden" style={{ background: "#060F1E" }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24" style={{ background: "linear-gradient(transparent, rgba(47,111,115,0.3), transparent)" }} />
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-6">
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#2F6F73", fontFamily: "'DM Sans', sans-serif" }}>
            O Problema
          </span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="max-w-3xl mb-20">
          <h2 className="text-4xl md:text-6xl font-bold text-[#EDF2F7] leading-tight mb-6" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Você se formou para{" "}
            <em style={{ color: "#2F6F73" }}>cuidar de pessoas.</em>
            <br />Não para lidar com burocracia.
          </h2>
          <p className="text-lg text-[#6B8FA8] leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Anos de estudo, supervisão, aprimoramento — e boa parte da sua energia vai para prontuários,
            agendamentos, cobranças e documentação que poderiam ser automatizados.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {pains.map((pain, i) => (
            <motion.div
              key={pain.title}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group relative p-6 rounded-2xl transition-all duration-300"
              style={{ background: "rgba(13,27,46,0.5)", border: "1px solid rgba(26,45,66,0.8)" }}
            >
              <pain.icon size={20} className="mb-5 opacity-50 group-hover:opacity-80 transition-opacity" style={{ color: "#2F6F73" }} />
              <p className="text-5xl font-bold mb-2 leading-none" style={{ color: "#2F6F73", fontFamily: "'DM Serif Display', serif" }}>{pain.stat}</p>
              <p className="text-sm font-semibold text-[#EDF2F7] mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>{pain.title}</p>
              <p className="text-sm text-[#6B8FA8] leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>{pain.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.blockquote initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="mt-16 max-w-2xl mx-auto text-center">
          <p className="text-2xl md:text-3xl font-bold text-[#EDF2F7] leading-snug" style={{ fontFamily: "'DM Serif Display', serif", fontStyle: "italic" }}>
            "O maior inimigo do psicólogo clínico não é a falta de pacientes. É o tempo perdido depois de cada sessão."
          </p>
          <footer className="mt-4 text-sm text-[#6B8FA8]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            — Reflexão comum entre psicólogos com mais de 5 anos de clínica
          </footer>
        </motion.blockquote>
      </div>
    </section>
  );
};

export default PainPoints;
