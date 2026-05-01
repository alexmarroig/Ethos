import { motion } from "framer-motion";
import { ArrowRight, ExternalLink } from "lucide-react";
import { BIOHUB_HOME_URL, BIOHUB_REGISTER_URL } from "@/config/biohub";

const BioHub = () => {
  return (
    <section id="biohub" className="relative overflow-hidden py-20 md:py-24" style={{ background: "#060F1E" }}>
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div
        className="absolute left-1/2 top-1/2 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(78,205,196,0.08) 0%, transparent 68%)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative z-10 mx-auto max-w-4xl px-6 text-center"
      >
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#4ECDC4", fontFamily: "'DM Sans', sans-serif" }}>
          Produto do ecossistema ETHOS
        </span>

        <h2 className="mt-5 text-4xl font-bold text-[#EDF2F7] md:text-6xl" style={{ fontFamily: "'DM Serif Display', serif" }}>
          BioHub
        </h2>

        <p className="mt-4 text-xl font-semibold text-[#EDF2F7] md:text-2xl" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Sua página profissional para transformar visitas em contatos.
        </p>

        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#6B8FA8] md:text-lg" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Crie uma bio profissional com WhatsApp, formulário de interesse, leads,
          analytics e personalização visual.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <a
            href={BIOHUB_HOME_URL}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:opacity-90 hover:shadow-[0_0_40px_rgba(47,111,115,0.45)]"
            style={{ background: "#2F6F73", fontFamily: "'DM Sans', sans-serif" }}
          >
            Conhecer BioHub <ExternalLink size={16} />
          </a>
          <a
            href={BIOHUB_REGISTER_URL}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-sm font-medium transition-all duration-200 hover:text-[#EDF2F7]"
            style={{
              color: "#6B8FA8",
              border: "1px solid rgba(26,45,66,0.9)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Criar meu BioHub <ArrowRight size={16} />
          </a>
        </div>
      </motion.div>
    </section>
  );
};

export default BioHub;
