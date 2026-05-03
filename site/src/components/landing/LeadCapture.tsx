import { type FormEvent, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CONTACT_EMAIL } from "@/config/site";
import { trackEvent, trackGoogleAdsConversion } from "@/lib/tracking";

const LEAD_ENDPOINT = import.meta.env.VITE_LEAD_ENDPOINT;

const readAttribution = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
    utm_term: params.get("utm_term") || "",
    utm_content: params.get("utm_content") || "",
    user_agent: window.navigator.userAgent,
  };
};

const openMailFallback = (form: {
  name: string;
  email: string;
  whatsapp: string;
  profile: string;
  interest: string;
}) => {
  const body = encodeURIComponent(
    `Nome: ${form.name}\nEmail: ${form.email}\nWhatsApp: ${form.whatsapp}\nPerfil: ${form.profile}\nInteresse: ${form.interest}`,
  );
  window.open(`mailto:${CONTACT_EMAIL}?subject=Lead%20ETHOS&body=${body}`, "_blank", "noopener,noreferrer");
};

const LeadCapture = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    whatsapp: "",
    profile: "Psicologa",
    interest: "Conhecer o ETHOS",
  });

  const update = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    trackEvent("lead_submit", { interest: form.interest, profile: form.profile });
    trackGoogleAdsConversion();

    try {
      if (LEAD_ENDPOINT) {
        try {
          await fetch(LEAD_ENDPOINT, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ ...form, ...readAttribution(), source: "ethos_site" }),
          });
        } catch {
          openMailFallback(form);
        }
      } else {
        openMailFallback(form);
      }
      navigate("/obrigado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contato" className="py-24 md:py-28" style={{ background: "#060F1E" }}>
      <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-[#4ECDC4]">
            Captação
          </span>
          <h2 className="mt-5 text-4xl font-bold leading-tight text-[#EDF2F7] md:text-5xl">
            Quer ver o ETHOS funcionando na sua rotina?
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#6B8FA8] md:text-lg">
            Deixe um contato profissional. Nada de dados clinicos ou informacoes de pacientes: esta conversa e apenas sobre sua rotina de consultorio.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-[#1A2D42] bg-[#0D1B2E]/70 p-5 shadow-[0_24px_70px_-35px_rgba(0,0,0,0.8)] md:p-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-[#EDF2F7]">
              Nome
              <input
                required
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                className="h-11 w-full rounded-xl border border-[#1A2D42] bg-[#060F1E] px-4 text-sm outline-none transition-colors focus:border-[#4ECDC4]"
                placeholder="Seu nome"
              />
            </label>
            <label className="space-y-2 text-sm text-[#EDF2F7]">
              Email
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                className="h-11 w-full rounded-xl border border-[#1A2D42] bg-[#060F1E] px-4 text-sm outline-none transition-colors focus:border-[#4ECDC4]"
                placeholder="voce@email.com"
              />
            </label>
            <label className="space-y-2 text-sm text-[#EDF2F7]">
              WhatsApp
              <input
                value={form.whatsapp}
                onChange={(event) => update("whatsapp", event.target.value)}
                className="h-11 w-full rounded-xl border border-[#1A2D42] bg-[#060F1E] px-4 text-sm outline-none transition-colors focus:border-[#4ECDC4]"
                placeholder="(00) 00000-0000"
              />
            </label>
            <label className="space-y-2 text-sm text-[#EDF2F7]">
              Perfil profissional
              <select
                value={form.profile}
                onChange={(event) => update("profile", event.target.value)}
                className="h-11 w-full rounded-xl border border-[#1A2D42] bg-[#060F1E] px-4 text-sm outline-none transition-colors focus:border-[#4ECDC4]"
              >
                <option>Psicologa</option>
                <option>Psicologo</option>
                <option>Clinica</option>
                <option>Estudante</option>
                <option>Outro</option>
              </select>
            </label>
            <label className="space-y-2 text-sm text-[#EDF2F7] md:col-span-2">
              Interesse
              <select
                value={form.interest}
                onChange={(event) => update("interest", event.target.value)}
                className="h-11 w-full rounded-xl border border-[#1A2D42] bg-[#060F1E] px-4 text-sm outline-none transition-colors focus:border-[#4ECDC4]"
              >
                <option>Conhecer o ETHOS</option>
                <option>Organizar prontuarios</option>
                <option>Automatizar agenda e lembretes</option>
                <option>Melhorar financeiro do consultorio</option>
                <option>Conhecer BioHub</option>
              </select>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F6F73] px-6 py-3.5 text-sm font-semibold text-white transition-all hover:scale-[1.01] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Quero conversar
          </button>
        </form>
      </div>
    </section>
  );
};

export default LeadCapture;
