# Site ETHOS — Branding, Login e Plataformas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the Lovable-based landing site with full ETHOS branding (blue "E" #2563EB), create missing components (EthosLogo, Testimonials, Platforms with QR codes), add a login page that redirects to the Ethos web app, and replace placeholder assets.

**Architecture:** The site/ folder is a standalone Vite+React app. We add a `/login` route that authenticates against the ethos-clinic backend (port 8787) and redirects to the Frontend app. The Platforms section shows Web (primary CTA) + mobile QR code placeholders. EthosLogo component renders "ETHOS" with blue "E".

**Tech Stack:** React, Vite, Tailwind CSS, Framer Motion, React Router, shadcn/ui

---

### Task 1: Create EthosLogo component

**Files:**
- Create: `site/src/components/landing/EthosLogo.tsx`

- [ ] **Step 1: Create EthosLogo.tsx**

```tsx
const EthosLogo = () => (
  <span className="font-display font-bold text-xl tracking-tight">
    <span style={{ color: "#2563EB" }}>E</span>
    <span className="text-foreground">THOS</span>
  </span>
);

export default EthosLogo;
```

- [ ] **Step 2: Commit**

```bash
git add site/src/components/landing/EthosLogo.tsx
git commit -m "feat(site): create EthosLogo component with blue E (#2563EB)"
```

---

### Task 2: Create Testimonials component

**Files:**
- Create: `site/src/components/landing/Testimonials.tsx`

- [ ] **Step 1: Create Testimonials.tsx**

```tsx
import { motion } from "framer-motion";

const testimonials = [
  {
    name: "Dra. Marina Costa",
    role: "Psicóloga Clínica · CRP 06/12345",
    quote: "Antes eu passava 2 horas por dia escrevendo prontuários. Com o ETHOS, reduzi para 15 minutos.",
  },
  {
    name: "Dr. Rafael Mendes",
    role: "Psicólogo · TCC · CRP 05/67890",
    quote: "A transcrição automática mudou minha rotina. Consigo focar 100% no paciente durante a sessão.",
  },
  {
    name: "Dra. Camila Freitas",
    role: "Psicóloga · Psicanálise · CRP 06/11111",
    quote: "Finalmente um sistema que entende a rotina do psicólogo. Agenda, financeiro e prontuário em um só lugar.",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, type: "spring", stiffness: 100 } },
};

const Testimonials = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            O que dizem nossos psicólogos
          </h2>
          <p className="text-muted-foreground text-lg">Profissionais que transformaram sua rotina.</p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              className="p-6 rounded-xl border border-border bg-card"
              style={{ boxShadow: "var(--shadow-card)" }}
              variants={cardVariants}
              whileHover={{ y: -3, boxShadow: "var(--shadow-card-hover)" }}
            >
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 italic">"{t.quote}"</p>
              <div>
                <p className="font-display font-semibold text-foreground text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
```

- [ ] **Step 2: Commit**

```bash
git add site/src/components/landing/Testimonials.tsx
git commit -m "feat(site): add Testimonials section with 3 psychologist quotes"
```

---

### Task 3: Create Platforms component with QR codes

**Files:**
- Create: `site/src/components/landing/Platforms.tsx`

- [ ] **Step 1: Create Platforms.tsx**

```tsx
import { motion } from "framer-motion";
import { Globe, Smartphone, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

const Platforms = () => {
  return (
    <section className="py-16 md:py-24 bg-secondary">
      <div className="container">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Disponível onde você precisar
          </h2>
          <p className="text-muted-foreground text-lg">Acesse pelo navegador ou baixe o app no celular.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {/* Web - Primary */}
          <motion.div
            className="p-8 rounded-xl border-2 border-primary bg-card text-center"
            style={{ boxShadow: "var(--shadow-card-hover)" }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Globe size={28} className="text-primary" />
            </div>
            <h3 className="font-display font-bold text-foreground text-lg mb-2">Web</h3>
            <p className="text-sm text-muted-foreground mb-6">Acesse direto pelo navegador, sem instalar nada.</p>
            <a href="/login">
              <Button className="w-full">Acessar agora</Button>
            </a>
          </motion.div>

          {/* Android */}
          <motion.div
            className="p-8 rounded-xl border border-border bg-card text-center"
            style={{ boxShadow: "var(--shadow-card)" }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Smartphone size={28} className="text-accent" />
            </div>
            <h3 className="font-display font-bold text-foreground text-lg mb-2">Android</h3>
            <p className="text-sm text-muted-foreground mb-6">Escaneie o QR code para baixar na Play Store.</p>
            <div className="w-32 h-32 mx-auto rounded-lg border border-border bg-muted flex items-center justify-center">
              <QrCode size={48} className="text-muted-foreground/40" />
            </div>
            <p className="text-xs text-muted-foreground mt-3">Em breve</p>
          </motion.div>

          {/* iOS */}
          <motion.div
            className="p-8 rounded-xl border border-border bg-card text-center"
            style={{ boxShadow: "var(--shadow-card)" }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Smartphone size={28} className="text-accent" />
            </div>
            <h3 className="font-display font-bold text-foreground text-lg mb-2">iOS</h3>
            <p className="text-sm text-muted-foreground mb-6">Escaneie o QR code para baixar na App Store.</p>
            <div className="w-32 h-32 mx-auto rounded-lg border border-border bg-muted flex items-center justify-center">
              <QrCode size={48} className="text-muted-foreground/40" />
            </div>
            <p className="text-xs text-muted-foreground mt-3">Em breve</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Platforms;
```

