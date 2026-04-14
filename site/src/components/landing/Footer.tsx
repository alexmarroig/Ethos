import EthosLogo from "./EthosLogo";

const Footer = () => {
  return (
    <footer className="py-10 border-t border-border">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <EthosLogo />
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="mailto:contato@ethos.app" className="hover:text-foreground transition-colors">Contato</a>
            <a href="#" className="hover:text-foreground transition-colors">Termos de uso</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} ETHOS. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
