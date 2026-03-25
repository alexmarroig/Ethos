import { useState } from "react";
import { motion } from "framer-motion";
import { FolderOpen, FileText, File, Download, Database, Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportService } from "@/services/exportService";
import { backupService } from "@/services/backupService";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const DocumentsPage = () => {
  const { toast } = useToast();
  const [purgeText, setPurgeText] = useState("");
  const [exportConfirmed, setExportConfirmed] = useState(false);

  const handleExport = async (format: "pdf" | "docx") => {
    if (!exportConfirmed) {
      toast({
        title: "Confirmação necessária",
        description: "Marque a caixa de confirmação antes de exportar.",
        variant: "destructive",
      });
      return;
    }

    const fn = format === "pdf" ? exportService.exportPdf : exportService.exportDocx;
    const res = await fn({ document_type: "prontuario", document_id: "latest" });

    if (res.success) {
      toast({ title: "Documento exportado", description: `${format.toUpperCase()} gerado.` });
    } else {
      toast({ title: "Erro", description: res.error.message, variant: "destructive" });
    }
  };

  const handleBackup = async () => {
    const res = await backupService.backup();
    if (res.success) {
      toast({ title: "Backup realizado", description: `Arquivo: ${res.data.path}` });
    } else {
      toast({ title: "Erro", description: res.error.message, variant: "destructive" });
    }
  };

  const handlePurge = async () => {
    if (purgeText !== "PURGE") return;
    const res = await backupService.purge("PURGE");
    if (res.success) {
      toast({ title: "Dados limpos", description: "Purge concluído." });
    } else {
      toast({ title: "Erro", description: res.error.message, variant: "destructive" });
    }
    setPurgeText("");
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
            Documentos
          </h1>
          <p className="mt-2 text-muted-foreground">
            Exportação, backup e gestão de dados.
          </p>
        </motion.header>

        {/* Export */}
        <motion.section
          className="mb-8 p-6 rounded-xl border border-border bg-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Download className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="font-serif text-lg font-medium text-foreground">
              Exportar documentos
            </h2>
          </div>

          <label className="flex items-center gap-3 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={exportConfirmed}
              onChange={(e) => setExportConfirmed(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm text-foreground">
              Confirmo que revisei integralmente este documento.
            </span>
          </label>

          <div className="flex gap-3">
            <Button variant="secondary" className="gap-2" onClick={() => handleExport("pdf")}>
              <File className="w-4 h-4" strokeWidth={1.5} />
              Exportar PDF
            </Button>
            <Button variant="secondary" className="gap-2" onClick={() => handleExport("docx")}>
              <FileText className="w-4 h-4" strokeWidth={1.5} />
              Exportar DOCX
            </Button>
          </div>
        </motion.section>

        {/* Backup */}
        <motion.section
          className="mb-8 p-6 rounded-xl border border-border bg-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="font-serif text-lg font-medium text-foreground">
              Backup e restauração
            </h2>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" className="gap-2" onClick={handleBackup}>
              <Database className="w-4 h-4" strokeWidth={1.5} />
              Fazer backup
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="secondary" className="gap-2">
                  <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
                  Restaurar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Restaurar backup</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação substituirá os dados atuais pelo backup selecionado. Deseja continuar?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction>Restaurar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </motion.section>

        {/* Purge */}
        <motion.section
          className="p-6 rounded-xl border-2 border-destructive/20 bg-destructive/5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-destructive" strokeWidth={1.5} />
            <h2 className="font-serif text-lg font-medium text-destructive">
              Zona de perigo
            </h2>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Para limpar todos os dados, digite <strong className="text-foreground">PURGE</strong> abaixo.
          </p>

          <div className="flex gap-3">
            <Input
              value={purgeText}
              onChange={(e) => setPurgeText(e.target.value)}
              placeholder='Digite "PURGE" para confirmar'
              className="max-w-xs"
            />
            <Button
              variant="destructive"
              className="gap-2"
              disabled={purgeText !== "PURGE"}
              onClick={handlePurge}
            >
              <Trash2 className="w-4 h-4" strokeWidth={1.5} />
              Purge
            </Button>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default DocumentsPage;
