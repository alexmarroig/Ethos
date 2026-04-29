import { motion } from 'framer-motion';
import { ClipboardList } from 'lucide-react';

interface HomeworkItem {
  id: string;
  title: string;
  description: string;
}

interface HomeworkWidgetProps {
  items: HomeworkItem[];
}

export function HomeworkWidget({ items }: HomeworkWidgetProps) {
  if (items.length === 0) return null;

  return (
    <motion.section
      className="session-card space-y-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
    >
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-serif text-base font-medium md:text-lg">
          Para fazer antes da próxima sessão
        </h2>
      </div>
      <div className="space-y-2.5">
        {items.map(item => (
          <div
            key={item.id}
            className="rounded-xl border border-border/70 bg-background/70 px-4 py-3"
          >
            <p className="text-sm font-medium text-foreground">{item.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
