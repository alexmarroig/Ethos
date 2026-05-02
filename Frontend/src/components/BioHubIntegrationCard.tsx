import { useEffect, useState } from "react";
import { ExternalLink, ArrowRight, Loader2, CreditCard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BIOHUB_LOGIN_URL, BIOHUB_REGISTER_URL } from "@/config/biohub";
import { biohubSubscriptionService, type BioHubAccessPayload } from "@/services/biohubSubscription";
import { useAuth } from "@/contexts/AuthContext";

export function BioHubIntegrationCard() {
  const { user } = useAuth();
  const [data, setData] = useState<BioHubAccessPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    biohubSubscriptionService.getBiohubAccess().then(res => {
      if (mounted) {
        if (res.success) {
          setData(res.data);
        } else {
          setData({ hasBiohub: false, email: user.email });
        }
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [user]);

  if (loading) {
    return (
      <div className="rounded-[1.25rem] border border-border bg-card p-5 flex items-center justify-center min-h-[140px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 4. Se hasBiohub false
  if (!data?.hasBiohub) {
    return (
      <div className="rounded-[1.25rem] border border-primary/15 bg-[linear-gradient(180deg,rgba(var(--primary-rgb),0.02),rgba(var(--primary-rgb),0.06))] p-5">
        <h3 className="font-medium text-foreground mb-1">Crie sua Página Profissional</h3>
        <p className="text-sm leading-6 text-muted-foreground mb-4">
          O BioHub é um mini-site otimizado para psicólogos. Expanda sua presença online e receba mais pacientes.
        </p>
        <Button asChild className="gap-2">
          <a href={BIOHUB_REGISTER_URL} target="_blank" rel="noreferrer">
            Criar meu BioHub <ArrowRight className="w-4 h-4" />
          </a>
        </Button>
      </div>
    );
  }

  // 5. Se status pending/past_due/canceled/expired
  const status = data.status || "none";
  const isProblematic = ["pending", "past_due", "canceled", "expired"].includes(status);

  if (isProblematic) {
    return (
      <div className="rounded-[1.25rem] border border-amber-500/30 bg-amber-500/10 p-5">
        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="w-5 h-5 text-amber-600" />
          <h3 className="font-medium text-amber-800 dark:text-amber-500">Atenção com a sua Assinatura</h3>
        </div>
        <p className="text-sm leading-6 text-amber-700/80 dark:text-amber-400/80 mb-4">
          Identificamos uma pendência ou expiração no seu plano do BioHub.
        </p>
        <Button asChild variant="outline" className="gap-2 border-amber-500/50 text-amber-700 hover:bg-amber-500/20">
          <a href={`${BIOHUB_LOGIN_URL}?redirect=/admin/billing`} target="_blank" rel="noreferrer">
            Ver assinatura
          </a>
        </Button>
      </div>
    );
  }

  // 3. Se hasBiohub true e status active/trialing
  return (
    <div className="rounded-[1.25rem] border border-emerald-500/30 bg-emerald-500/5 p-5 relative overflow-hidden">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
      <div className="flex justify-between items-start mb-2 relative">
        <div>
          <h3 className="font-medium text-foreground flex items-center gap-2">
            BioHub Ativo <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </h3>
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            Plano {data.plan === "premium" ? "Premium" : data.plan === "professional" ? "Professional" : "Free"}
          </p>
        </div>
      </div>
      <p className="text-sm leading-6 text-muted-foreground mb-4 relative">
        Seu mini-site e página profissional estão operando normalmente.
      </p>
      <Button asChild className="gap-2 relative">
        <a href={BIOHUB_LOGIN_URL} target="_blank" rel="noreferrer">
          Acessar BioHub <ExternalLink className="w-4 h-4" />
        </a>
      </Button>
    </div>
  );
}
