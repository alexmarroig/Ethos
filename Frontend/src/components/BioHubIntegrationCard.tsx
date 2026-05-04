import { useEffect, useState } from "react";
import { ArrowRight, CreditCard, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
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
    biohubSubscriptionService.getBiohubAccess().then((res) => {
      if (mounted) {
        if (res.success) {
          setData(res.data);
        } else {
          setData({ hasBiohub: false, email: user.email });
        }
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-[140px] items-center justify-center rounded-[1.25rem] border border-border bg-card p-5">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.hasBiohub) {
    return (
      <div className="rounded-[1.25rem] border border-primary/15 bg-[linear-gradient(180deg,rgba(var(--primary-rgb),0.02),rgba(var(--primary-rgb),0.06))] p-5">
        <h3 className="mb-1 font-medium text-foreground">BioHub atrai contatos</h3>
        <p className="mb-4 text-sm leading-6 text-muted-foreground">
          Crie sua pagina profissional separada do app clinico. BioHub cuida da presenca; ETHOS organiza o cuidado.
        </p>
        <Button asChild className="gap-2">
          <a href={BIOHUB_REGISTER_URL} target="_blank" rel="noreferrer">
            Criar meu BioHub <ArrowRight className="h-4 w-4" />
          </a>
        </Button>
      </div>
    );
  }

  const status = data.status || "none";
  const isProblematic = ["pending", "past_due", "canceled", "expired"].includes(status);

  if (isProblematic) {
    return (
      <div className="rounded-[1.25rem] border border-amber-500/30 bg-amber-500/10 p-5">
        <div className="mb-1 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-amber-600" />
          <h3 className="font-medium text-amber-800 dark:text-amber-500">Atencao com a sua assinatura</h3>
        </div>
        <p className="mb-4 text-sm leading-6 text-amber-700/80 dark:text-amber-400/80">
          Identificamos uma pendencia ou expiracao no seu plano do BioHub.
        </p>
        <Button asChild variant="outline" className="gap-2 border-amber-500/50 text-amber-700 hover:bg-amber-500/20">
          <a href={`${BIOHUB_LOGIN_URL}?redirect=/admin/billing`} target="_blank" rel="noreferrer">
            Ver assinatura
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[1.25rem] border border-emerald-500/30 bg-emerald-500/5 p-5">
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" />
      <div className="relative mb-2 flex items-start justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-medium text-foreground">
            BioHub ativo <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </h3>
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            Plano {data.plan === "premium" ? "Premium" : data.plan === "professional" ? "Professional" : "Free"}
          </p>
        </div>
      </div>
      <p className="relative mb-4 text-sm leading-6 text-muted-foreground">
        Seu mini-site esta operando normalmente. BioHub atrai contatos; ETHOS organiza o cuidado.
      </p>
      <Button asChild className="relative gap-2">
        <a href={BIOHUB_LOGIN_URL} target="_blank" rel="noreferrer">
          Acessar BioHub <ExternalLink className="h-4 w-4" />
        </a>
      </Button>
    </div>
  );
}
