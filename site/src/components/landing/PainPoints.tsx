import { motion } from "framer-motion";

const pains = [
  {
    stat: "3h+",
    title: "perdidas por semana",
    desc: "Em prontuários escritos à mão após cada sessão. Tempo que poderia ir para mais pacientes — ou para você.",
  },
  {
    stat: "87%",
    title: "dos psicólogos relatam esgotamento",
    desc: "A burocracia clínica é apontada como principal causa de burnout na profissão.",
  },
  {
    stat: "40%",
    title: "do tempo em documentação",
    desc: "Quase metade da jornada vai para formulários, relatórios e prontuários que poderiam ser automatizados.",
  },
  {
    stat: "1 em 3",
    title: "abandonam a clínica nos primeiros 5 anos",
    desc: "Por sobrecarga administrativa e falta de suporte tecnológico adequado.",
  },
];

const PainPoints = () => {
  return (
    <section id="problema" className="relative overflow-hidden" style={{ background: "#060F1E" }}>

      {/* Editorial statement — light contrast block */}
      <div className="py-24 md:py-36 px-6" style={{ background: "#F5F0E8" }}>
        <div className="max-w-4xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-xs font-semibold tracking-widest uppercase mb-8"
            style={{ color: "#2F6F73", fontFamily: "'DM Sans', sans-serif" }}
          >
            A realidade da clínica
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.1 }}
            className="text-4xl md:text-6xl xl:text-7xl font-bold leading-[1.07] mb-10"
            style={{ fontFamily: "'DM Serif Display', serif", color: "#0D1B2A" }}
          >
            Depois de um dia inteiro
            <br />de atendimentos,{" "}
            <em style={{ color: "#2F6F73", fontStyle: "italic" }}>ainda restam</em>
            <br />
            evoluções para escrever,
            <br />prontuários para organizar
            <br />e pagamentos para conferir.
          </motion.h2>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="w-16 h-px mb-10"
            style={{ background: "#2F6F73" }}
          />

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="text-xl md:text-2xl leading-relaxed max-w-2xl"
            style={{ fontFamily: "'DM Sans', sans-serif", color: "#3D5166" }}
          >
            A sobrecarga documental é hoje uma das principais fontes de esgotamento
            na prática clínica. O resultado? Cansaço acumulado, menos tempo para
            estudo e supervisão — e maior risco de burnout.
          </motion.p>
        </div>
      </div>

      {/* Stats grid — dark */}
      <div className="py-24 md:py-32 px-6" style={{ background: "#060F1E" }}>
        <div className="max-w-7xl mx-auto">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px" style={{ background: "rgba(26,45,66,0.6)" }}>
            {pains.map((pain, i) => (
              <motion.div
                key={pain.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="p-8 group"
                style={{ background: "#060F1E" }}
              >
                <p
                  className="text-5xl xl:text-6xl font-bold mb-3 leading-none transition-colors duration-300 group-hover:text-[#4ECDC4]"
                  style={{ color: "#2F6F73", fontFamily: "'DM Serif Display', serif" }}
                >
                  {pain.stat}
                </p>
                <p className="text-sm font-semibold text-[#EDF2F7] mb-3 leading-snug" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {pain.title}
                </p>
                <p className="text-sm text-[#6B8FA8] leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {pain.desc}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Quote */}
          <motion.blockquote
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-20 max-w-3xl mx-auto text-center"
          >
            <div className="w-px h-12 mx-auto mb-8" style={{ background: "rgba(47,111,115,0.4)" }} />
            <p
              className="text-2xl md:text-3xl font-bold text-[#EDF2F7] leading-snug mb-6"
              style={{ fontFamily: "'DM Serif Display', serif", fontStyle: "italic" }}
            >
              "O maior inimigo do psicólogo clínico não é a falta de pacientes.
              É o tempo perdido depois de cada sessão."
            </p>
            <footer className="text-sm text-[#6B8FA8]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Reflexão comum entre psicólogos com mais de 5 anos de clínica
            </footer>
          </motion.blockquote>
        </div>
      </div>
    </section>
  );
};

export default PainPoints;
