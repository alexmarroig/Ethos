import { GoogleOAuthProvider } from "@react-oauth/google";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import BrandWordmark from "@/components/BrandWordmark";
import { prefetchHomeQueries } from "@/hooks/useDomainQueries";

import { GoogleLoginButton } from "@/components/GoogleLoginButton";
interface LoginPageProps {
  onLoginSuccess: () => void;
}

type ViewMode = "login" | "recovery" | "signup";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const CRP_REGEX = /^\d{2}\/\d{4,6}$/;

const SPECIALTY_OPTIONS = [
  "Ansiedade",
  "Depressão",
  "Luto",
  "Relacionamentos",
  "Dependência química",
  "Transtornos alimentares",
  "Trauma",
  "Burnout",
  "Terapia de casal",
  "Terapia familiar",
  "Infância e adolescência",
  "Orientação parental",
  "Neurodivergências",
  "Outros",
];

const APPROACH_OPTIONS = [
  "Terapia Cognitivo-Comportamental (TCC)",
  "Psicanálise",
  "Humanista-Existencial",
  "Sistêmica/Familiar",
  "Análise do Comportamento",
  "ACT",
  "Gestalt-terapia",
  "Junguiana",
  "Outros",
];

const initialSignup = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  crp: "",
  specialty: "",
  specialtyOther: "",
  clinical_approach: "",
  approachOther: "",
  accepted_ethics: false,
};

const choiceButtonClass = (selected: boolean) =>
  `rounded-xl border px-3 py-2 text-sm transition-colors ${
    selected
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-background text-foreground hover:border-primary/50"
  }`;

