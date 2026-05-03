import { Link } from "react-router-dom";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { articles } from "@/data/articles";
import { useSeo } from "@/lib/seo";
import { breadcrumbSchema, organizationSchema, websiteSchema } from "@/lib/schemas";

const BlogPage = () => {
  useSeo({
    title: "Blog ETHOS - Psicologia, prontuario e gestao clinica",
    description: "Artigos sobre prontuario psicologico, software para psicologos, agenda, IA clinica, sigilo e gestao de consultorio.",
    path: "/blog",
    jsonLd: [
      organizationSchema,
      websiteSchema,
      breadcrumbSchema([
        { name: "Inicio", path: "/" },
        { name: "Blog", path: "/blog" },
      ]),
    ],
  });

  return (
    <div className="min-h-screen" style={{ background: "#060F1E" }}>
      <Header />
      <main className="mx-auto max-w-7xl px-6 pb-24 pt-28">
        <div className="max-w-3xl">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#4ECDC4]">Conteudo</span>
          <h1 className="mt-5 text-4xl font-bold leading-tight text-[#EDF2F7] md:text-6xl">
            Guias para uma clinica mais organizada, segura e leve.
          </h1>
          <p className="mt-5 text-lg leading-8 text-[#6B8FA8]">
            Conteudos praticos para psicologas que querem cuidar da gestao sem perder presenca clinica.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <Link
              key={article.slug}
              to={`/blog/${article.slug}`}
              className="rounded-2xl border border-[#1A2D42] bg-[#0D1B2E]/65 p-6 transition-all hover:-translate-y-1 hover:border-[#2F6F73]"
            >
              <span className="text-xs font-semibold uppercase tracking-widest text-[#4ECDC4]">{article.category}</span>
              <h2 className="mt-4 text-2xl font-bold leading-tight text-[#EDF2F7]">{article.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#6B8FA8]">{article.description}</p>
              <p className="mt-5 text-xs text-[#6B8FA8]">{article.readingTime} · {new Date(article.publishedAt).toLocaleDateString("pt-BR")}</p>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BlogPage;
