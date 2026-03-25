import { motion } from "framer-motion";
import { Plus, FileText, FileCheck, Edit3 } from "lucide-react";

export type SessionState = "no-session" | "no-record" | "no-prontuario" | "draft-prontuario";

interface FloatingActionButtonProps {
  state: SessionState;
  onClick: () => void;
}

const stateConfig: Record<SessionState, { label: string; icon: React.ElementType }> = {
  "no-session": {
    label: "Nova sessão",
    icon: Plus,
  },
  "no-record": {
    label: "Registrar sessão",
    icon: FileText,
  },
  "no-prontuario": {
    label: "Gerar prontuário",
    icon: FileCheck,
  },
  "draft-prontuario": {
    label: "Revisar prontuário",
    icon: Edit3,
  },
};

const FloatingActionButton = ({ state, onClick }: FloatingActionButtonProps) => {
  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <motion.button
      className="fab flex items-center gap-3"
      onClick={onClick}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      <Icon className="w-5 h-5" strokeWidth={1.5} />
      <motion.span
        key={state}
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="text-sm"
      >
        {config.label}
      </motion.span>
    </motion.button>
  );
};

export default FloatingActionButton;
