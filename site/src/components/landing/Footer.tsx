import EthosLogo from "./EthosLogo";

const productLinks = [
  { label: "Funcionalidades", href: "/#funcionalidades" },
  { label: "BioHub", href: "/#biohub" },
  { label: "Ferramentas", href: "/ferramentas" },
  { label: "Preços", href: "/#preco" },
  { label: "Privacidade", href: "/#privacidade" },
  { label: "Blog", href: "/blog" },
];

const supportLinks = [
  { label: "Contato", href: "/contato" },
  { label: "FAQ", href: "/#faq" },
  { label: "Politica de privacidade", href: "/privacidade" },
  { label: "Termos", href: "/termos" },
  { label: "Cookies", href: "/cookies" },
];

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer
      className="py-16 border-t"
      style={{ background: "#060F1E", borderColor: "rgba(26,45,66,0.6)" }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <EthosLogo size="lg" />
            <p
              className="mt-4 text-sm text-[#6B8FA8] max-w-sm leading-relaxed"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              O Sistema Operacional da clínica moderna. Feito para psicólogos que querem praticar com mais presença e menos burocracia.
            </p>
            <p
              className="mt-4 text-xs text-[#6B8FA8]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              100% local · offline-first · CRP-compatible
            </p>
          </div>

          <div>
            <h4
              className="text-xs font-semibold uppercase tracking-widest text-[#EDF2F7] mb-4"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Produto
            </h4>
            <ul className="space-y-3">
              {productLinks.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="text-sm text-[#6B8FA8] hover:text-[#EDF2F7] transition-colors"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4
              className="text-xs font-semibold uppercase tracking-widest text-[#EDF2F7] mb-4"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Suporte
            </h4>
            <ul className="space-y-3">
              {supportLinks.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="text-sm text-[#6B8FA8] hover:text-[#EDF2F7] transition-colors"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 border-t"
          style={{ borderColor: "rgba(26,45,66,0.6)" }}
        >
          <p
            className="text-xs text-[#6B8FA8]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            © {year} <span style={{ color: "#2F6F73" }}>E</span>THOS. Todos os direitos reservados.
          </p>
          <div className="flex gap-6">
            {[
              { label: "Privacidade", href: "/privacidade" },
              { label: "Termos", href: "/termos" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-xs text-[#6B8FA8] hover:text-[#EDF2F7] transition-colors"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
