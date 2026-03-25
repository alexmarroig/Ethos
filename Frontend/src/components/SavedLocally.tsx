import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, HardDrive } from "lucide-react";

interface SavedLocallyProps {
  show: boolean;
  onDone?: () => void;
  duration?: number;
}

const SavedLocally = ({ show, onDone, duration = 3000 }: SavedLocallyProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onDone?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onDone]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-status-validated/10 text-status-validated border border-status-validated/20 text-sm"
          initial={{ opacity: 0, scale: 0.9, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          <HardDrive className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>Salvo localmente</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SavedLocally;
