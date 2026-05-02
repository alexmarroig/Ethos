import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Mail, Loader2, Settings2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { controlAdminService, AdminUser } from "@/services/controlAdminService";
import type { Entitlements } from "@/services/entitlementService";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const AdminUsersPage = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [loadingEntitlements, setLoadingEntitlements] = useState(false);
  const [savingEntitlements, setSavingEntitlements] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const res = await controlAdminService.getUsers();
    if (res.success) setUsers(res.data);
    setLoading(false);
  };

  const handleInvite = () => {
    toast({ title: "Em breve", description: "O fluxo de convite via POST /auth/invite será integrado à Control API." });
  };

  const handleOpenEntitlements = async (user: AdminUser) => {
    setSelectedUser(user);
    setLoadingEntitlements(true);
    const res = await controlAdminService.getUserEntitlements(user.id);
    if (res.success) {
      setEntitlements(res.data);
    } else {
      toast({ title: "Erro", description: "Falha ao carregar permissões", variant: "destructive" });
      setSelectedUser(null);
    }
    setLoadingEntitlements(false);
  };

  const handleSaveEntitlements = async () => {
    if (!selectedUser || !entitlements) return;
    setSavingEntitlements(true);
    const res = await controlAdminService.updateUserEntitlements(selectedUser.id, entitlements);
    setSavingEntitlements(false);
    if (res.success) {
      toast({ title: "Permissões salvas", description: `As configurações de ${selectedUser.name} foram atualizadas.` });
      setSelectedUser(null);
    } else {
      toast({ title: "Erro", description: "Falha ao salvar permissões", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header
          className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">
              Usuários e Acessos
            </h1>
            <p className="mt-2 text-muted-foreground">
              Gerencie os psicólogos, assinaturas e permissões (features).
            </p>
          </div>
          <Button className="gap-2" onClick={handleInvite}>
            <Mail className="w-4 h-4" />
            Convidar Usuário
          </Button>
        </motion.header>

        <motion.div
          className="rounded-2xl border border-border bg-card overflow-hidden"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-20">
              <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhum usuário encontrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status / Plano</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.status === "active" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                          user.status === "trialing" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {user.status}
                        </span>
                        {user.plan && (
                          <span className="text-xs text-muted-foreground">{user.plan}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(user.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => handleOpenEntitlements(user)}>
                        <Settings2 className="w-3.5 h-3.5" />
                        Acessos
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </motion.div>
      </div>

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Gerenciar Permissões
            </DialogTitle>
            <DialogDescription>
              Ajuste as "chaves" (features e limites) de {selectedUser?.name}.
            </DialogDescription>
          </DialogHeader>

          {loadingEntitlements ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : entitlements && (
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">Módulos (Features)</h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Módulo Financeiro</p>
                    <p className="text-xs text-muted-foreground">Controle de receitas, despesas e relatórios.</p>
                  </div>
                  <Switch 
                    checked={entitlements.finance_enabled} 
                    onCheckedChange={(checked) => setEntitlements({ ...entitlements, finance_enabled: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Formulários Avançados</p>
                    <p className="text-xs text-muted-foreground">Criação e envio de diários para pacientes.</p>
                  </div>
                  <Switch 
                    checked={entitlements.forms_enabled} 
                    onCheckedChange={(checked) => setEntitlements({ ...entitlements, forms_enabled: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Escalas Psicológicas</p>
                    <p className="text-xs text-muted-foreground">Acesso às escalas de TCC (BDI, BAI, etc).</p>
                  </div>
                  <Switch 
                    checked={entitlements.scales_enabled} 
                    onCheckedChange={(checked) => setEntitlements({ ...entitlements, scales_enabled: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Exportação de Dados</p>
                    <p className="text-xs text-muted-foreground">Baixar relatórios e prontuários em PDF/ZIP.</p>
                  </div>
                  <Switch 
                    checked={entitlements.exports_enabled} 
                    onCheckedChange={(checked) => setEntitlements({ ...entitlements, exports_enabled: checked })}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">Limites de Uso</h4>
                
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium">Pacientes Máximos</p>
                    <p className="text-xs text-muted-foreground">Deixe 999 para ilimitado.</p>
                  </div>
                  <Input 
                    type="number" 
                    className="w-24 text-center" 
                    value={entitlements.max_patients}
                    onChange={(e) => setEntitlements({ ...entitlements, max_patients: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium">Minutos de Transcrição</p>
                    <p className="text-xs text-muted-foreground">Cota mensal de áudio/texto IA.</p>
                  </div>
                  <Input 
                    type="number" 
                    className="w-24 text-center" 
                    value={entitlements.transcription_minutes_per_month}
                    onChange={(e) => setEntitlements({ ...entitlements, transcription_minutes_per_month: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-border">
            <Button variant="outline" onClick={() => setSelectedUser(null)}>Cancelar</Button>
            <Button onClick={handleSaveEntitlements} disabled={savingEntitlements || loadingEntitlements}>
              {savingEntitlements ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsersPage;
