import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Upload, Trash2, Loader2, AlertTriangle, CheckCircle2, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { backupService } from "@/services/backupService";
import SavedLocally from "@/components/SavedLocally";

const BackupPage = () => {
  const { toast } = useToast();

  // Backup state
  const [backingUp, setBackingUp] = useState(false);
  const [backupResult, setBackupResult] = useState<{ path: string; size: number } | null>(null);

  // Restore state
  const [restorePath, setRestorePath] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  // Purge state
  const [purgeConfirmation, setPurgeConfirmation] = useState("");
  const [purging, setPurging] = useState(false);
  const [purgeDialogOpen, setPurgeDialogOpen] = useState(false);

  const [showSaved, setShowSaved] = useState(false);

  const handleBackup = async () => {
    setBackingUp(true);
    setBackupResult(null);
    const res = await backupService.backup();
    if (res.success) {
      setBackupResult(res.data);
      setShowSaved(true);
    } else {
      toast({ title: "Erro ao gerar backup", description: res.error.message, variant: "destructive" });
    }
    setBackingUp(false);
  };

  const handleRestore = async () => {
    if (!restorePath.trim()) {
      toast({ title: "Caminho obrigatório", description: "Informe o caminho do backup.", variant: "destructive" });
      return;
    }
    setRestoring(true);
    setRestoreSuccess(false);
    const res = await backupService.restore({ backup_path: restorePath.trim() });
    if (res.success) {
      setRestoreSuccess(true);
      setShowSaved(true);
      toast({ title: "Backup restaurado", description: "Dados restaurados com sucesso." });
    } else {
      toast({ title: "Erro ao restaurar", description: res.error.message, variant: "destructive" });
    }
    setRestoring(false);
  };

  const handlePurge = async () => {
    if (purgeConfirmation !== "PURGE") return;
    setPurging(true);
    const res = await backupService.purge(purgeConfirmation);
    if (res.success) {
      toast({ title: "Dados apagados", description: "Todos os seus dados foram removidos permanentemente." });
      setPurgeDialogOpen(false);
      setPurgeConfirmation("");
    } else {
      toast({ title: "Erro ao apagar", description: res.error.message, variant: "destructive" });
    }
    setPurging(false);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header
          className="mb-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">
            Backup e dados
          </h1>
          <p className="mt-2 text-muted-foreground">
            Gerencie seus dados clínicos com segurança.
          </p>
        </motion.header>

        <SavedLocally show={showSaved} onDone={() => setShowSaved(false)} />

        {/* Backup */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-start gap-3 mb-4">
              <Download className="w-5 h-5 text-primary mt-0.5 shrink-0" strokeWidth={1.5} />
              <div>
                <h2 className="font-serif text-xl font-medium text-foreground">Gerar backup</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Cria uma cópia completa dos seus dados clínicos armazenados localmente.
                </p>
              </div>
            </div>

            <Button onClick={handleBackup} disabled={backingUp} className="gap-2">
              {backingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" strokeWidth={1.5} />}
              {backingUp ? "Gerando backup..." : "Gerar backup"}
            </Button>

            {backupResult && (
              <motion.div
                className="mt-4 p-4 rounded-lg bg-status-validated/10 border border-status-validated/20"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-status-validated" strokeWidth={1.5} />
                  <span className="text-sm font-medium text-foreground">Backup concluído</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Caminho: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{backupResult.path}</code>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tamanho: {formatSize(backupResult.size)}
                </p>
              </motion.div>
            )}
          </div>
        </motion.section>

        {/* Restore */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-start gap-3 mb-4">
              <Upload className="w-5 h-5 text-primary mt-0.5 shrink-0" strokeWidth={1.5} />
              <div>
                <h2 className="font-serif text-xl font-medium text-foreground">Restaurar backup</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Restaura dados a partir de um backup existente. Os dados atuais serão substituídos.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Caminho do backup (ex: /backups/2026-02-10.zip)"
                value={restorePath}
                onChange={(e) => setRestorePath(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="secondary"
                onClick={handleRestore}
                disabled={restoring || !restorePath.trim()}
                className="gap-2"
              >
                {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" strokeWidth={1.5} />}
                {restoring ? "Restaurando..." : "Restaurar"}
              </Button>
            </div>

            {restoreSuccess && (
              <motion.div
                className="mt-4 p-3 rounded-lg bg-status-validated/10 border border-status-validated/20 flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <CheckCircle2 className="w-4 h-4 text-status-validated" strokeWidth={1.5} />
                <span className="text-sm text-foreground">Dados restaurados com sucesso.</span>
              </motion.div>
            )}
          </div>
        </motion.section>

        {/* Purge — Danger zone */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="rounded-xl border-2 border-destructive/30 bg-destructive/5 p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" strokeWidth={1.5} />
              <div>
                <h2 className="font-serif text-xl font-medium text-foreground">Zona de perigo</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Apaga <strong className="text-foreground">permanentemente</strong> todos os seus dados clínicos.
                  Esta ação é irreversível. Recomendamos gerar um backup antes.
                </p>
              </div>
            </div>

            <AlertDialog open={purgeDialogOpen} onOpenChange={setPurgeDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  Apagar todos os dados
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-serif text-xl flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" strokeWidth={1.5} />
                    Apagar todos os dados
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-4">
                      <p className="text-base leading-relaxed">
                        Esta ação vai apagar <strong className="text-foreground">permanentemente</strong> todos os seus dados:
                      </p>
                      <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                        <li>Sessões e notas clínicas</li>
                        <li>Transcrições e áudios</li>
                        <li>Prontuários e relatórios</li>
                        <li>Anamneses, escalas e formulários</li>
                        <li>Registros financeiros</li>
                      </ul>
                      <p className="text-sm text-foreground font-medium">
                        Digite <code className="bg-muted px-1.5 py-0.5 rounded text-destructive">PURGE</code> para confirmar:
                      </p>
                      <Input
                        placeholder="Digite PURGE"
                        value={purgeConfirmation}
                        onChange={(e) => setPurgeConfirmation(e.target.value.toUpperCase())}
                        className="font-mono text-center text-lg tracking-widest border-destructive/30 focus-visible:ring-destructive"
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setPurgeConfirmation("")}>
                    Cancelar
                  </AlertDialogCancel>
                  <Button
                    variant="destructive"
                    onClick={handlePurge}
                    disabled={purgeConfirmation !== "PURGE" || purging}
                    className="gap-2"
                  >
                    {purging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" strokeWidth={1.5} />}
                    {purging ? "Apagando..." : "Apagar permanentemente"}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default BackupPage;
