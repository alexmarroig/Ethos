import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, CreditCard, Shield, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useEntitlements } from "@/contexts/EntitlementsContext";
import { billingService } from "@/services/billingService";
import { useToast } from "@/hooks/use-toast";

const statusLabels: Record<string, { label: string; className: string }> = {
  trialing: { label: "Trial", className: "bg-blue-500/10 text-blue-600" },
  active: { label: "Ativa", className: "bg-status-validated/10 text-status-validated" },
  past_due: { label: "Pagamento pendente", className: "bg-destructive/10 text-destructive" },
  canceled: { label: "Cancelada", className: "bg-muted text-muted-foreground" },
  none: { label: "Sem assinatura", className: "bg-muted text-muted-foreground" },
};

const AccountPage = () => {
  const { user, isCloudAuthenticated } = useAuth();
  const { subscription, fetchSubscription } = useEntitlements();
  const { toast } = useToast();
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  useEffect(() => {
    if (isCloudAuthenticated) {
      fetchSubscription();
    }
  }, [isCloudAuthenticated, fetchSubscription]);

  const roleName = user?.role === "admin"
    ? "Administrador"
    : user?.role === "patient"
    ? "Paciente"
    : "Profissional";

  const subStatus = subscription?.status || "none";
  const badge = statusLabels[subStatus] || statusLabels.none;

  const handleCheckout = async () => {
    setLoadingCheckout(true);
    const res = await billingService.createCheckoutSession();
    setLoadingCheckout(false);
    if (res.success && res.data.url) {
      window.open(res.data.url, "_blank");
    } else {
      toast({ title: "Erro", description: "Não foi possível iniciar o checkout.", variant: "destructive" });
    }
  };

  const handleManage = () => {
    if (subscription?.portal_url) {
      window.open(subscription.portal_url, "_blank");
    } else {
      toast({ title: "Indisponível", description: "Portal de assinatura não disponível." });
    }
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
            Minha conta
          </h1>
        </motion.header>

        {/* Profile */}
        <motion.section
          className="mb-6 p-6 rounded-xl border border-border bg-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-serif text-lg font-medium text-foreground">
                {user?.name}
              </h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            <span className="text-sm text-muted-foreground">Perfil: {roleName}</span>
          </div>
        </motion.section>

        {/* Subscription */}
        <motion.section
          className="p-6 rounded-xl border border-border bg-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="font-serif text-lg font-medium text-foreground">
              Assinatura
            </h2>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${badge.className}`}>
              {badge.label}
            </span>
            {subscription?.plan && (
              <span className="text-xs text-muted-foreground">
                Plano: {subscription.plan}
              </span>
            )}
          </div>

          {!isCloudAuthenticated && (
            <p className="text-sm text-muted-foreground mb-4">
              Conecte-se ao plano cloud para gerenciar sua assinatura.
            </p>
          )}

          <div className="flex gap-3">
            <Button
              variant="default"
              className="gap-2"
              onClick={handleCheckout}
              disabled={loadingCheckout}
            >
              {loadingCheckout ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              Assinar / Upgrade
            </Button>
            <Button
              variant="secondary"
              className="gap-2"
              onClick={handleManage}
              disabled={!subscription?.portal_url}
            >
              Gerenciar assinatura
            </Button>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default AccountPage;
