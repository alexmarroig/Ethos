import { motion } from "framer-motion";
import glowBase from "@/assets/logo-splash/glow-base.png";
import glowPeak from "@/assets/logo-splash/glow-peak.png";

interface LogoRevealSplashProps {
  onComplete: () => void;
}

const LogoRevealSplash = ({ onComplete }: LogoRevealSplashProps) => {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: "#060F1E" }}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: "easeInOut" }}
      onAnimationComplete={undefined}
    >
      <div className="absolute inset-0 bg-grid opacity-20" />

      <motion.img
        src={glowBase}
        alt=""
        aria-hidden
        className="pointer-events-none absolute h-[28rem] w-[28rem] object-contain opacity-0 md:h-[34rem] md:w-[34rem]"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 0.7, scale: 1 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      />

      <motion.img
        src={glowPeak}
        alt=""
        aria-hidden
        className="pointer-events-none absolute h-[32rem] w-[32rem] object-contain opacity-0 md:h-[40rem] md:w-[40rem]"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 0.9, 0.15, 0] }}
        transition={{ duration: 1.5, times: [0, 0.2, 0.45, 0.72, 1], ease: "easeInOut" }}
      />

      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          className="relative overflow-hidden px-4"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <motion.h1
            className="font-serif text-5xl font-semibold tracking-[0.28em] text-[#EDF2F7] md:text-7xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-[#2F6F73]">E</span>THOS
          </motion.h1>

          <motion.div
            className="pointer-events-none absolute inset-y-[-30%] w-24 rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.92)_0%,_rgba(124,255,243,0.65)_35%,_rgba(124,255,243,0.08)_70%,_transparent_100%)] blur-xl"
            initial={{ x: "-140%", opacity: 0 }}
            animate={{ x: "240%", opacity: [0, 1, 0] }}
            transition={{ duration: 1.2, delay: 0.35, ease: "easeInOut" }}
          />
        </motion.div>

        <motion.p
          className="mt-6 text-xs uppercase tracking-[0.35em] text-[#9AA7B5] md:text-sm"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          Ética clínica. Com presença.
        </motion.p>
      </div>

      <motion.div
        className="absolute bottom-16 h-px w-28 bg-white/20"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0 }}
        onAnimationComplete={() => {
          window.setTimeout(onComplete, 2100);
        }}
      />
    </motion.div>
  );
};

export default LogoRevealSplash;
