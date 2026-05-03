import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { APP_URL } from "@/config/site";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen" style={{ background: "#060F1E" }}>
      <Header />
      <main className="mx-auto flex min-h-[72vh] max-w-5xl flex-col justify-center px-6 py-28">
        <span className="text-sm font-semibold uppercase tracking-widest text-[#4ECDC4]">Pagina nao encontrada</span>
        <h1 className="mt-5 max-w-3xl text-5xl font-bold leading-tight text-[#EDF2F7] md:text-7xl">
          Este caminho nao existe no ETHOS.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[#6B8FA8]">
          Talvez o link tenha mudado. Voce pode voltar para a pagina inicial, acessar os artigos ou testar o ETHOS.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/" className="rounded-xl bg-[#2F6F73] px-5 py-3 text-sm font-semibold text-white">
            Voltar para a home
          </Link>
          <Link to="/blog" className="rounded-xl border border-[#1A2D42] px-5 py-3 text-sm font-semibold text-[#EDF2F7]">
            Ver artigos
          </Link>
          <a href={APP_URL} className="rounded-xl border border-[#1A2D42] px-5 py-3 text-sm font-semibold text-[#EDF2F7]">
            Testar gratis
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
