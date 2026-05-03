import { Link, Navigate, useParams } from "react-router-dom";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { APP_URL } from "@/config/site";
import { BIOHUB_HOME_URL } from "@/config/biohub";
import { articles } from "@/data/articles";
import { useSeo } from "@/lib/seo";
import { articleSchema, breadcrumbSchema, organizationSchema } from "@/lib/schemas";
import { trackEvent } from "@/lib/tracking";

const ArticlePage = () => {
  const { slug } = useParams();
  const article = articles.find((item) => item.slug === slug);
  const schema = slug ? articleSchema(slug) : null;
  useSeo({
    title: article ? `${article.title} | ETHOS` : "Blog ETHOS",
    description: article?.description ?? "Artigos sobre gestão, agenda, prontuário e tecnologia para psicólogas.",
    path: article ? `/blog/${article.slug}` : "/blog",
    type: "article",
    jsonLd: [
      organizationSchema,
      breadcrumbSchema([
        { name: "Inicio", path: "/" },
        { name: "Blog", path: "/blog" },
        ...(article ? [{ name: article.title, path: `/blog/${article.slug}` }] : []),
      ]),
      ...(schema ? [schema] : []),
    ],
  });

  if (!article || !slug) return <Navigate to="/blog" replace />;

  return (
    <div className="min-h-screen" style={{ background: "#060F1E" }}>
      <Header />
      <main className="mx-auto max-w-4xl px-6 pb-24 pt-28">
        <Link to="/blog" className="text-sm text-[#4ECDC4] hover:underline">← Voltar ao blog</Link>
        <article className="mt-8">
          <div className="mb-8">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#4ECDC4]">{article.category}</span>
            <h1 className="mt-5 text-4xl font-bold leading-tight text-[#EDF2F7] md:text-6xl">{article.title}</h1>
            <p className="mt-5 text-lg leading-8 text-[#6B8FA8]">{article.description}</p>
            <p className="mt-5 text-sm text-[#6B8FA8]">
              ETHOS · {new Date(article.publishedAt).toLocaleDateString("pt-BR")} · {article.readingTime}
            </p>
          </div>

          <div className="space-y-10">
            {article.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-3xl font-bold text-[#EDF2F7]">{section.heading}</h2>
                <div className="mt-4 space-y-4">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-base leading-8 text-[#B8C7D9]">{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-[#1A2D42] bg-[#0D1B2E]/70 p-6">
            <h2 className="text-2xl font-bold text-[#EDF2F7]">Proximo passo</h2>
            <p className="mt-3 text-sm leading-6 text-[#6B8FA8]">
              Conheca o ETHOS para organizar prontuarios, agenda, documentos e financeiro em uma rotina pensada para psicologas.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={APP_URL}
                onClick={() => trackEvent("cta_app_click", { location: "article", slug: article.slug })}
                className="rounded-xl bg-[#2F6F73] px-5 py-3 text-sm font-semibold text-white"
              >
                Testar ETHOS
              </a>
              <a
                href={BIOHUB_HOME_URL}
                onClick={() => trackEvent("biohub_click", { location: "article", slug: article.slug })}
                className="rounded-xl border border-[#1A2D42] px-5 py-3 text-sm font-semibold text-[#EDF2F7]"
              >
                Conhecer BioHub
              </a>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
};

export default ArticlePage;
