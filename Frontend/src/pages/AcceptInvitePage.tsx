import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";

const AcceptInvitePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const tokenFromUrl = searchParams.get("token") || "";

  const [token, setToken] = useState(tokenFromUrl);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const canSubmit =
    token.trim().length > 0 &&
    name.trim().length >= 2 &&
    password.length >= 6 &&
    password === confirmPassword &&
    !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsLoading(true);
    const result = await authService.acceptInvite(token.trim(), name.trim(), password);
    setIsLoading(false);

    if (result.success) {
      setSuccess(true);
      toast({
        title: "Conta criada com sucesso!",
        description: "Você será redirecionado para o login.",
      });
      setTimeout(() => navigate("/"), 2500);
    } else {
      toast({
        title: "Erro ao aceitar convite",
        description: result.error?.message || "Token inválido ou expirado.",
        variant: "destructive",
      });
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
          <h1 className="font-serif text-2xl font-medium text-foreground">
            Conta criada com sucesso!
          </h1>
          <p className="text-muted-foreground">Redirecionando para o login…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-serif text-2xl font-medium text-foreground">
            Aceitar Convite
          </h1>
          <p className="text-sm text-muted-foreground">
            Preencha seus dados para ativar sua conta no ETHOS.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="token">Token do convite</Label>
            <Input
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Cole o token recebido"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              autoComplete="name"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a senha"
              autoComplete="new-password"
            />
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <p className="text-sm text-destructive">As senhas não coincidem.</p>
            )}
          </div>

          <Button type="submit" className="w-full btn-motion" disabled={!canSubmit}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ativando conta…
              </>
            ) : (
              "Criar conta"
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Já tem conta?{" "}
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            Fazer login
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default AcceptInvitePage;
