import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import EthosLogo from "./EthosLogo";

const NAV = [
  { label: "Solução", href: "#solucao" },
  { label: "Funcionalidades", href: "#funcionalidades" },
  { label: "BioHub", href: "#biohub" },
  { label: "Privacidade", href: "#privacidade" },
  { label: "Preço", href: "#preco" },
  { label: "FAQ", href: "#faq" },
];

// 👉 centraliza aqui (facilita muito no futuro)
const APP_URL = "https://app.ethos-clinic.com";

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled
          ? "rgba(6, 15, 30, 0.92)"
          : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled
          ? "1px solid rgba(47,111,115,0.12)"
          : "none",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        <a href="/" className="flex items-center">
          <EthosLogo />
        </a>

        {/* NAV DESKTOP */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="nav-link text-sm font-sans text-[#6B8FA8] hover:text-[#EDF2F7] transition-colors duration-200"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* CTA DESKTOP */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href={APP_URL}
            className="text-sm font-medium text-[#6B8FA8] hover:text-[#EDF2F7] transition-colors px-4 py-2"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Entrar
          </a>

          <a
            href={APP_URL}
            className="text-sm font-semibold px-5 py-2 rounded-lg transition-all duration-200 hover:opacity-90 hover:scale-[1.02]"
            style={{
              background: "#2F6F73",
              color: "#fff",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Testar grátis
          </a>
        </div>

        {/* MENU MOBILE BUTTON */}
        <button
          className="md:hidden text-[#EDF2F7] p-1"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* MENU MOBILE */}
      {menuOpen && (
        <div
          className="md:hidden px-6 pb-6 pt-2 space-y-1"
          style={{
            background: "rgba(6, 15, 30, 0.97)",
            borderBottom: "1px solid rgba(47,111,115,0.15)",
          }}
        >
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="block py-3 text-sm text-[#6B8FA8] hover:text-[#EDF2F7] transition-colors"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {item.label}
            </a>
          ))}

          <div className="pt-4 space-y-2">
            <a
              href={APP_URL}
              className="block text-center py-2.5 text-sm text-[#EDF2F7] border border-[#1A2D42] rounded-lg hover:border-[#2F6F73] transition-colors"
            >
              Entrar
            </a>

            <a
              href={APP_URL}
              className="block text-center py-2.5 text-sm font-semibold rounded-lg text-white"
              style={{ background: "#2F6F73" }}
            >
              Testar grátis
            </a>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
