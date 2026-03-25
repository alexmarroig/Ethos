import { motion } from "framer-motion";
import { Users, Plus, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const AdminUsersPage = () => {
  const { toast } = useToast();

  const handleInvite = () => {
    toast({ title: "Em breve", description: "Convite via POST /auth/invite será implementado." });
  };

  return (
    <div className="min-h-screen">
      <div className="content-container py-8 md:py-12">
        <motion.header
          className="mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">
            Usuários
          </h1>
          <p className="mt-2 text-muted-foreground">
            Gerenciamento de usuários e convites.
          </p>
        </motion.header>

        <motion.div
          className="flex gap-3 mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Button variant="secondary" className="gap-2" onClick={handleInvite}>
            <Mail className="w-4 h-4" strokeWidth={1.5} />
            Gerar convite
          </Button>
        </motion.div>

        <motion.div
          className="text-center py-12"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            Lista de usuários será carregada via endpoint /v1/admin/users.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminUsersPage;
