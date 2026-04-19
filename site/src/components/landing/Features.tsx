import { motion } from "framer-motion";
import { Calendar, DollarSign, FileText, Mic, Users, BarChart3 } from "lucide-react";

const modules = [
  {
    icon: Mic,
    title: "Gravação + Transcrição",
    desc: "Grave sessões com um clique. Transcrição automática com reconhecimento de contexto clínico.",
    tag: "IA nativa",
  },
  {
    icon: FileText,
    title: "Prontuário Inteligente",
    desc: "SOAP, narrativo ou livre. A IA gera, você revisa e assina. Modelos customizáveis por especialidade.",
    tag: "SOAP · CRP",
  },
  {
    icon: Users,
    title: "Gestão de Pacientes",
    desc: "Histórico completo, evolução, formulários, escalas e documentos — tudo em um perfil organizado.",
    tag: "Portal do paciente",
  },
  {
    icon: Calendar,
    title: "Agenda Clínica",
    desc: "Agendamento, confirmação automática, lembretes e controle de faltas. Sem planilhas.",
    tag: "Offline first",
  },
  {
    icon: DollarSign,
    title: "Gestão Financeira",
    desc: "Cobranças, repasses, recibos e relatórios financeiros. Saiba exatamente o que entra e o que sai.",
    tag: "Relatórios",
  },
  {
    icon: BarChart3,
    title: "Relatórios e Laudos",
    desc: "Geração de laudos, atestados e declarações com IA. Modelos prontos para psicólogos CRP.",
    tag: "IA geradora",
  },
];

const Features = () => {
  return (
    <section id="funcionalidades" className="py-28 md:py-36 relative" style={{ background: "#07111F" }}>
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-6">
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#2F6F73", fontFamily: "'DM Sans', sans-serif" }}>
            Plataforma
          </span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-2xl mb-16">
          <h2 className="text-4xl md:text-6xl font-bold text-[#EDF2F7] leading-tight mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Tudo o que sua clínica
            <br />
            <span style={{ color: "#2F6F73" }}>precisa. Em um lugar.</span>
          </h2>
          <p className="text-lg text-[#6B8FA8]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            O ETHOS não é só uma ferramenta. É um sistema completo pensado do zero para a realidade do psicólogo brasileiro.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {modules.map((mod, i) => (
            <motion.div
              key={mod.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              whileHover={{ y: -4 }}
              className="group relative p-7 rounded-2xl cursor-default transition-all duration-300"
              style={{
                background: "rgba(13,27,46,0.6)",
                border: "1px solid rgba(26,45,66,0.8)",
              }}
            >
              {/* Hover border glow */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ boxShadow: "inset 0 0 0 1px rgba(47,111,115,0.3)" }}
              />

              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                style={{ background: "rgba(47,111,115,0.1)", border: "1px solid rgba(47,111,115,0.18)" }}
              >
                <mod.icon size={20} style={{ color: "#4ECDC4" }} />
              </div>

              <h3 className="text-lg font-bold text-[#EDF2F7] mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {mod.title}
              </h3>
              <p className="text-sm text-[#6B8FA8] leading-relaxed mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {mod.desc}
              </p>
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full"
                style={{
                  background: "rgba(47,111,115,0.08)",
                  border: "1px solid rgba(47,111,115,0.15)",
                  color: "#2F6F73",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {mod.tag}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
