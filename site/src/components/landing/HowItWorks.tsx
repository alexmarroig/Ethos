import { motion } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";

const comparison = [
  { feature: "Geração de prontuário com IA", ethos: true, traditional: false },
  { feature: "100% offline — funciona sem internet", ethos: true, traditional: false },
  { feature: "Dados armazenados localmente", ethos: true, traditional: false },
  { feature: "Criptografia de ponta a ponta", ethos: true, traditional: false },
  { feature: "Transcrição automática de sessões", ethos: true, traditional: false },
  { feature: "Gestão financeira integrada", ethos: true, traditional: "pago à parte" },
  { feature: "Portal do paciente", ethos: true, traditional: false },
  { feature: "Formulários e escalas clínicas", ethos: true, traditional: "limitado" },
  { feature: "Relatórios e laudos com IA", ethos: true, traditional: false },
  { feature: "Suporte a CRP padrão", ethos: true, traditional: true },
];

const HowItWorks = () => {
  return (
    <section id="comparativo" className="py-28 md:py-36" style={{ background: "#060F1E" }}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-6">
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#2F6F73", fontFamily: "'DM Sans', sans-serif" }}>
            Comparativo
          </span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-2xl mb-16">
          <h2 className="text-4xl md:text-6xl font-bold text-[#EDF2F7] leading-tight mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
            <span style={{ color: "#2F6F73" }}>E</span>THOS vs.
            <br />sistemas tradicionais.
          </h2>
          <p className="text-lg text-[#6B8FA8]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            A diferença não é só funcionalidade. É uma filosofia diferente sobre o que a tecnologia clínica deve ser.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(26,45,66,0.9)" }}
        >
          {/* Table header */}
          <div className="grid grid-cols-3 px-6 py-4" style={{ background: "rgba(13,27,46,0.9)", borderBottom: "1px solid rgba(26,45,66,0.9)" }}>
            <div />
            <div className="text-center">
              <span className="text-sm font-bold" style={{ fontFamily: "'DM Serif Display', serif", color: "#EDF2F7" }}>
                <span style={{ color: "#2F6F73" }}>E</span>THOS
              </span>
            </div>
            <div className="text-center">
              <span className="text-sm text-[#6B8FA8]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Sistemas tradicionais
              </span>
            </div>
          </div>

          {/* Rows */}
          {comparison.map((row, i) => (
            <motion.div
              key={row.feature}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="grid grid-cols-3 px-6 py-4 items-center transition-colors hover:bg-[rgba(47,111,115,0.04)]"
              style={{
                background: i % 2 === 0 ? "rgba(13,27,46,0.3)" : "transparent",
                borderBottom: i < comparison.length - 1 ? "1px solid rgba(26,45,66,0.5)" : "none",
              }}
            >
              <span className="text-sm text-[#6B8FA8]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{row.feature}</span>
              <div className="flex justify-center">
                <CheckCircle2 size={18} style={{ color: "#2F6F73" }} />
              </div>
              <div className="flex justify-center">
                {row.traditional === true ? (
                  <CheckCircle2 size={18} style={{ color: "#6B8FA8" }} />
                ) : typeof row.traditional === "string" ? (
                  <span className="text-xs text-[#6B8FA8] italic" style={{ fontFamily: "'DM Sans', sans-serif" }}>{row.traditional}</span>
                ) : (
                  <X size={16} style={{ color: "rgba(107,143,168,0.4)" }} />
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
