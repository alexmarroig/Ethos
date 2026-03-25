import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { patientPortalService } from "@/services/patientPortalService";
import { useToast } from "@/hooks/use-toast";

const PatientDiaryPage = () => {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<{ id: string; content: string; created_at: string }[]>([]);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);

    const res = await patientPortalService.createDiaryEntry(content);

    if (res.success) {
      setEntries((prev) => [res.data, ...prev]);
      setContent("");
      toast({ title: "Entrada salva", description: "Seu registro foi armazenado." });
    } else {
      toast({ title: "Erro", description: res.error.message, variant: "destructive" });
    }

    setSaving(false);
  };

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">Diário</h1>
          <p className="mt-2 text-muted-foreground">Registre como você se sentiu.</p>
        </motion.header>

        <motion.div
          className="mb-8 space-y-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Como foi seu dia? O que chamou sua atenção?"
            className="min-h-[120px] resize-none text-base leading-relaxed"
          />
          <Button onClick={handleSave} disabled={saving || !content.trim()} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" strokeWidth={1.5} />}
            Salvar entrada
          </Button>
        </motion.div>

        {entries.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-serif text-lg font-medium text-foreground">Entradas recentes</h2>
            {entries.map((e) => (
              <div key={e.id} className="session-card">
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">{e.content}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(e.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
        )}

        {entries.length === 0 && (
          <div className="text-center py-8">
            <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Nenhuma entrada ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientDiaryPage;
