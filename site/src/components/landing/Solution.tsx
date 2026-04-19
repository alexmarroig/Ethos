import { motion } from "framer-motion";
import { Mic, Sparkles, FileCheck, ArrowRight } from "lucide-react";

const steps = [
  {
    num: "01",
    icon: Mic,
    title: "Grave a sessão",
    desc: "Um clique. O ETHOS captura o áudio localmente, sem enviar nada para servidores externos. Foque no paciente.",
    detail: "Gravação local · Criptografada",
  },
  {
    num: "02",
    icon: Sparkles,
    title: "IA processa",
    desc: "Transcrição + análise clínica com IA. O modelo identifica temas, hipóteses e intervenções do contexto da sessão.",
    detail: "Processamento local · CRP-compatível",
  },
  {
    num: "03",
    icon: FileCheck,
    title: "Prontuário pronto",
    desc: "Em segundos, um prontuário estruturado, revisável e assinável está disponível. Edite, assine e arquive.",
    detail: "SOAP · Narrativo · Personalizado",
  },
];

const Solution = () => {
  return (
    <section id="solucao" className="py-28 md:py-36 relative" style={{ background: "#07111F" }}>
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-6">
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#2F6F73", fontFamily: "'DM Sans', sans-serif" }}>
            A Solução
          </span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-2xl mb-20">
          <h2 className="text-4xl md:text-6xl font-bold text-[#EDF2F7] leading-tight mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Do áudio ao prontuário
            <br />
            <span style={{ color: "#2F6F73" }}>em segundos.</span>
          </h2>
          <p className="text-lg text-[#6B8FA8]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Três etapas. Nenhuma burocracia. Tudo dentro do seu dispositivo.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-16 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent 8%, rgba(47,111,115,0.3) 30%, rgba(47,111,115,0.3) 70%, transparent 92%)" }} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="relative group"
              >
                <div
                  className="p-8 rounded-2xl h-full transition-all duration-300 hover:-translate-y-1"
                  style={{ background: "rgba(13,27,46,0.6)", border: "1px solid rgba(26,45,66,0.9)" }}
                >
                  {/* Step number + arrow */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-mono text-xs font-medium" style={{ color: "rgba(47,111,115,0.6)", fontFamily: "'JetBrains Mono', monospace" }}>
                      {step.num}
                    </span>
                    {i < steps.length - 1 && (
                      <ArrowRight size={14} className="opacity-30 lg:hidden" style={{ color: "#2F6F73" }} />
                    )}
                  </div>

                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
                    style={{ background: "rgba(47,111,115,0.12)", border: "1px solid rgba(47,111,115,0.2)" }}
                  >
                    <step.icon size={22} style={{ color: "#4ECDC4" }} />
                  </div>

                  <h3 className="text-xl font-bold text-[#EDF2F7] mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
                    {step.title}
                  </h3>
                  <p className="text-[#6B8FA8] text-sm leading-relaxed mb-5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {step.desc}
                  </p>
                  <span
                    className="text-xs font-mono font-medium px-3 py-1 rounded-full"
                    style={{
                      background: "rgba(47,111,115,0.08)",
                      border: "1px solid rgba(47,111,115,0.15)",
                      color: "#2F6F73",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {step.detail}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* AI Note preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-16 max-w-3xl mx-auto"
        >
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(13,27,46,0.8)", border: "1px solid rgba(47,111,115,0.2)" }}
          >
            {/* Editor chrome */}
            <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "rgba(47,111,115,0.12)" }}>
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/40" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/40" />
                <span className="w-3 h-3 rounded-full bg-green-500/40" />
              </div>
              <span className="text-xs mx-auto" style={{ color: "#6B8FA8", fontFamily: "'JetBrains Mono', monospace" }}>
                prontuario_sessao_14.md
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1.5"
                style={{ background: "rgba(47,111,115,0.12)", color: "#4ECDC4", fontFamily: "'DM Sans', sans-serif" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ECDC4] pulse-teal inline-block" />
                IA gerando
              </span>
            </div>

            <div className="p-6 space-y-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {[
                { label: "IDENTIFICAÇÃO", content: "14ª sessão · 45min · 14/04/2026" },
                { label: "SUBJETIVO", content: "Paciente relata melhora na qualidade do sono após técnicas de regulação emocional. Refere ansiedade moderada em contexto laboral..." },
                { label: "OBJETIVO", content: "Paciente apresenta-se com humor eutímico, sem agitação psicomotora. Discurso coerente e organizado..." },
                { label: "AVALIAÇÃO", content: "Progresso consistente no manejo de ansiedade situacional. TCC cognitiva respondendo bem..." },
                { label: "PLANO", content: "Continuar técnicas de reestruturação cognitiva. Introduzir registro de pensamentos automáticos..." },
              ].map((item, i) => (
                <div key={item.label}>
                  <p className="text-xs mb-1" style={{ color: "#2F6F73" }}>## {item.label}</p>
                  <p className="text-sm leading-relaxed" style={{ color: i === 1 ? "#EDF2F7" : "#6B8FA8" }}>
                    {item.content}
                    {i === 1 && <span className="cursor-blink ml-0.5" style={{ color: "#4ECDC4" }}>|</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Solution;
