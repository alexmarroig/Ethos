import { motion } from "framer-motion";
import { Lock, HardDrive, ShieldCheck, Eye, Server, KeyRound } from "lucide-react";

const privacyPoints = [
  { icon: HardDrive, title: "Armazenamento local", desc: "Todos os dados ficam no seu computador. Nunca sobem para nenhum servidor." },
  { icon: Lock, title: "Criptografia nativa", desc: "Gravações, prontuários e documentos armazenados com criptografia AES-256." },
  { icon: Server, title: "Sem cloud obrigatório", desc: "O ETHOS funciona 100% offline. Sem depender de infraestrutura externa." },
  { icon: Eye, title: "Você tem controle total", desc: "Exporte, delete ou migre seus dados quando quiser. Sem lock-in." },
  { icon: ShieldCheck, title: "Conformidade CRP", desc: "Seguimos as diretrizes do CRP para armazenamento e tratamento de dados clínicos." },
  { icon: KeyRound, title: "Acesso por senha mestra", desc: "Autenticação local com senha criptografada. Ninguém acessa sem você permitir." },
];

const Platforms = () => {
  return (
    <section id="privacidade" className="py-28 md:py-36 relative overflow-hidden" style={{ background: "#07111F" }}>
      {/* Background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: 800,
          height: 600,
          background: "radial-gradient(ellipse, rgba(47,111,115,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left text */}
          <div>
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-6">
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#2F6F73", fontFamily: "'DM Sans', sans-serif" }}>
                Privacidade
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-bold text-[#EDF2F7] leading-tight mb-6"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              Os dados dos seus pacientes
              <br />
              <span style={{ color: "#2F6F73" }}>nunca saem do seu dispositivo.</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-[#6B8FA8] leading-relaxed mb-8"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Diferente das soluções em nuvem, o ETHOS foi projetado desde o primeiro dia para funcionar
              localmente. Sigilo clínico não é um recurso extra — é a arquitetura do sistema.
            </motion.p>

            <motion.a
              href="/login"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white text-sm"
              style={{ background: "#2F6F73", fontFamily: "'DM Sans', sans-serif" }}
            >
              Começar com segurança
            </motion.a>
          </div>

          {/* Right grid */}
          <div className="grid grid-cols-2 gap-4">
            {privacyPoints.map((point, i) => (
              <motion.div
                key={point.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-5 rounded-2xl"
                style={{ background: "rgba(13,27,46,0.6)", border: "1px solid rgba(26,45,66,0.8)" }}
              >
                <point.icon size={18} className="mb-3" style={{ color: "#2F6F73" }} />
                <h4 className="text-sm font-bold text-[#EDF2F7] mb-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {point.title}
                </h4>
                <p className="text-xs text-[#6B8FA8] leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {point.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Platforms;
