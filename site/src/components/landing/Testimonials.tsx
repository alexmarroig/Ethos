import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";

// 👉 centraliza URL do app
const APP_URL = "https://app.ethos-clinic.com";

const Testimonials = () => {
  return (
    <section className="py-28 md:py-36" style={{ background: "#060F1E" }}>
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-6 text-center"
        >
          <span
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: "#2F6F73", fontFamily: "'DM Sans', sans-serif" }}
          >
            Em desenvolvimento
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2
            className="text-4xl md:text-6xl font-bold text-[#EDF2F7]"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Seja um dos primeiros
            <br />
            <span style={{ color: "#2F6F73" }}>a experimentar.</span>
          </h2>

          <p
            className="text-lg text-[#6B8FA8] max-w-xl mx-auto mt-6"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            O ETHOS está em fase beta. Psicólogos que entrarem agora terão acesso gratuito durante o período de testes e voz ativa no desenvolvimento do produto.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {[
            {
              icon: "🔒",
              title: "Acesso beta gratuito",
              desc: "Sem cobrança enquanto o produto está em fase de testes. Você ajuda a moldar o ETHOS.",
            },
            {
              icon: "💬",
              title: "Canal direto com o time",
              desc: "Reporte bugs, sugira funcionalidades e veja suas ideias implementadas em dias.",
            },
            {
              icon: "⭐",
              title: "Preço especial para fundadores",
              desc: "Quem entrar agora garante desconto permanente quando o produto for lançado oficialmente.",
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="p-8 rounded-2xl flex flex-col gap-4"
              style={{
                background: "rgba(13,27,46,0.6)",
                border: "1px solid rgba(26,45,66,0.9)",
              }}
            >
              <span className="text-3xl">{item.icon}</span>

              <h3
                className="text-lg font-bold text-[#EDF2F7]"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {item.title}
              </h3>

              <p
                className="text-sm text-[#6B8FA8] leading-relaxed"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <a
            href={`${APP_URL}/login`}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.02]"
            style={{
              background: "#2F6F73",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <MessageSquare size={18} />
            Quero participar do beta
          </a>

          <p
            className="mt-4 text-xs text-[#6B8FA8]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Sem cartão de crédito · Acesso imediato · Cancele quando quiser
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
