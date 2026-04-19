import EthosLogo from "./EthosLogo";

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
              {["Funcionalidades", "Preços", "Privacidade", "Roadmap"].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-sm text-[#6B8FA8] hover:text-[#EDF2F7] transition-colors"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {item}
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
              {["Documentação", "FAQ", "Contato", "Status"].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-sm text-[#6B8FA8] hover:text-[#EDF2F7] transition-colors"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {item}
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
            {["Privacidade", "Termos"].map((link) => (
              <a
                key={link}
                href="#"
                className="text-xs text-[#6B8FA8] hover:text-[#EDF2F7] transition-colors"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
