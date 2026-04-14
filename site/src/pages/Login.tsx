import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:8787";
const APP_URL = import.meta.env.VITE_APP_URL || "http://localhost:5173";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        setError("Email ou senha inválidos.");
        setIsLoading(false);
        return;
      }

      const token = json.data?.token;
      if (token) {
        window.location.href = `${APP_URL}?token=${encodeURIComponent(token)}`;
      } else {
        setError("Erro inesperado. Tente novamente.");
      }
    } catch {
      setError("Não foi possível conectar ao servidor.");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-center mb-10">
          <a href="/" className="inline-block mb-4">
            <span className="font-display font-bold text-4xl tracking-tight">
              <span style={{ color: "#2563EB" }}>E</span>
              <span className="text-foreground">THOS</span>
            </span>
          </a>
          <p className="text-muted-foreground text-sm">Plataforma clínica para atendimento real</p>
        </div>

        <motion.form
          onSubmit={handleSubmit}
          className="space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
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
            <label htmlFor="password" className="text-sm font-medium text-foreground">Senha</label>
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
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />Entrando...</>
            ) : (
              "Entrar"
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Não tem conta?{" "}
            <a href="/#preco" className="text-primary hover:underline">
              Comece seu teste grátis
            </a>
          </p>
        </motion.form>
      </motion.div>
    </div>
  );
};

export default Login;
