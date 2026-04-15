import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Real screenshots — place PNGs in site/src/assets/ with these exact names
// Fallback to ethos-dashboard.jpg until real screenshots are added
import screenFinanceiro from "@/assets/screen-financeiro.png";
import screenInicio from "@/assets/screen-inicio.png";
import screenFormularios from "@/assets/screen-formularios.png";
import screenPacientes from "@/assets/screen-pacientes.png";
import screenAgenda from "@/assets/screen-agenda.png";

const SCREENS = [
  {
    id: "inicio",
    label: "Início",
    url: "ethos-frontend-rho.vercel.app",
    src: screenInicio,
    alt: "Dashboard inicial do ETHOS com visão geral da clínica",
    desc: "Visão completa do dia: sessões, pagamentos pendentes e próximos atendimentos.",
  },
  {
    id: "agenda",
    label: "Agenda",
    url: "ethos-frontend-rho.vercel.app",
    src: screenAgenda,
    alt: "Agenda clínica semanal do ETHOS",
    desc: "Agenda semanal visual com status de cada sessão em tempo real.",
  },
  {
    id: "pacientes",
    label: "Pacientes",
    url: "ethos-frontend-rho.vercel.app",
    src: screenPacientes,
    alt: "Lista de pacientes no ETHOS",
    desc: "Prontuário completo de cada paciente, com histórico e sessões.",
  },
  {
    id: "financeiro",
    label: "Financeiro",
    url: "ethos-frontend-rho.vercel.app",
    src: screenFinanceiro,
    alt: "Painel financeiro do ETHOS com fluxo de recebimentos",
    desc: "Controle de cobranças, pagamentos recebidos e pendências do mês.",
  },
  {
    id: "formularios",
    label: "Formulários",
    url: "ethos-frontend-rho.vercel.app",
    src: screenFormularios,
    alt: "Formulários e diário clínico no ETHOS",
    desc: "Formulários personalizados e respostas dos pacientes em um só lugar.",
  },
];

export default function Demo() {
  const [active, setActive] = useState(0);

  return (
    <section id="demo" className="py-28 md:py-36" style={{ background: "#060F1E" }}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-6 text-center">
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#2F6F73", fontFamily: "'DM Sans', sans-serif" }}>
            Veja em ação
          </span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="text-4xl md:text-6xl font-bold text-[#EDF2F7] mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Interface projetada
            <br />
            <span style={{ color: "#2F6F73" }}>para o clínico.</span>
          </h2>
          <p className="text-lg text-[#6B8FA8] max-w-xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Limpa, rápida e focada no que importa. Sem excesso. Sem distração.
          </p>
        </motion.div>

        {/* Tab switcher */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-2 mb-6"
        >
          {SCREENS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setActive(i)}
              className="text-sm px-5 py-2 rounded-full transition-all duration-200"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                background: active === i ? "#2F6F73" : "rgba(47,111,115,0.1)",
                color: active === i ? "#fff" : "#6B8FA8",
                border: active === i ? "1px solid #2F6F73" : "1px solid rgba(47,111,115,0.2)",
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          ))}
        </motion.div>

        {/* Description */}
        <AnimatePresence mode="wait">
          <motion.p
            key={active + "-desc"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="text-center text-sm mb-8"
            style={{ color: "#6B8FA8", fontFamily: "'DM Sans', sans-serif" }}
          >
            {SCREENS[active].desc}
          </motion.p>
        </AnimatePresence>

        {/* Browser frame with screenshot */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-6xl mx-auto"
        >
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              border: "1px solid rgba(47,111,115,0.2)",
              boxShadow: "0 40px 100px -20px rgba(0,0,0,0.7), 0 0 60px rgba(47,111,115,0.08)",
            }}
          >
            {/* Browser chrome */}
            <div
              className="flex items-center gap-2 px-5 py-3.5"
              style={{ background: "rgba(13,27,46,0.95)", borderBottom: "1px solid rgba(47,111,115,0.12)" }}
            >
              <span className="w-3 h-3 rounded-full bg-red-500/50" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <span className="w-3 h-3 rounded-full bg-green-500/50" />
              <div
                className="mx-auto flex items-center gap-2 text-xs px-10 py-1.5 rounded-md"
                style={{ background: "rgba(6,15,30,0.9)", color: "#6B8FA8", fontFamily: "'JetBrains Mono', monospace" }}
              >
                <span className="w-2 h-2 flex-shrink-0 rounded-full bg-[#2F6F73]" />
                {SCREENS[active].url}
              </div>
            </div>

            {/* Screenshot */}
            <AnimatePresence mode="wait">
              <motion.img
                key={active}
                src={SCREENS[active].src}
                alt={SCREENS[active].alt}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="w-full h-auto block"
              />
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-10 flex flex-wrap justify-center gap-6"
        >
          {["Dados seguros", "CRP compatível", "IA integrada", "Funciona no navegador"].map((feat) => (
            <span
              key={feat}
              className="flex items-center gap-2 text-sm"
              style={{ color: "#6B8FA8", fontFamily: "'DM Sans', sans-serif" }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#2F6F73" }} />
              {feat}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
