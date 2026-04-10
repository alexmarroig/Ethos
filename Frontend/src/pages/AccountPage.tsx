import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User, CreditCard, Shield, Loader2, ExternalLink, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const readAvatarDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Nao foi possivel ler a imagem."));
    reader.readAsDataURL(file);
  });

const AccountPage = () => {
  const { user, isCloudAuthenticated, updateProfile } = useAuth();
  const { subscription, fetchSubscription } = useEntitlements();
  const { toast } = useToast();
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profile, setProfile] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    avatar_url: user?.avatar_url ?? "",
    crp: user?.crp ?? "",
    specialty: user?.specialty ?? "",
    clinical_approach: user?.clinical_approach ?? "",
  });

  useEffect(() => {
    if (isCloudAuthenticated) {
      fetchSubscription();
    }
  }, [isCloudAuthenticated, fetchSubscription]);

  useEffect(() => {
    setProfile({
      name: user?.name ?? "",
      email: user?.email ?? "",
      avatar_url: user?.avatar_url ?? "",
      crp: user?.crp ?? "",
      specialty: user?.specialty ?? "",
      clinical_approach: user?.clinical_approach ?? "",
    });
  }, [user]);

  const roleName =
    user?.role === "admin" ? "Administrador" : user?.role === "patient" ? "Paciente" : "Profissional";

  const subStatus = subscription?.status || "none";
  const badge = statusLabels[subStatus] || statusLabels.none;

  const handleCheckout = async () => {
    setLoadingCheckout(true);
    const res = await billingService.createCheckoutSession();
    setLoadingCheckout(false);
    if (res.success && res.data.url) {
      window.open(res.data.url, "_blank");
    } else {
      toast({ title: "Erro", description: "Nao foi possivel iniciar o checkout.", variant: "destructive" });
    }
  };

  const handleManage = () => {
    if (subscription?.portal_url) {
      window.open(subscription.portal_url, "_blank");
    } else {
      toast({ title: "Indisponivel", description: "Portal de assinatura nao disponivel." });
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const avatarUrl = await readAvatarDataUrl(file);
      setProfile((current) => ({ ...current, avatar_url: avatarUrl }));
    } catch (error: any) {
      toast({
        title: "Foto indisponivel",
        description: error?.message ?? "Nao foi possivel carregar a foto.",
        variant: "destructive",
      });
    } finally {
      event.target.value = "";
    }
  };

  const handleSaveProfile = async () => {
    if (!profile.name.trim()) {
      toast({ title: "Nome obrigatorio", description: "Informe seu nome profissional.", variant: "destructive" });
      return;
    }
    if (!EMAIL_REGEX.test(profile.email.trim())) {
      toast({ title: "Email invalido", description: "Informe um email valido.", variant: "destructive" });
      return;
    }

    setIsSavingProfile(true);
    const success = await updateProfile({
      name: profile.name.trim(),
      email: profile.email.trim().toLowerCase(),
      avatar_url: profile.avatar_url || undefined,
      crp: profile.crp.trim() || undefined,
      specialty: profile.specialty.trim() || undefined,
      clinical_approach: profile.clinical_approach.trim() || undefined,
    });
    setIsSavingProfile(false);

    if (success) {
      toast({ title: "Perfil salvo", description: "Seus dados foram atualizados." });
    } else {
      toast({
        title: "Nao foi possivel salvar",
        description: "Revise o email informado ou tente novamente em instantes.",
        variant: "destructive",
      });
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
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">Minha conta</h1>
        </motion.header>

        <motion.section
          className="mb-6 p-6 rounded-xl border border-border bg-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <div className="flex items-center gap-4">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Foto de perfil" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-7 h-7 text-primary" strokeWidth={1.5} />
                </div>
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:border-primary/50">
                <Camera className="h-4 w-4" />
                Foto de perfil
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>

            <div className="grid flex-1 gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">Nome</label>
                <Input value={profile.name} onChange={(e) => setProfile((c) => ({ ...c, name: e.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input value={profile.email} onChange={(e) => setProfile((c) => ({ ...c, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">CRP</label>
                <Input value={profile.crp} onChange={(e) => setProfile((c) => ({ ...c, crp: e.target.value }))} placeholder="06/211111" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Perfil</label>
                <Input value={roleName} disabled />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Especialidade</label>
                <Input value={profile.specialty} onChange={(e) => setProfile((c) => ({ ...c, specialty: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Abordagem clinica</label>
                <Input value={profile.clinical_approach} onChange={(e) => setProfile((c) => ({ ...c, clinical_approach: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
              <span className="text-sm text-muted-foreground">Perfil: {roleName}</span>
            </div>
            <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
              {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar perfil"}
            </Button>
          </div>
        </motion.section>

        <motion.section
          className="p-6 rounded-xl border border-border bg-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="font-serif text-lg font-medium text-foreground">Assinatura</h2>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${badge.className}`}>{badge.label}</span>
            {subscription?.plan ? (
              <span className="text-xs text-muted-foreground">Plano: {subscription.plan}</span>
            ) : null}
          </div>

          {!isCloudAuthenticated ? (
            <p className="text-sm text-muted-foreground mb-4">
              Conecte-se ao plano cloud para gerenciar sua assinatura.
            </p>
          ) : null}

          <div className="flex gap-3">
            <Button variant="default" className="gap-2" onClick={handleCheckout} disabled={loadingCheckout}>
              {loadingCheckout ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              Assinar / Upgrade
            </Button>
            <Button variant="secondary" className="gap-2" onClick={handleManage} disabled={!subscription?.portal_url}>
              Gerenciar assinatura
            </Button>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default AccountPage;
