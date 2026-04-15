import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    q: "Meus dados realmente ficam só no meu computador?",
    a: "Sim. O ETHOS foi projetado para funcionar localmente. As gravações, prontuários e dados dos pacientes ficam armazenados no seu dispositivo, criptografados. Nenhuma informação trafega para servidores externos sem sua autorização explícita.",
  },
  {
    q: "O ETHOS é compatível com as normas do CRP?",
    a: "Sim. Seguimos as diretrizes do Conselho Federal de Psicologia para armazenamento, sigilo e documentação clínica. Os prontuários gerados seguem os padrões SOAP e narrativo aceitos pelo CRP.",
  },
  {
    q: "A IA pode errar no prontuário?",
    a: "A IA gera uma proposta de prontuário baseada na transcrição da sessão. Você sempre revisa antes de assinar. O psicólogo é e sempre será o responsável pelo conteúdo final — a IA é uma ferramenta de apoio, não de substituição.",
  },
  {
    q: "Funciona sem internet?",
    a: "Totalmente. O ETHOS foi construído offline-first. Agenda, prontuários, gravações e gestão financeira funcionam sem conexão. A única funcionalidade que requer internet é o processamento da IA (quando habilitado).",
  },
  {
    q: "Posso usar em mais de um computador?",
    a: "Atualmente o ETHOS é uma aplicação por dispositivo com backup local. Sincronização entre dispositivos está no roadmap para versões futuras.",
  },
  {
    q: "O que acontece quando cancelo o plano?",
    a: "Seus dados permanecem no seu dispositivo. Você pode exportar todos os prontuários, pacientes e documentos a qualquer momento em formato aberto (JSON, PDF). Nunca haverá lock-in.",
  },
  {
    q: "Como o ETHOS lida com laudos e relatórios?",
    a: "O ETHOS possui módulo de geração de laudos, atestados e declarações com IA, usando modelos estruturados para psicólogos. Você personaliza, revisa e assina digitalmente.",
  },
];

const FaqItem = ({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) => (
  <div
    className="border-b last:border-0 transition-colors"
    style={{ borderColor: "rgba(26,45,66,0.8)" }}
  >
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-5 gap-4 text-left"
    >
      <span className="text-[#EDF2F7] font-medium text-[15px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{q}</span>
      <span
        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
        style={{ background: open ? "rgba(47,111,115,0.2)" : "rgba(26,45,66,0.6)", border: "1px solid rgba(47,111,115,0.2)" }}
      >
        {open
          ? <Minus size={13} style={{ color: "#4ECDC4" }} />
          : <Plus size={13} style={{ color: "#6B8FA8" }} />
        }
      </span>
    </button>
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <p className="pb-5 text-sm text-[#6B8FA8] leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>{a}</p>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const Faq = () => {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-28 md:py-36" style={{ background: "#060F1E" }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16">
          <div>
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-6">
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#2F6F73", fontFamily: "'DM Sans', sans-serif" }}>
                FAQ
              </span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-bold text-[#EDF2F7] leading-tight mb-6"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              Perguntas
              <br />
              <span style={{ color: "#2F6F73" }}>frequentes.</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-[#6B8FA8] leading-relaxed"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Dúvida que não está aqui? Fale com a gente pelo chat ou pelo e-mail{" "}
              <a href="mailto:suporte@ethos.local" style={{ color: "#2F6F73" }}>suporte@ethos.app</a>
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-8"
            style={{ background: "rgba(13,27,46,0.5)", border: "1px solid rgba(26,45,66,0.8)" }}
          >
            {faqs.map((faq, i) => (
              <FaqItem
                key={faq.q}
                q={faq.q}
                a={faq.a}
                open={open === i}
                onToggle={() => setOpen(open === i ? null : i)}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Faq;
