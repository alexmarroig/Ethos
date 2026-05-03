import { ArrowRight, CheckCircle2, Clock, FileText, LineChart, ShieldCheck } from "lucide-react";
import Footer from "@/components/landing/Footer";
import Header from "@/components/landing/Header";
import LeadCapture from "@/components/landing/LeadCapture";
import { APP_URL } from "@/config/site";
import { breadcrumbSchema, faqSchema, softwareSchema } from "@/lib/schemas";
import { useSeo } from "@/lib/seo";
import { trackEvent } from "@/lib/tracking";

const faqs = [
  {
    q: "Esta pagina coleta dados de pacientes?",
    a: "Nao. O formulario e apenas comercial e nao deve receber dados clinicos ou informacoes sensiveis.",
  },
  {
    q: "O ETHOS e para psicologas autônomas?",
    a: "Sim. A landing foi pensada para profissionais que precisam organizar consultorio, agenda, prontuario e financeiro.",
  },
  {
    q: "Posso testar antes de decidir?",
    a: "Sim. O CTA leva para o fluxo de acesso do ETHOS, e o formulario permite falar com a equipe.",
  },
];

const AdsLandingPage = () => {
  useSeo({
    title: "ETHOS para psicologos | Organize consultorio, agenda e prontuario",
    description:
      "Landing do ETHOS para psicologas que querem organizar prontuario, agenda, financeiro e rotina clinica com mais clareza.",
    path: "/psicologos",
    jsonLd: [
      softwareSchema,
      faqSchema(faqs),
      breadcrumbSchema([
        { name: "Inicio", path: "/" },
        { name: "Psicologos", path: "/psicologos" },
      ]),
    ],
  });

  return (
    <div className="min-h-screen bg-[#060F1E] text-[#EDF2F7]">
      <Header />
      <main>
        <section className="pt-32 md:pt-36">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 pb-20 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <span className="inline-flex rounded-full border border-[#2F6F73]/50 bg-[#0D1B2E] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[#4ECDC4]">
                Para psicologas e psicologos
              </span>
              <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-tight md:text-6xl">
                Organize seu consultorio em uma rotina mais clara.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#8EA9BD]">
                O ETHOS reúne prontuario, agenda, financeiro, tarefas e documentos para voce atender com mais contexto e menos retrabalho.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#contato"
                  onClick={() => trackEvent("cta_app_click", { location: "ads_landing_hero", target: "lead_form" })}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2F6F73] px-6 py-3 text-sm font-semibold text-white transition-all hover:scale-[1.01] hover:opacity-90"
                >
                  Quero conhecer
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href={APP_URL}
                  onClick={() => trackEvent("cta_app_click", { location: "ads_landing_hero", target: "app" })}
                  className="inline-flex items-center justify-center rounded-xl border border-[#1A2D42] px-6 py-3 text-sm font-semibold text-[#EDF2F7] transition-colors hover:border-[#4ECDC4]"
                >
                  Testar gratis
                </a>
              </div>
            </div>

            <div className="grid gap-3 border border-[#1A2D42] bg-[#0D1B2E]/70 p-5">
              {[
                { icon: FileText, title: "Prontuario", text: "Historico clinico e evolucoes por paciente." },
                { icon: Clock, title: "Agenda", text: "Sessoes, tarefas, cores, tags e prioridades." },
                { icon: LineChart, title: "Financeiro", text: "Pagamentos, pendencias e previsao de receita." },
                { icon: ShieldCheck, title: "Sigilo", text: "Rotina desenhada para dados sensiveis." },
              ].map((item) => (
                <div key={item.title} className="flex gap-4 rounded-xl border border-[#1A2D42] bg-[#060F1E]/60 p-4">
                  <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-[#4ECDC4]" />
                  <div>
                    <h2 className="text-sm font-semibold">{item.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-[#8EA9BD]">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[#1A2D42] bg-[#07111F] py-16">
          <div className="mx-auto grid max-w-7xl gap-4 px-6 md:grid-cols-3">
            {[
              "Antes da sessao: revise queixa, evolucao e pontos importantes.",
              "Durante a semana: acompanhe agenda, tarefas e prioridades.",
              "No fechamento: organize financeiro sem perder tempo com planilhas soltas.",
            ].map((item) => (
              <div key={item} className="flex gap-3 border border-[#1A2D42] bg-[#0D1B2E]/70 p-5">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#4ECDC4]" />
                <p className="text-sm leading-7 text-[#B7C9D8]">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <LeadCapture />

        <section className="pb-20">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-3xl font-bold">Duvidas comuns</h2>
            <div className="mt-8 divide-y divide-[#1A2D42] border-y border-[#1A2D42]">
              {faqs.map((item) => (
                <div key={item.q} className="py-6">
                  <h3 className="text-base font-semibold">{item.q}</h3>
                  <p className="mt-2 text-sm leading-7 text-[#8EA9BD]">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default AdsLandingPage;
