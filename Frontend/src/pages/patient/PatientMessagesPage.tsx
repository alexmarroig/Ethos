import { useState } from "react";
import { motion } from "framer-motion";
import { Send, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { patientPortalService, PatientMessage } from "@/services/patientPortalService";
import { useToast } from "@/hooks/use-toast";

const PatientMessagesPage = () => {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<PatientMessage[]>([]);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!content.trim()) return;
    setSending(true);

    const res = await patientPortalService.sendMessage(content);

    if (res.success) {
      setMessages((prev) => [res.data, ...prev]);
      setContent("");
      toast({ title: "Mensagem enviada", description: "Seu terapeuta receberá em breve." });
    } else {
      toast({ title: "Erro", description: res.error.message, variant: "destructive" });
    }

    setSending(false);
  };

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">Mensagens</h1>
          <p className="mt-2 text-muted-foreground">Canal básico com seu terapeuta.</p>
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
            placeholder="Escreva uma mensagem para seu terapeuta..."
            className="min-h-[100px] resize-none text-base leading-relaxed"
          />
          <Button onClick={handleSend} disabled={sending || !content.trim()} className="gap-2">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" strokeWidth={1.5} />}
            Enviar
          </Button>
        </motion.div>

        {messages.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-serif text-lg font-medium text-foreground">Enviadas</h2>
            {messages.map((m) => (
              <div key={m.id} className="session-card">
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">{m.content}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(m.sent_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
        )}

        {messages.length === 0 && (
          <div className="text-center py-8">
            <MessageCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Nenhuma mensagem enviada.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientMessagesPage;
