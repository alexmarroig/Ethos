import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { aiService } from "@/services/aiService";

const AIPage = () => {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOrganize = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setOutput("");

    const res = await aiService.organize(input);

    if (res.success) {
      setOutput(res.data.organized_text);
    } else {
      setError(res.error.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header
          className="mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">
            IA — Organizar texto
          </h1>
          <p className="mt-2 text-muted-foreground">
            Ferramenta auxiliar para organização textual.
          </p>
        </motion.header>

        {/* Disclaimer */}
        <motion.div
          className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">
            Organização textual. Não produz diagnóstico ou conduta.
          </p>
        </motion.div>

        {/* Input */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div>
            <label className="font-serif text-lg font-medium text-foreground mb-2 block">
              Texto bruto
            </label>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Cole aqui o texto que deseja organizar..."
              className="min-h-[160px] resize-none text-base leading-relaxed"
            />
          </div>

          <Button
            onClick={handleOrganize}
            disabled={loading || !input.trim()}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Organizando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" strokeWidth={1.5} />
                Organizar texto
              </>
            )}
          </Button>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Output */}
          {output && (
            <motion.div
              className="p-6 rounded-xl border border-border bg-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="font-serif text-lg font-medium text-foreground mb-3">
                Texto organizado
              </h2>
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">{output}</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AIPage;