- [ ] **Step 2: Commit**

```bash
git add site/src/components/landing/Platforms.tsx
git commit -m "feat(site): add Platforms section with Web CTA + mobile QR code placeholders"
```

---

### Task 4: Create Login page in site

**Files:**
- Create: `site/src/pages/Login.tsx`
- Modify: `site/src/App.tsx` — add `/login` route

- [ ] **Step 1: Create Login.tsx**

```tsx
import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EthosLogo from "@/components/landing/EthosLogo";

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
        // Redirect to the Ethos web app with token
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
            <a href="#preco" className="text-primary hover:underline">
              Comece seu teste grátis
            </a>
          </p>
        </motion.form>
      </motion.div>
    </div>
  );
};

export default Login;
```

- [ ] **Step 2: Add /login route to App.tsx**

In `site/src/App.tsx`, add import and route:

```tsx
import Login from "./pages/Login.tsx";
```

Add route before catch-all:
```tsx
<Route path="/login" element={<Login />} />
```

- [ ] **Step 3: Commit**

```bash
git add site/src/pages/Login.tsx site/src/App.tsx
git commit -m "feat(site): add login page that authenticates and redirects to Ethos web app"
```

---

### Task 5: Wire all buttons to login/signup

**Files:**
- Modify: `site/src/components/landing/Header.tsx` — "Entrar" → `/login`, "Testar grátis" → `/login`
- Modify: `site/src/components/landing/Hero.tsx` — CTA button → `/login`
- Modify: `site/src/components/landing/CtaFinal.tsx` — CTA button → `/login`
- Modify: `site/src/components/landing/Pricing.tsx` — CTA button → `/login`

- [ ] **Step 1: Update Header.tsx**

Replace `<Button variant="ghost" size="sm">Entrar</Button>` with `<a href="/login"><Button variant="ghost" size="sm">Entrar</Button></a>`.

Replace `<Button size="sm">Testar grátis</Button>` with `<a href="/login"><Button size="sm">Testar grátis</Button></a>`.

Do the same for the mobile menu buttons.

- [ ] **Step 2: Update Hero.tsx**

Wrap the "Testar grátis" button in an `<a href="/login">` link.

- [ ] **Step 3: Update CtaFinal.tsx**

Wrap the "Testar grátis por 7 dias" button in an `<a href="/login">` link.

- [ ] **Step 4: Update Pricing.tsx**

Wrap the "Começar teste grátis" button in an `<a href="/login">` link.

- [ ] **Step 5: Commit**

```bash
git add site/src/components/landing/Header.tsx site/src/components/landing/Hero.tsx site/src/components/landing/CtaFinal.tsx site/src/components/landing/Pricing.tsx
git commit -m "feat(site): wire all CTA buttons to /login route"
```

---

### Task 6: Update ETHOS branding across all components

**Files:**
- Modify: `site/src/components/landing/Solution.tsx` — ensure blue "E" uses #2563EB
- Modify: `site/src/index.html` — update title, meta tags
- Modify: `site/src/components/landing/Demo.tsx` — update placeholder to reference ETHOS demo
- Modify: `site/src/components/landing/Footer.tsx` — ensure correct branding

- [ ] **Step 1: Update Solution.tsx**

Change `<span className="text-primary">E</span>` to `<span style={{ color: "#2563EB" }}>E</span>` to ensure exact brand color.

- [ ] **Step 2: Update index.html meta tags**

Update `<title>` to "ETHOS — Plataforma Clínica para Psicólogos".
Update og:title, og:description, twitter:title meta tags.

- [ ] **Step 3: Commit**

```bash
git add site/src/components/landing/Solution.tsx site/index.html
git commit -m "feat(site): update ETHOS branding with blue E (#2563EB) and meta tags"
```

---

### Task 7: Verification

- [ ] **Step 1: Install deps and start dev server**

```bash
cd site && npm install && npm run dev
```

- [ ] **Step 2: Verify landing page loads**

Open http://localhost:8080 — all sections should render including Testimonials and Platforms.

- [ ] **Step 3: Verify login flow**

Click "Entrar" → goes to /login → enter credentials → redirects to web app.

- [ ] **Step 4: Verify branding**

Check that "E" in ETHOS is blue (#2563EB) in logo, solution section, and login page.
