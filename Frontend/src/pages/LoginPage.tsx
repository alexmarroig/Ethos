import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { IS_DEV } from "@/config/runtime";

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const demoUsers = [
  { label: "Admin", email: "admin@admin" },
  { label: "Psicólogo", email: "camila@admin" },
  { label: "Paciente", email: "paciente@admin" },
];

const LoginPage = ({ onLoginSuccess }: LoginPageProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const success = await login(email, password);

    if (success) {
      onLoginSuccess();
    } else {
      toast({
        title: "Credenciais inválidas",
        description: "Verifique seu email e senha.",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRecovering(true);

    const result = await authService.requestPasswordReset(recoveryEmail);

    if (result.success) {
      setRecoverySent(true);
    } else {
      toast({
        title: "Erro",
        description: result.error?.message ?? "Não foi possível enviar o email de recuperação.",
        variant: "destructive",
      });
    }

    setIsRecovering(false);
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("bianco256");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {/* Logo */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h1 className="font-serif text-4xl font-medium text-foreground tracking-tight">
            ETHOS
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Plataforma clínica
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {showRecovery ? (
            <motion.div
              key="recovery"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {recoverySent ? (
                <div className="text-center space-y-4">
                  <CheckCircle2 className="w-12 h-12 text-primary mx-auto" strokeWidth={1.5} />
                  <p className="text-foreground font-medium">Email enviado!</p>
                  <p className="text-sm text-muted-foreground">
                    Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                  </p>
                  <Button
                    variant="ghost"
                    className="w-full h-12"
                    onClick={() => { setShowRecovery(false); setRecoverySent(false); setRecoveryEmail(""); }}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar ao login
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleRecovery} className="space-y-6">
                  <p className="text-sm text-muted-foreground text-center">
                    Informe seu email e enviaremos um link para redefinir sua senha.
                  </p>
                  <div className="space-y-2">
                    <label htmlFor="recovery-email" className="text-sm font-medium text-foreground">
                      Email
                    </label>
                    <Input
                      id="recovery-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      required
                      disabled={isRecovering}
                      className="h-12"
                      autoFocus
                    />
                  </div>

                  <Button type="submit" className="w-full h-12 text-base" disabled={isRecovering}>
                    {isRecovering ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Enviando...
                      </>
                    ) : (
                      "Enviar link de recuperação"
                    )}
                  </Button>

                  <p className="text-center">
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                      onClick={() => { setShowRecovery(false); setRecoveryEmail(""); }}
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Voltar ao login
                    </button>
                  </p>
                </form>
              )}
            </motion.div>
          ) : (
            <motion.form
              key="login"
              onSubmit={handleSubmit}
              className="space-y-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Senha
                </label>
                <div className="relative">
                  <Input
                    id="password"
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
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" strokeWidth={1.5} />
                    ) : (
                      <Eye className="w-4 h-4" strokeWidth={1.5} />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Esqueceu sua senha?{" "}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setShowRecovery(true)}
                >
                  Recuperar acesso
                </button>
              </p>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Demo credentials */}
        {IS_DEV && (
          <motion.div
            className="mt-10 p-4 bg-muted/50 rounded-xl space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <p className="text-xs text-muted-foreground font-medium text-center uppercase tracking-wider">
              Modo demonstração
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {demoUsers.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => fillDemo(u.email)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  {u.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground/60 text-center">
              Senha para todos: bianco256
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default LoginPage;
