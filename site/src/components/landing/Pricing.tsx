import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight } from "lucide-react";

const plans = [
  {
    name: "Essencial",
    price: "R$ 79",
    period: "/mês",
    desc: "Para psicólogos que estão começando a organizar sua clínica.",
    features: [
      "Até 20 pacientes ativos",
      "Prontuários com IA (50/mês)",
      "Gravação de sessões",
      "Agenda e lembretes",
      "Gestão financeira básica",
      "Armazenamento local 100%",
    ],
    cta: "Começar grátis",
    highlight: false,
  },
  {
    name: "Clínico",
    price: "R$ 149",
    period: "/mês",
    desc: "Para psicólogos com clínica consolidada que querem escalar com qualidade.",
    features: [
      "Pacientes ilimitados",
      "Prontuários com IA ilimitados",
      "Gravação e transcrição ilimitadas",
      "Portal do paciente incluso",
      "Relatórios e laudos com IA",
      "Formulários e escalas clínicas",
      "Gestão financeira completa",
      "Suporte prioritário",
    ],
    cta: "Testar 7 dias grátis",
    highlight: true,
  },
];

const Pricing = () => {
  return (
    <section id="preco" className="py-28 md:py-36 relative" style={{ background: "#07111F" }}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-6 text-center">
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#2F6F73", fontFamily: "'DM Sans', sans-serif" }}>
            Preços
          </span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold text-[#EDF2F7] mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Simples. Transparente.
            <br />
            <span style={{ color: "#2F6F73" }}>Sem surpresas.</span>
          </h2>
          <p className="text-lg text-[#6B8FA8]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            7 dias grátis em qualquer plano. Sem cartão de crédito.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="relative p-8 rounded-2xl"
              style={{
                background: plan.highlight ? "rgba(47,111,115,0.1)" : "rgba(13,27,46,0.6)",
                border: plan.highlight ? "1px solid rgba(47,111,115,0.4)" : "1px solid rgba(26,45,66,0.9)",
                boxShadow: plan.highlight ? "0 0 40px rgba(47,111,115,0.1)" : "none",
              }}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span
                    className="px-4 py-1 rounded-full text-xs font-bold tracking-wider uppercase text-white"
                    style={{ background: "#2F6F73", fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Mais popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-bold text-[#EDF2F7] mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>{plan.name}</h3>
                <p className="text-sm text-[#6B8FA8] mb-5" style={{ fontFamily: "'DM Sans', sans-serif" }}>{plan.desc}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-[#EDF2F7]" style={{ fontFamily: "'DM Serif Display', serif" }}>{plan.price}</span>
                  <span className="text-sm text-[#6B8FA8]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0" style={{ color: "#2F6F73" }} />
                    <span className="text-sm text-[#6B8FA8]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{feat}</span>
                  </li>
                ))}
              </ul>

              <motion.a
                href="https://ethos-frontend-rho.vercel.app/login"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold text-sm transition-all"
                style={{
                  background: plan.highlight ? "#2F6F73" : "transparent",
                  color: plan.highlight ? "#fff" : "#2F6F73",
                  border: plan.highlight ? "none" : "1px solid rgba(47,111,115,0.4)",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {plan.cta} <ArrowRight size={14} />
              </motion.a>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center text-sm text-[#6B8FA8] mt-8"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Cancele quando quiser. Seus dados permanecem sempre seus.
        </motion.p>
      </div>
    </section>
  );
};

export default Pricing;
