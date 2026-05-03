import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { APP_URL } from "@/config/site";
import { trackEvent } from "@/lib/tracking";

const CtaFinal = () => {
  return (
    <section className="py-28 md:py-40 relative overflow-hidden" style={{ background: "#07111F" }}>
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(47,111,115,0.12), transparent 70%)",
        }}
      />
      <div className="absolute inset-0 bg-grid opacity-20" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <span
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase mb-8"
            style={{
              background: "rgba(47,111,115,0.1)",
              border: "1px solid rgba(47,111,115,0.25)",
              color: "#4ECDC4",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <span className="pulse-teal w-1.5 h-1.5 rounded-full bg-[#4ECDC4] inline-block" />
            Comece hoje
          </span>

          <h2
            className="text-5xl md:text-7xl font-bold text-[#EDF2F7] leading-tight mb-6"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Sua clínica mais leve.
            <br />
            <span style={{ color: "#2F6F73" }}>A partir de agora.</span>
          </h2>

          <p
            className="text-xl text-[#6B8FA8] max-w-xl mx-auto mb-12 leading-relaxed"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            7 dias para experimentar tudo. Sem cartão. Sem comprometimento. Só você e sua clínica funcionando melhor.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.a
              href={APP_URL}
              onClick={() => trackEvent("cta_app_click", { location: "final_cta" })}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-semibold text-white text-base"
              style={{
                background: "#2F6F73",
                boxShadow: "0 0 60px rgba(47,111,115,0.4)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Testar grátis por 7 dias <ArrowRight size={16} />
            </motion.a>
          </div>

          <p
            className="mt-6 text-sm text-[#6B8FA8]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Sem cartão de crédito · Cancele quando quiser · Seus dados ficam com você
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CtaFinal;
