import { motion } from "framer-motion";
import { ArrowRight, Shield, Wifi, Zap } from "lucide-react";
import dashboardImg from "@/assets/screen-inicio.png";

const badges = [
  { icon: Shield, label: "100% local" },
  { icon: Wifi, label: "Funciona offline" },
  { icon: Zap, label: "IA nativa" },
];

const Hero = () => {
  return (
    <section
      className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-16"
      style={{ background: "#060F1E" }}
    >
      {/* Grid background */}
      <div className="absolute inset-0 bg-grid opacity-100" />

      {/* Radial glow center */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: 900,
          height: 500,
          background: "radial-gradient(ellipse, rgba(47,111,115,0.14) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-32 flex flex-col items-center text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <span
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase"
            style={{
              background: "rgba(47,111,115,0.12)",
              border: "1px solid rgba(47,111,115,0.3)",
              color: "#4ECDC4",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <span className="pulse-teal inline-block w-1.5 h-1.5 rounded-full bg-[#4ECDC4]" />
            O Sistema Operacional da Clínica Moderna
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.0] tracking-tight text-[#EDF2F7] mb-8 max-w-5xl"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          Chega de prontuários
          <br />
          <span style={{ color: "#2F6F73" }}>que te esgotam.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="text-lg md:text-xl text-[#6B8FA8] max-w-2xl mb-10 leading-relaxed"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          O <span style={{ color: "#2F6F73" }}>E</span>THOS grava sua sessão, gera o prontuário com IA e organiza sua clínica inteira — sem nenhum dado sair do seu dispositivo.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.38 }}
          className="flex flex-col sm:flex-row items-center gap-4 mb-6"
        >
          <motion.a
            href="https://ethos-frontend-rho.vercel.app/login"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white text-base transition-all"
            style={{
              background: "#2F6F73",
              boxShadow: "0 0 40px rgba(47,111,115,0.35)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Testar grátis — 7 dias <ArrowRight size={16} />
          </motion.a>
          <a
            href="#solucao"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-sm font-medium text-[#6B8FA8] hover:text-[#EDF2F7] transition-colors"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Ver como funciona
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-[#6B8FA8] mb-16"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Sem cartão de crédito · Cancele quando quiser
        </motion.p>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="flex flex-wrap items-center justify-center gap-3 mb-16"
        >
          {badges.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: "rgba(13,27,46,0.8)",
                border: "1px solid rgba(47,111,115,0.2)",
                color: "#6B8FA8",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <Icon size={12} style={{ color: "#2F6F73" }} />
              {label}
            </span>
          ))}
        </motion.div>

        {/* Dashboard screenshot */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.45, type: "spring", stiffness: 50 }}
          className="w-full max-w-6xl float"
        >
          <div
            className="rounded-2xl overflow-hidden glow-teal"
            style={{
              border: "1px solid rgba(47,111,115,0.25)",
              boxShadow: "0 0 0 1px rgba(47,111,115,0.08), 0 40px 100px -20px rgba(0,0,0,0.8), 0 0 80px rgba(47,111,115,0.12)",
            }}
          >
            {/* Browser chrome */}
            <div
              className="flex items-center gap-2 px-4 py-3"
              style={{ background: "rgba(13,27,46,0.95)", borderBottom: "1px solid rgba(47,111,115,0.12)" }}
            >
              <span className="w-3 h-3 rounded-full bg-red-500/60" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <span className="w-3 h-3 rounded-full bg-green-500/60" />
              <div
                className="mx-auto text-xs px-16 py-1 rounded"
                style={{
                  background: "rgba(6,15,30,0.8)",
                  color: "#6B8FA8",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                ethos.local
              </div>
            </div>
            <img
              src={dashboardImg}
              alt="Painel do ETHOS mostrando prontuários e gestão de pacientes"
              className="w-full h-auto block"
            />
          </div>
        </motion.div>
      </div>

      {/* Bottom gradient fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: "linear-gradient(transparent, #060F1E)" }}
      />
    </section>
  );
};

export default Hero;
