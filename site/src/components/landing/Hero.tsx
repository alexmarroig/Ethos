import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Lock, Cpu } from "lucide-react";
import dashboardImg from "@/assets/screen-inicio.png";
import { APP_URL } from "@/config/site";
import { trackEvent } from "@/lib/tracking";

const badges = [
  { icon: Shield, label: "Dados 100% locais" },
  { icon: Lock, label: "Sem servidores externos" },
  { icon: Cpu, label: "IA com você no dispositivo" },
];

const WORDS = ["cuidar de pessoas.", "transformar vidas.", "fazer clínica."];

const Hero = () => {
  const [wordIndex, setWordIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const current = WORDS[wordIndex];
    if (!deleting && displayed.length < current.length) {
      timeout.current = setTimeout(() => setDisplayed(current.slice(0, displayed.length + 1)), 55);
    } else if (!deleting && displayed.length === current.length) {
      timeout.current = setTimeout(() => setDeleting(true), 2200);
    } else if (deleting && displayed.length > 0) {
      timeout.current = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 28);
    } else if (deleting && displayed.length === 0) {
      setDeleting(false);
      setWordIndex((i) => (i + 1) % WORDS.length);
    }
    return () => { if (timeout.current) clearTimeout(timeout.current); };
  }, [displayed, deleting, wordIndex]);

  return (
    <section
      className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-20"
      style={{ background: "#060F1E" }}
    >
      {/* Grid bg */}
      <div className="absolute inset-0 bg-grid opacity-100" />

      {/* Radial glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "20%",
          left: "55%",
          width: "800px",
          height: "600px",
          background: "radial-gradient(ellipse at center, rgba(47,111,115,0.14) 0%, transparent 65%)",
          transform: "translateX(-50%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — copy */}
          <div>
            {/* Label */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3 mb-8"
            >
              <span
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase"
                style={{
                  background: "rgba(47,111,115,0.1)",
                  border: "1px solid rgba(47,111,115,0.25)",
                  color: "#4ECDC4",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <span className="pulse-teal w-1.5 h-1.5 rounded-full bg-[#4ECDC4] inline-block" />
                Beta aberto — acesso gratuito
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-6xl xl:text-7xl font-bold leading-[1.08] mb-6"
              style={{ fontFamily: "'DM Serif Display', serif", color: "#EDF2F7" }}
            >
              Você se formou para{" "}
              <br className="hidden md:block" />
              <span style={{ color: "#2F6F73" }}>{displayed}<span className="cursor-blink" style={{ color: "#4ECDC4" }}>|</span></span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="text-lg md:text-xl text-[#6B8FA8] leading-relaxed mb-10 max-w-lg"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              O ETHOS cuida da burocracia para você focar no que realmente importa.
              Prontuários com IA, agenda, finanças e sigilo absoluto — tudo no seu dispositivo.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.38 }}
              className="flex flex-col sm:flex-row gap-3 mb-12"
            >
              <a
                href={APP_URL}
                onClick={() => trackEvent("cta_app_click", { location: "hero" })}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-white text-sm transition-all duration-200 hover:opacity-90 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(47,111,115,0.5)]"
                style={{ background: "#2F6F73", fontFamily: "'DM Sans', sans-serif" }}
              >
                Testar grátis por 7 dias <ArrowRight size={16} />
              </a>
              <a
                href="#demo"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-medium text-sm transition-all duration-200 hover:text-[#EDF2F7]"
                style={{
                  color: "#6B8FA8",
                  border: "1px solid rgba(26,45,66,0.9)",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Ver como funciona
              </a>
            </motion.div>

            {/* Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="flex flex-wrap gap-4"
            >
              {badges.map((b) => (
                <span
                  key={b.label}
                  className="flex items-center gap-2 text-xs"
                  style={{ color: "#6B8FA8", fontFamily: "'DM Sans', sans-serif" }}
                >
                  <b.icon size={13} style={{ color: "#2F6F73" }} />
                  {b.label}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right — screenshot */}
          <motion.div
            initial={{ opacity: 0, x: 32, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="relative hidden lg:block"
          >
            {/* Glow behind */}
            <div
              className="absolute -inset-4 rounded-3xl pointer-events-none"
              style={{ background: "radial-gradient(ellipse at 60% 40%, rgba(47,111,115,0.2), transparent 70%)" }}
            />

            <div
              className="relative rounded-2xl overflow-hidden"
              style={{
                border: "1px solid rgba(47,111,115,0.2)",
                boxShadow: "0 32px 80px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(47,111,115,0.08)",
              }}
            >
              {/* Browser chrome */}
              <div
                className="flex items-center gap-2 px-4 py-3"
                style={{ background: "rgba(13,27,46,0.98)", borderBottom: "1px solid rgba(47,111,115,0.1)" }}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                <div
                  className="mx-auto flex items-center gap-1.5 text-xs px-10 py-1 rounded"
                  style={{ background: "rgba(6,15,30,0.8)", color: "#6B8FA8", fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2F6F73] pulse-teal" />
                  ethos.local
                </div>
              </div>
              <img
                src={dashboardImg}
                alt="Painel do ETHOS — Início"
                className="w-full h-auto block"
                width={1569}
                height={726}
                sizes="(min-width: 1024px) 50vw, 100vw"
                loading="eager"
                fetchpriority="high"
                decoding="sync"
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
        style={{ background: "linear-gradient(transparent, #060F1E)" }}
      />
    </section>
  );
};

export default Hero;
