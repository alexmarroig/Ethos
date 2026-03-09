import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

const LETTERS = ["E", "T", "H", "O", "S"];
const CIRCLE_RADIUS = 80;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const containerControls = useAnimation();
  const haloControls = useAnimation();

  useEffect(() => {
    const sequence = async () => {
      // 0.4s — halo emerges
      haloControls.start({
        opacity: [0, 0.3],
        transition: { duration: 1.2, ease: "easeOut" },
      });

      // 4.0s — single light pulse
      setTimeout(() => {
        haloControls.start({
          opacity: [0.3, 0.5, 0.3],
          transition: { duration: 1.5, ease: "easeInOut" },
        });
      }, 4000);

      // 5.0s — dissolve everything
      setTimeout(async () => {
        await containerControls.start({
          opacity: 0,
          transition: { duration: 1, ease: "easeInOut" },
        });
        onComplete();
      }, 5000);
    };

    sequence();
  }, [onComplete, containerControls, haloControls]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: "#1a1d23" }}
      initial={{ opacity: 1 }}
      animate={containerControls}
    >
      {/* Film grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.04,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />

      {/* Radial halo */}
      <motion.div
        className="absolute"
        style={{
          width: 500,
          height: 500,
          background: "radial-gradient(circle, hsl(210 15% 25% / 0.3) 0%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
        initial={{ opacity: 0 }}
        animate={haloControls}
      />

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* SVG Ring */}
        <div className="absolute" style={{ top: "50%", left: "50%", transform: "translate(-50%, -55%)" }}>
          <svg width={CIRCLE_RADIUS * 2 + 20} height={CIRCLE_RADIUS * 2 + 20} style={{ overflow: "visible" }}>
            <motion.circle
              cx={CIRCLE_RADIUS + 10}
              cy={CIRCLE_RADIUS + 10}
              r={CIRCLE_RADIUS}
              fill="none"
              stroke="#e8e4df"
              strokeWidth={1.2}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              initial={{ strokeDashoffset: CIRCUMFERENCE, opacity: 0.3 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ delay: 1.2, duration: 1.8, ease: "easeInOut" }}
              style={{ opacity: 0.3 }}
            />
          </svg>
        </div>

        {/* ETHOS letters */}
        <div className="flex" style={{ gap: "0.35em" }}>
          {LETTERS.map((letter, i) => (
            <motion.span
              key={letter}
              className="font-serif text-6xl md:text-7xl font-medium"
              style={{ color: "#e8e4df", letterSpacing: "0.05em" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 + i * 0.15, duration: 0.6, ease: "easeOut" }}
            >
              {letter}
            </motion.span>
          ))}
        </div>

        {/* Tagline */}
        <motion.p
          className="mt-8 font-sans text-base md:text-lg"
          style={{ color: "#a09a92" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2, duration: 0.8, ease: "easeOut" }}
        >
          Prática clínica. Com cuidado.
        </motion.p>

        {/* Loading bar */}
        <motion.div
          className="mt-8"
          style={{
            width: 120,
            height: 1,
            backgroundColor: "rgba(232, 228, 223, 0.15)",
            transformOrigin: "left",
          }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 2.8, duration: 2, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  );
};

export default SplashScreen;