const LoginPage = ({ onLoginSuccess }: LoginPageProps) => {
  const [mode, setMode] = useState<ViewMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const [signup, setSignup] = useState(initialSignup);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isGoogleSdkReady, setIsGoogleSdkReady] = useState(false);
  const [googleSdkTimedOut, setGoogleSdkTimedOut] = useState(false);
  const [googleSdkFailed, setGoogleSdkFailed] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const { toast } = useToast();

  const normalizedCrp = useMemo(() => signup.crp.replace(/\s+/g, ""), [signup.crp]);
  const selectedSpecialties = signup.specialty
    .split(" | ")
    .map((value) => value.trim())
    .filter(Boolean);
  const resolvedOtherSpecialty = signup.specialtyOther
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const selectedSpecialty = selectedSpecialties.includes("Outros")
    ? [...selectedSpecialties.filter((value) => value !== "Outros"), ...resolvedOtherSpecialty].join(" | ")
    : selectedSpecialties.join(" | ");
  const selectedApproaches = signup.clinical_approach
    .split(" | ")
    .map((value) => value.trim())
    .filter(Boolean);
  const resolvedOtherApproach = signup.approachOther
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const selectedApproach = selectedApproaches.includes("Outros")
    ? [...selectedApproaches.filter((value) => value !== "Outros"), ...resolvedOtherApproach].join(" | ")
    : selectedApproaches.join(" | ");

  const updateSignup = <K extends keyof typeof signup>(key: K, value: (typeof signup)[K]) => {
    setSignup((current) => ({ ...current, [key]: value }));
  };

  const toggleApproach = (option: string) => {
    const current = signup.clinical_approach
      .split(" | ")
      .map((value) => value.trim())
      .filter(Boolean);
    const next = current.includes(option)
      ? current.filter((value) => value !== option)
      : [...current, option];
    updateSignup("clinical_approach", next.join(" | "));
  };

  const toggleSpecialty = (option: string) => {
    const current = signup.specialty
      .split(" | ")
      .map((value) => value.trim())
      .filter(Boolean);
    const next = current.includes(option)
      ? current.filter((value) => value !== option)
      : [...current, option];
    updateSignup("specialty", next.join(" | "));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const success = await login(email.trim(), password);

    if (success) {
      void prefetchHomeQueries(queryClient);
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


  const handleGoogleLogin = async (credential: string) => {
    setIsLoading(true);
    try {
      const success = await loginWithGoogle(credential);
      if (success) {
        void prefetchHomeQueries(queryClient);
        toast({
          title: "Bem-vindo!",
          description: "Login realizado com sucesso.",
        });
        onLoginSuccess();
      } else {
        toast({
          title: "Erro no login",
          description: "Não foi possível autenticar com o Google. Verifique se o e-mail já está em uso.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_REGEX.test(recoveryEmail.trim())) {
      toast({
        title: "Email inválido",
        description: "Digite um email válido para recuperar o acesso.",
        variant: "destructive",
      });
      return;
    }

    setIsRecovering(true);
    const result = await authService.requestPasswordReset(recoveryEmail.trim());

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

  const validateSignup = () => {
    if (!signup.name.trim()) {
      return "Informe o nome completo.";
    }
    if (!EMAIL_REGEX.test(signup.email.trim())) {
      return "Informe um email válido.";
    }
    if (signup.password.length < 8) {
      return "A senha precisa ter pelo menos 8 caracteres.";
    }
    if (signup.password !== signup.confirmPassword) {
      return "As senhas não conferem.";
    }
    if (!CRP_REGEX.test(normalizedCrp)) {
      return "Informe o CRP no formato 00/0000 a 00/000000.";
    }
    if (!selectedSpecialty) {
      return "Selecione uma especialidade.";
    }
    if (!selectedApproach) {
      return "Selecione uma abordagem clínica.";
    }
    if (!signup.accepted_ethics) {
      return "Você precisa aceitar o código de ética para criar sua conta.";
    }
    return null;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateSignup();
    if (validationError) {
      toast({
        title: "Cadastro não concluído",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsSigningUp(true);
    const result = await authService.register({
      name: signup.name.trim(),
      email: signup.email.trim().toLowerCase(),
      password: signup.password,
      crp: normalizedCrp,
      specialty: selectedSpecialty,
      clinical_approach: selectedApproach,
      accepted_ethics: true,
    });

    if (!result.success) {
      toast({
        title: "Cadastro não concluído",
        description:
          result.error?.code === "EMAIL_IN_USE"
            ? "Este email já está cadastrado. Entre com ele ou use recuperar acesso."
            : result.error?.message ?? "Não foi possível criar sua conta agora.",
        variant: "destructive",
      });
      setIsSigningUp(false);
      return;
    }

    const success = await login(signup.email.trim(), signup.password);
    setIsSigningUp(false);

    if (success) {
      onLoginSuccess();
      return;
    }

    toast({
      title: "Conta criada",
      description: "Sua conta foi criada. Entre com seu email e senha para continuar.",
    });
    setEmail(signup.email.trim());
    setPassword(signup.password);
    setMode("login");
    setSignup(initialSignup);
  };

  const googleSdkMessage = (() => {
    if (googleSdkFailed) {
      return "Login com Google indisponível no momento. Use email e senha e tente novamente mais tarde.";
    }
    if (googleSdkTimedOut) {
      return "Carregando login com Google... você já pode entrar com email e senha.";
    }
    return "Preparando login com Google...";
  })();

  useEffect(() => {
    if (mode !== "login" || isGoogleSdkReady || googleSdkFailed) {
      setGoogleSdkTimedOut(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setGoogleSdkTimedOut(true);
    }, 2500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [googleSdkFailed, isGoogleSdkReady, mode]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        className="w-full max-w-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="mx-auto flex justify-center">
            <BrandWordmark textClassName="text-4xl font-medium tracking-tight" />
          </div>
          <p className="mt-2 text-muted-foreground text-sm">Plataforma clínica para atendimento real</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {mode === "recovery" ? (
            <motion.div
              key="recovery"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="mx-auto max-w-md"
            >
              {recoverySent ? (
                <div className="text-center space-y-4">
                  <CheckCircle2 className="w-12 h-12 text-primary mx-auto" strokeWidth={1.5} />
                  <p className="text-foreground font-medium">Email enviado</p>
                  <p className="text-sm text-muted-foreground">
                    Verifique sua caixa de entrada e siga as instrucoes para redefinir sua senha.
                  </p>
                  <Button
                    variant="ghost"
                    className="w-full h-12"
                    onClick={() => {
                      setMode("login");
                      setRecoverySent(false);
                      setRecoveryEmail("");
                    }}
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
                      onClick={() => {
                        setMode("login");
                        setRecoverySent(false);
                        setRecoveryEmail("");
                      }}
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Voltar ao login
                    </button>
                  </p>
                </form>
              )}
            </motion.div>
          ) : mode === "signup" ? (
            <motion.form
              key="signup"
              onSubmit={handleSignup}
              className="space-y-5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-foreground">Nome completo</label>
                  <Input
                    value={signup.name}
                    onChange={(e) => updateSignup("name", e.target.value)}
                    required
                    className="h-12"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <Input
                    type="email"
                    value={signup.email}
                    onChange={(e) => updateSignup("email", e.target.value)}
                    required
                    className="h-12"
                    placeholder="seu@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Senha</label>
                  <div className="relative">
                    <Input
                      type={showSignupPassword ? "text" : "password"}
                      value={signup.password}
                      onChange={(e) => updateSignup("password", e.target.value)}
                      required
                      className="h-12 pr-12"
                      placeholder="Minimo de 8 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword((current) => !current)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Confirmar senha</label>
                  <div className="relative">
                    <Input
                      type={showSignupConfirmPassword ? "text" : "password"}
                      value={signup.confirmPassword}
                      onChange={(e) => updateSignup("confirmPassword", e.target.value)}
                      required
                      className="h-12 pr-12"
                      placeholder="Repita a senha"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupConfirmPassword((current) => !current)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showSignupConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">CRP</label>
                  <Input
                    value={signup.crp}
                    onChange={(e) => updateSignup("crp", e.target.value.replace(/\s+/g, ""))}
                    required
                    className="h-12"
                    placeholder="06/211111"
                  />
                  <p className="text-xs text-muted-foreground">Formato aceito: 00/0000 a 00/000000</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Especialidade (pode selecionar mais de uma)</label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALTY_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={choiceButtonClass(selectedSpecialties.includes(option))}
                      onClick={() => toggleSpecialty(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {selectedSpecialties.includes("Outros") ? (
                  <Input
                    value={signup.specialtyOther}
                    onChange={(e) => updateSignup("specialtyOther", e.target.value)}
                    className="h-12"
                    placeholder="Digite outros focos separados por virgula"
                  />
                ) : null}
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Abordagem clínica</label>
                <div className="flex flex-wrap gap-2">
                  {APPROACH_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={choiceButtonClass(selectedApproaches.includes(option))}
                      onClick={() => toggleApproach(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {selectedApproaches.includes("Outros") ? (
                  <Input
                    value={signup.approachOther}
                    onChange={(e) => updateSignup("approachOther", e.target.value)}
                    className="h-12"
                    placeholder="Digite outras abordagens separadas por virgula"
                  />
                ) : null}
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={signup.accepted_ethics}
                  onChange={(e) => updateSignup("accepted_ethics", e.target.checked)}
                  className="mt-1"
                />
                <span>Aceito o codigo de etica profissional e autorizo a criacao da conta.</span>
              </label>

              <Button type="submit" className="w-full h-12 text-base" disabled={isSigningUp}>
                {isSigningUp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Criando conta...
                  </>
                ) : (
                  "Criar conta"
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Ja tem conta?{" "}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => {
                    setMode("login");
                    setSignup(initialSignup);
                  }}
                >
                  Entrar
                </button>
              </p>
            </motion.form>
          ) : (
            <motion.form
              key="login"
              onSubmit={handleSubmit}
              className="mx-auto max-w-md space-y-6"
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
                    placeholder="Digite sua senha"
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

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Ou continue com</span>
                </div>
              </div>

              <GoogleOAuthProvider
                clientId="83150950956-5avv08g9dsds5fpm7dfd9ui6rptn8uu2.apps.googleusercontent.com"
                onScriptLoadSuccess={() => {
                  setIsGoogleSdkReady(true);
                  setGoogleSdkFailed(false);
                  setGoogleSdkTimedOut(false);
                }}
                onScriptLoadError={() => {
                  setGoogleSdkFailed(true);
                  setIsGoogleSdkReady(false);
                }}
              >
                {isGoogleSdkReady ? (
                  <GoogleLoginButton onSuccess={handleGoogleLogin} isLoading={isLoading} />
                ) : (
                  <div className="rounded-xl border border-border px-4 py-3 text-center text-sm text-muted-foreground">
                    {googleSdkMessage}
                  </div>
                )}
              </GoogleOAuthProvider>

              <div className="text-center text-xs text-muted-foreground space-y-2">
                <p>
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => {
                      setMode("recovery");
                      setRecoveryEmail("");
                      setRecoverySent(false);
                    }}
                  >
                    Recuperar acesso
                  </button>
                </p>
                <p>
                  Não tem conta?{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => {
                      setMode("signup");
                      setSignup(initialSignup);
                    }}
                  >
                    Criar conta
                  </button>
                </p>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default LoginPage;
