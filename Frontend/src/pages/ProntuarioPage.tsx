import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Edit, FileCheck, Download, FileText, File, Loader2, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { clinicalNoteService, ClinicalNote } from "@/services/clinicalNoteService";
import { exportService } from "@/services/exportService";
import { privateCommentsApi } from "@/api/clinical";
import type { PrivateComment } from "@/api/types";
import IntegrationUnavailable from "@/components/IntegrationUnavailable";
import { useIsMobile } from "@/hooks/use-mobile";
import SavedLocally from "@/components/SavedLocally";

interface ProntuarioPageProps {
  sessionId: number;
  onBack: () => void;
}

interface ProntuarioContent {
  queixa_principal: string;
  observacoes_clinicas: string;
  evolucao: string;
  plano_terapeutico: string;
}

const ProntuarioPage = ({ sessionId, onBack }: ProntuarioPageProps) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [status, setStatus] = useState<"draft" | "validated">("draft");
  const [isEditing, setIsEditing] = useState(true);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [error, setError] = useState<{ message: string; requestId: string } | null>(null);
  const [content, setContent] = useState<ProntuarioContent>({
    queixa_principal: "",
    observacoes_clinicas: "",
    evolucao: "",
    plano_terapeutico: "",
  });

  // Private comments
  const [comments, setComments] = useState<PrivateComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await clinicalNoteService.listBySession(String(sessionId));
      if (!res.success) {
        setError({ message: res.error.message, requestId: res.request_id });
        setLoading(false);
        return;
      }

      const notes = res.data;
      if (notes.length > 0) {
        const latest = notes[notes.length - 1];
        setNoteId(latest.id);
        setStatus(latest.status);
        setContent(latest.content);
        setIsEditing(latest.status === "draft");

        // Load private comments
        const commentsRes = await privateCommentsApi.list(latest.id);
        if (commentsRes.success) setComments(commentsRes.data);
      }
      setLoading(false);
    };
    load();
  }, [sessionId]);

  const handleSave = async () => {
    setSaving(true);
    const res = await clinicalNoteService.create(String(sessionId), content);
    if (res.success) {
      setNoteId(res.data.id);
      setShowSaved(true);
    } else {
      toast({ title: "Erro", description: res.error.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleValidate = async () => {
    if (!noteId) {
      const saveRes = await clinicalNoteService.create(String(sessionId), content);
      if (!saveRes.success) {
        toast({ title: "Erro", description: saveRes.error.message, variant: "destructive" });
        return;
      }
      setNoteId(saveRes.data.id);
      const valRes = await clinicalNoteService.validate(saveRes.data.id);
      if (valRes.success) {
        setStatus("validated");
        setIsEditing(false);
        toast({ title: "Prontuário validado", description: "Registro assumido sob sua responsabilidade clínica." });
      } else {
        toast({ title: "Erro", description: valRes.error.message, variant: "destructive" });
      }
      return;
    }

    const res = await clinicalNoteService.validate(noteId);
    if (res.success) {
      setStatus("validated");
      setIsEditing(false);
      toast({ title: "Prontuário validado", description: "Registro assumido sob sua responsabilidade clínica." });
    } else {
      toast({ title: "Erro", description: res.error.message, variant: "destructive" });
    }
  };

  const handleExport = async (format: "pdf" | "docx") => {
    if (!noteId) return;
    const fn = format === "pdf" ? exportService.exportPdf : exportService.exportDocx;
    const res = await fn({ document_type: "clinical_note", document_id: noteId });
    if (res.success) {
      toast({ title: "Exportando", description: `${format.toUpperCase()} gerado.` });
    } else {
      toast({ title: "Erro", description: res.error.message, variant: "destructive" });
    }
  };

  const handleSendComment = async () => {
    if (!noteId || !newComment.trim()) return;
    setSendingComment(true);
    const res = await privateCommentsApi.create(noteId, newComment.trim());
    if (res.success) {
      setComments((prev) => [...prev, res.data]);
      setNewComment("");
    } else {
      toast({ title: "Erro", description: res.error.message, variant: "destructive" });
    }
    setSendingComment(false);
  };

  const updateContent = (field: keyof ProntuarioContent, value: string) => {
    setContent((prev) => ({ ...prev, [field]: value }));
  };

  const sections = [
    { key: "queixa_principal" as const, label: "Queixa principal" },
    { key: "observacoes_clinicas" as const, label: "Observações clínicas" },
    { key: "evolucao" as const, label: "Evolução" },
    { key: "plano_terapeutico" as const, label: "Plano terapêutico" },
  ];

  if (loading) {
    return (
      <div className="content-container py-12">
        <p className="loading-text">Preparando prontuário...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-container py-12">
        <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          <span className="text-sm">Voltar</span>
        </button>
        <IntegrationUnavailable message={error.message} requestId={error.requestId} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      <div className="content-container py-6 md:py-8">
        <motion.button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-200 mb-8" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          <span className="text-sm">Voltar</span>
        </motion.button>

        <motion.header className="mb-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-3xl font-medium text-foreground">Prontuário da sessão</h1>
          <motion.div
            className={cn("mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm", status === "draft" ? "bg-status-pending/10 text-status-pending border border-status-pending/20" : "bg-status-validated/10 text-status-validated border border-status-validated/20")}
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
          >
            <span className={cn("w-2 h-2 rounded-full", status === "draft" ? "bg-status-pending" : "bg-status-validated")} />
            {status === "draft" ? "Rascunho — revisão necessária" : "Prontuário validado"}
          </motion.div>
        </motion.header>

        <SavedLocally show={showSaved} onDone={() => setShowSaved(false)} />

        <motion.div
          className={cn("rounded-xl border-2 p-4 md:p-6 space-y-6", status === "draft" ? "border-status-pending/30 bg-status-pending/5" : "border-status-validated/30 bg-status-validated/5")}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        >
          {sections.map((section, index) => (
            <motion.div key={section.key} className="space-y-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 + index * 0.05 }}>
              <label className="font-serif text-lg font-medium text-foreground">{section.label}</label>
              {isEditing && status === "draft" ? (
                <Textarea value={content[section.key]} onChange={(e) => updateContent(section.key, e.target.value)} className="min-h-[100px] resize-none text-base leading-relaxed bg-background" />
              ) : (
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">{content[section.key] || "—"}</p>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Private Comments */}
        {noteId && (
          <motion.section className="mt-8" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              <h2 className="font-serif text-lg font-medium text-foreground">Comentários privados</h2>
            </div>

            <div className="space-y-3 mb-4">
              {comments.map((c) => (
                <div key={c.id} className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm text-foreground">{c.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(c.created_at).toLocaleString("pt-BR")}</p>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum comentário privado.</p>
              )}
            </div>

            <div className="flex gap-2">
              <Textarea
                placeholder="Adicionar comentário privado..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[60px] resize-none text-sm"
              />
              <Button variant="secondary" size="icon" onClick={handleSendComment} disabled={sendingComment || !newComment.trim()}>
                {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" strokeWidth={1.5} />}
              </Button>
            </div>
          </motion.section>
        )}

        {/* Actions */}
        <motion.div
          className={`fixed bottom-0 right-0 p-4 md:p-6 bg-gradient-to-t from-background via-background to-transparent ${isMobile ? "left-0" : "left-64"}`}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        >
          <div className="content-container flex flex-wrap gap-3">
            {status === "draft" ? (
              <>
                {isEditing && (
                  <Button variant="secondary" className="gap-2" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Salvar rascunho
                  </Button>
                )}
                {!isEditing && (
                  <Button variant="secondary" className="gap-2" onClick={() => setIsEditing(true)}>
                    <Edit className="w-4 h-4" strokeWidth={1.5} />
                    Editar
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="gap-2">
                      <FileCheck className="w-4 h-4" strokeWidth={1.5} />
                      Validar prontuário
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-serif text-xl">Validar prontuário</AlertDialogTitle>
                      <AlertDialogDescription className="text-base leading-relaxed">
                        Ao validar, você assume responsabilidade clínica por este registro.
                        <br />
                        <strong className="text-foreground">Esta ação não pode ser desfeita.</strong>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleValidate}>Validar e assumir responsabilidade</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="gap-2">
                    <Download className="w-4 h-4" strokeWidth={1.5} />
                    Exportar documento
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => handleExport("pdf")} className="gap-2">
                    <File className="w-4 h-4" strokeWidth={1.5} />
                    PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("docx")} className="gap-2">
                    <FileText className="w-4 h-4" strokeWidth={1.5} />
                    Word
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProntuarioPage;
