import { Link } from "react-router-dom";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { freeTools } from "@/data/freeTools";
import { useSeo } from "@/lib/seo";
import { breadcrumbSchema, organizationSchema, websiteSchema } from "@/lib/schemas";

const ToolsPage = () => {
  useSeo({
    title: "Ferramentas gratuitas para psicologos | ETHOS",
    description:
      "Ferramentas gratuitas para psicologas organizarem contrato terapeutico, LGPD, preco de sessao, prontuario, agenda e bio profissional.",
    path: "/ferramentas",
    jsonLd: [
      organizationSchema,
      websiteSchema,
      breadcrumbSchema([
        { name: "Inicio", path: "/" },
        { name: "Ferramentas", path: "/ferramentas" },
      ]),
    ],
  });

  return (
    <div className="min-h-screen" style={{ background: "#060F1E" }}>
      <Header />
      <main className="mx-auto max-w-7xl px-6 pb-24 pt-28">
        <div className="max-w-3xl">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#4ECDC4]">Ferramentas gratuitas</span>
          <h1 className="mt-5 text-4xl font-bold leading-tight text-[#EDF2F7] md:text-6xl">
            Recursos praticos para organizar consultorio, agenda, documentos e presenca digital.
          </h1>
          <p className="mt-5 text-lg leading-8 text-[#6B8FA8]">
            Use calculadoras, checklists e geradores simples para tomar melhores decisoes sem colocar dados clinicos de pacientes no site publico.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {freeTools.map((tool) => (
            <Link
              key={tool.slug}
              to={`/ferramentas/${tool.slug}`}
              className="rounded-2xl border border-[#1A2D42] bg-[#0D1B2E]/65 p-6 transition-all hover:-translate-y-1 hover:border-[#2F6F73]"
            >
              <span className="text-xs font-semibold uppercase tracking-widest text-[#4ECDC4]">{tool.category}</span>
              <h2 className="mt-4 text-2xl font-bold leading-tight text-[#EDF2F7]">{tool.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#6B8FA8]">{tool.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {tool.highlights.map((highlight) => (
                  <span key={highlight} className="rounded-full border border-[#1A2D42] px-3 py-1 text-xs text-[#8EA9BD]">
                    {highlight}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ToolsPage;
