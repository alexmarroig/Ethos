import { Link } from "react-router-dom";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { APP_URL } from "@/config/site";
import { useSeo } from "@/lib/seo";
import { trackEvent } from "@/lib/tracking";

const ThankYouPage = () => {
  useSeo({
    title: "Obrigado pelo contato | ETHOS",
    description: "Recebemos seu interesse no ETHOS.",
    path: "/obrigado",
    noindex: true,
  });

  return (
    <div className="min-h-screen" style={{ background: "#060F1E" }}>
      <Header />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-32 text-center">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#4ECDC4]">Contato recebido</span>
        <h1 className="mt-5 text-4xl font-bold leading-tight text-[#EDF2F7] md:text-6xl">
          Obrigado. Vamos continuar a conversa.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-[#6B8FA8]">
          Enquanto isso, voce pode conhecer o app ETHOS ou ler guias praticos sobre gestao clinica.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <a
            href={APP_URL}
            onClick={() => trackEvent("cta_app_click", { location: "thank_you" })}
            className="rounded-xl bg-[#2F6F73] px-6 py-3.5 text-sm font-semibold text-white"
          >
            Abrir ETHOS Web
          </a>
          <Link to="/blog" className="rounded-xl border border-[#1A2D42] px-6 py-3.5 text-sm font-semibold text-[#EDF2F7]">
            Ler artigos
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ThankYouPage;
