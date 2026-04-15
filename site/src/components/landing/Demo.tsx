import { motion } from "framer-motion";
import ethosDashboard from "@/assets/ethos-dashboard.jpg";

export default function Demo() {
  return (
    <section id="demo" className="py-28 md:py-36" style={{ background: "#060F1E" }}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-6 text-center">
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#2F6F73", fontFamily: "'DM Sans', sans-serif" }}>
            Veja em ação
          </span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
          <h2 className="text-4xl md:text-6xl font-bold text-[#EDF2F7] mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Interface projetada
            <br />
            <span style={{ color: "#2F6F73" }}>para o clínico.</span>
          </h2>
          <p className="text-lg text-[#6B8FA8] max-w-xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Limpa, rápida e focada no que importa. Sem excesso. Sem distração.
          </p>
        </motion.div>

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
            <div
              className="flex items-center gap-2 px-5 py-3.5"
              style={{ background: "rgba(13,27,46,0.95)", borderBottom: "1px solid rgba(47,111,115,0.12)" }}
            >
              <span className="w-3 h-3 rounded-full bg-red-500/50" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <span className="w-3 h-3 rounded-full bg-green-500/50" />
              <div
                className="mx-auto flex items-center gap-2 text-xs px-16 py-1.5 rounded-md"
                style={{ background: "rgba(6,15,30,0.9)", color: "#6B8FA8", fontFamily: "'JetBrains Mono', monospace" }}
              >
                <span className="w-2 h-2 rounded-full bg-[#2F6F73] pulse-teal" />
                ethos.local — Funcionando offline
              </div>
            </div>
            <img
              src={ethosDashboard}
              alt="Interface do ETHOS — gestão clínica completa"
              className="w-full h-auto block"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-10 flex flex-wrap justify-center gap-6"
        >
          {["Dados locais", "Funciona offline", "CRP compatível", "IA integrada"].map((feat) => (
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
