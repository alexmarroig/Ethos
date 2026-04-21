import { motion } from "framer-motion";
import { useEffect } from "react";

interface LogoRevealSplashProps {
  onComplete: () => void;
}

const LETTERS = ["E", "T", "H", "O", "S"];

const LogoRevealSplash = ({ onComplete }: LogoRevealSplashProps) => {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 2900);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#030813]"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.42, ease: "easeInOut" }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,205,111,0.14)_0%,rgba(11,18,31,0.5)_34%,rgba(3,8,19,1)_72%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(255,214,130,0.04)_46%,transparent_62%)]" />

      <motion.div
        aria-hidden="true"
        className="absolute h-[32rem] w-[32rem] rounded-full bg-[#f2bb55]/15 blur-[86px] md:h-[46rem] md:w-[46rem]"
        initial={{ opacity: 0, scale: 0.62 }}
        animate={{ opacity: [0, 0.92, 0.58], scale: [0.62, 1.08, 1] }}
        transition={{ duration: 1.65, ease: [0.22, 1, 0.36, 1] }}
      />

      <motion.section
        className="relative z-10 flex flex-col items-center px-6"
        initial={{ opacity: 0, scale: 0.92, filter: "blur(10px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.76, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="relative isolate overflow-visible py-8">
          <motion.div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 select-none font-serif text-[clamp(5rem,15vw,12rem)] font-semibold tracking-[0.18em] text-[#f7c96e] blur-[16px]"
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: [0, 0.78, 0.34], scale: [0.88, 1.05, 1] }}
            transition={{ duration: 2.15, ease: "easeOut" }}
          >
            ETHOS
          </motion.div>

          <motion.h1
            aria-label="ETHOS"
            className="relative flex select-none items-center justify-center gap-[0.05em] font-serif text-[clamp(4.8rem,14vw,11rem)] font-semibold leading-none tracking-[0.16em]"
            initial="hidden"
            animate="visible"
          >
            {LETTERS.map((letter, index) => (
              <motion.span
                key={letter}
                className="inline-block bg-[linear-gradient(115deg,#6e4b16_0%,#d79735_24%,#fff0ae_48%,#f2bd54_68%,#8c5b19_100%)] bg-[length:260%_100%] bg-clip-text text-transparent"
                style={{
                  WebkitTextStroke: "0.7px rgba(255, 231, 166, 0.34)",
                  filter:
                    "drop-shadow(0 0 12px rgba(246, 197, 91, 0.62)) drop-shadow(0 0 34px rgba(246, 197, 91, 0.34))",
                }}
                variants={{
                  hidden: { opacity: 0, y: 18, scale: 0.96 },
                  visible: { opacity: 1, y: 0, scale: 1 },
                }}
                transition={{
                  delay: 0.16 + index * 0.08,
                  duration: 0.62,
                  ease: [0.16, 1, 0.3, 1],
                }}
                animate={{
                  backgroundPosition: ["-180% center", "55% center", "220% center"],
                  textShadow: [
                    "0 0 0 rgba(247, 201, 110, 0)",
                    "0 0 22px rgba(247, 201, 110, 0.9), 0 0 70px rgba(247, 201, 110, 0.36)",
                    "0 0 10px rgba(247, 201, 110, 0.48), 0 0 30px rgba(247, 201, 110, 0.22)",
                  ],
                }}
              >
                {letter}
              </motion.span>
            ))}
          </motion.h1>

          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-x-20 top-1/2 h-32 -translate-y-1/2 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.92, 0] }}
            transition={{ duration: 1.68, delay: 0.66, times: [0, 0.12, 0.72, 1] }}
          >
            <motion.div
              className="absolute -top-10 h-52 w-28 -skew-x-12 rounded-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,232,166,0.18)_18%,rgba(255,245,197,0.96)_48%,rgba(246,191,75,0.3)_74%,transparent_100%)] blur-[5px]"
              style={{
                boxShadow:
                  "0 0 34px rgba(255, 231, 166, 0.86), 0 0 86px rgba(246, 197, 91, 0.48)",
              }}
              initial={{ x: "-26vw" }}
              animate={{ x: "58vw" }}
              transition={{ duration: 1.48, delay: 0.66, ease: [0.65, 0, 0.35, 1] }}
            />
          </motion.div>
        </div>

        <motion.p
          className="mt-1 text-center text-[0.68rem] uppercase tracking-[0.5em] text-[#d9c59b]/75 md:text-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: [0, 0.82, 0.82], y: 0 }}
          transition={{ duration: 1.2, delay: 0.78, ease: "easeOut" }}
        >
          Ética clínica. Com presença.
        </motion.p>

        <motion.div
          aria-hidden="true"
          className="mt-7 h-px w-44 bg-[linear-gradient(90deg,transparent,rgba(255,231,166,0.9),transparent)]"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: [0, 1, 0.82], opacity: [0, 1, 0.34] }}
          transition={{ duration: 1.5, delay: 0.86, ease: "easeInOut" }}
        />
      </motion.section>
    </motion.div>
  );
};

export default LogoRevealSplash;
