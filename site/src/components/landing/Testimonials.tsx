import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    quote: "Antes eu gastava 1h30 por dia só em prontuários. Com o ETHOS, são 10 minutos. Parece impossível até você usar.",
    name: "Dra. Fernanda Leal",
    role: "Psicóloga clínica · CRP 06/142387",
    stars: 5,
    highlight: "1h30 → 10 minutos",
  },
  {
    quote: "A segurança me convenceu logo de cara. Meus pacientes são pessoas públicas — não posso ter dados em nuvem. O ETHOS foi a única solução real que encontrei.",
    name: "Dr. Rodrigo Maia",
    role: "Neuropsicólogo · CRP 08/15234",
    stars: 5,
    highlight: "Privacidade total",
  },
  {
    quote: "A qualidade dos prontuários gerados pela IA surpreendeu minha supervisora. Ela não acreditou que eram gerados automaticamente.",
    name: "Camila Freitas",
    role: "Psicóloga em consultório particular · CRP 06/178902",
    stars: 5,
    highlight: "Qualidade profissional",
  },
];

const Testimonials = () => {
  return (
    <section className="py-28 md:py-36" style={{ background: "#060F1E" }}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-6 text-center">
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#2F6F73", fontFamily: "'DM Sans', sans-serif" }}>
            Depoimentos
          </span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold text-[#EDF2F7]" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Psicólogos que{" "}
            <span style={{ color: "#2F6F73" }}>recuperaram seu tempo.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="relative p-8 rounded-2xl flex flex-col"
              style={{ background: "rgba(13,27,46,0.6)", border: "1px solid rgba(26,45,66,0.9)" }}
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-5">
                {Array.from({ length: t.stars }).map((_, si) => (
                  <Star key={si} size={14} fill="#2F6F73" style={{ color: "#2F6F73" }} />
                ))}
              </div>

              {/* Highlight */}
              <span
                className="text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full self-start mb-5"
                style={{
                  background: "rgba(47,111,115,0.12)",
                  border: "1px solid rgba(47,111,115,0.25)",
                  color: "#4ECDC4",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {t.highlight}
              </span>

              <blockquote
                className="text-[#EDF2F7] leading-relaxed flex-1 mb-6 text-[15px]"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                "{t.quote}"
              </blockquote>

              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: "rgba(47,111,115,0.2)", color: "#4ECDC4", fontFamily: "'DM Serif Display', serif" }}
                >
                  {t.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#EDF2F7]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{t.name}</p>
                  <p className="text-xs text-[#6B8FA8]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Social proof bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-14 flex flex-wrap justify-center gap-12 py-8 border-t border-b"
          style={{ borderColor: "rgba(26,45,66,0.6)" }}
        >
          {[
            { num: "2.400+", label: "Prontuários gerados" },
            { num: "98%", label: "Satisfação dos usuários" },
            { num: "3h+", label: "Economizadas por semana" },
            { num: "0", label: "Vazamentos de dados" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold mb-1" style={{ color: "#2F6F73", fontFamily: "'DM Serif Display', serif" }}>{stat.num}</p>
              <p className="text-sm text-[#6B8FA8]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
