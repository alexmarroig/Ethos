import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import Footer from "@/components/landing/Footer";
import Header from "@/components/landing/Header";
import LeadCapture from "@/components/landing/LeadCapture";
import { APP_URL } from "@/config/site";
import { findCommercialPage } from "@/data/commercialPages";
import { breadcrumbSchema, faqSchema, serviceSchema, softwareSchema } from "@/lib/schemas";
import { useSeo } from "@/lib/seo";
import { trackEvent } from "@/lib/tracking";

const CommercialPage = () => {
  const { slug } = useParams();
  const page = findCommercialPage(slug);

  if (!page) return <Navigate to="/" replace />;

  useSeo({
    title: page.seoTitle,
    description: page.description,
    path: `/${page.slug}`,
    jsonLd: [
      softwareSchema,
      serviceSchema(page),
      faqSchema(page.faq),
      breadcrumbSchema([
        { name: "Inicio", path: "/" },
        { name: page.title, path: `/${page.slug}` },
      ]),
    ],
  });

  return (
    <div className="min-h-screen bg-[#060F1E] text-[#EDF2F7]">
      <Header />
      <main>
        <section className="border-b border-[#1A2D42] pt-32 md:pt-36">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 pb-20 md:pb-24 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
            <div>
              <span className="inline-flex rounded-full border border-[#2F6F73]/50 bg-[#0D1B2E] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[#4ECDC4]">
                {page.eyebrow}
              </span>
              <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-tight md:text-6xl">
                {page.heroTitle}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#8EA9BD]">{page.heroText}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href={APP_URL}
                  onClick={() => trackEvent("cta_app_click", { location: "commercial_hero", page: page.slug })}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2F6F73] px-6 py-3 text-sm font-semibold text-white transition-all hover:scale-[1.01] hover:opacity-90"
                >
                  {page.primaryCta}
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#recursos"
                  className="inline-flex items-center justify-center rounded-xl border border-[#1A2D42] px-6 py-3 text-sm font-semibold text-[#EDF2F7] transition-colors hover:border-[#4ECDC4]"
                >
                  {page.secondaryCta}
                </a>
              </div>
              <p className="mt-5 max-w-2xl text-sm leading-6 text-[#6B8FA8]">{page.intent}</p>
            </div>

            <div className="border border-[#1A2D42] bg-[#0D1B2E]/75 p-5 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.8)]">
              <div className="flex items-center gap-3 border-b border-[#1A2D42] pb-4">
                <ShieldCheck className="h-5 w-5 text-[#4ECDC4]" />
                <div>
                  <p className="text-sm font-semibold">Resumo para decisao</p>
                  <p className="text-xs text-[#6B8FA8]">O que esta pagina resolve</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {page.proofPoints.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl border border-[#1A2D42] bg-[#060F1E]/70 px-4 py-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#4ECDC4]" />
                    <span className="text-sm text-[#D8E4EC]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 md:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-[#4ECDC4]">Dores comuns</span>
              <h2 className="mt-4 text-3xl font-bold md:text-4xl">Quando a rotina cresce, ferramenta solta vira ruido.</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {page.problems.map((problem) => (
                <div key={problem} className="border border-[#1A2D42] bg-[#0D1B2E]/60 p-5">
                  <p className="text-sm leading-6 text-[#B7C9D8]">{problem}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="recursos" className="border-y border-[#1A2D42] bg-[#07111F] py-20 md:py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-3xl">
              <span className="text-xs font-semibold uppercase tracking-widest text-[#4ECDC4]">Recursos</span>
              <h2 className="mt-4 text-3xl font-bold md:text-4xl">O ETHOS junta o que a rotina clinica separou.</h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {page.features.map((feature) => (
                <article key={feature.title} className="border border-[#1A2D42] bg-[#0D1B2E]/70 p-6">
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#8EA9BD]">{feature.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 md:py-24">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-3xl font-bold md:text-4xl">Perguntas frequentes</h2>
            <div className="mt-8 divide-y divide-[#1A2D42] border-y border-[#1A2D42]">
              {page.faq.map((item) => (
                <div key={item.q} className="py-6">
                  <h3 className="text-base font-semibold">{item.q}</h3>
                  <p className="mt-2 text-sm leading-7 text-[#8EA9BD]">{item.a}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 text-sm text-[#8EA9BD]">
              Veja tambem os artigos do <Link className="text-[#4ECDC4] underline" to="/blog">blog ETHOS</Link> para aprofundar criterios de escolha, prontuario, agenda e IA clinica.
            </div>
          </div>
        </section>

        <LeadCapture />
      </main>
      <Footer />
    </div>
  );
};

export default CommercialPage;
