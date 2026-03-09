import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { useSearchParams, useNavigate } from "react-router-dom";

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast({ title: "Link inválido", description: "Token de recuperação não encontrado.", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Senha muito curta", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "Senhas não coincidem", description: "Confirme a mesma senha nos dois campos.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const result = await authService.resetPassword(token, password);

    if (result.success) {
      setIsDone(true);
    } else {
      toast({
        title: "Erro ao redefinir senha",
        description: result.error?.message ?? "Token expirado ou inválido. Solicite novamente.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="text-center mb-12">
          <h1 className="font-serif text-4xl font-medium text-foreground tracking-tight">
            ETHOS
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Redefinir senha
          </p>
        </div>

        {isDone ? (
          <motion.div
            className="text-center space-y-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto" strokeWidth={1.5} />
            <p className="text-foreground font-medium">Senha redefinida com sucesso!</p>
            <Button className="w-full h-12" onClick={() => navigate("/")}>
              Voltar ao login
            </Button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="new-password" className="text-sm font-medium text-foreground">
                Nova senha
              </label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
                Confirmar senha
              </label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-12"
              />
            </div>

            <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Redefinindo...
                </>
              ) : (
                "Redefinir senha"
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              <button type="button" className="text-primary hover:underline" onClick={() => navigate("/")}>
                Voltar ao login
              </button>
            </p>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
