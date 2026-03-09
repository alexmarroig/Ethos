import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type SessionStatus = "pending" | "validated" | "draft";

interface SessionCardProps {
  patientName: string;
  date: string;
  time: string;
  status: SessionStatus;
  statusLabel: string;
  onClick: () => void;
  index?: number;
}

const statusConfig: Record<SessionStatus, { class: string; dotClass: string }> = {
  pending: {
    class: "status-pending",
    dotClass: "bg-status-pending",
  },
  validated: {
    class: "status-validated",
    dotClass: "bg-status-validated",
  },
  draft: {
    class: "status-draft",
    dotClass: "bg-status-draft",
  },
};

const SessionCard = ({
  patientName,
  date,
  time,
  status,
  statusLabel,
  onClick,
  index = 0,
}: SessionCardProps) => {
  const config = statusConfig[status];

  return (
    <motion.button
      className={cn("session-card w-full text-left", config.class)}
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.08,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-lg font-medium text-foreground truncate">
            {patientName}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {date} · {time}
          </p>
        </div>

        <div className="flex items-center gap-2 ml-4 shrink-0">
          <span className={cn("w-2 h-2 rounded-full", config.dotClass)} />
          <span className="text-sm text-muted-foreground">{statusLabel}</span>
        </div>
      </div>
    </motion.button>
  );
};

export default SessionCard;
