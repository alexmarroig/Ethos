import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import EthosLogo from "./EthosLogo";

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <a href="/" className="flex items-center">
          <EthosLogo />
        </a>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#solucao" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Solução</a>
          <a href="#funcionalidades" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Funcionalidades</a>
          <a href="#preco" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Preço</a>
          <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <a href="/login"><Button variant="ghost" size="sm">Entrar</Button></a>
          <a href="/login"><Button size="sm">Testar grátis</Button></a>
        </div>

        <button className="md:hidden text-foreground" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-border bg-background p-4 space-y-3">
          <a href="#solucao" className="block text-sm text-muted-foreground py-2">Solução</a>
          <a href="#funcionalidades" className="block text-sm text-muted-foreground py-2">Funcionalidades</a>
          <a href="#preco" className="block text-sm text-muted-foreground py-2">Preço</a>
          <a href="#faq" className="block text-sm text-muted-foreground py-2">FAQ</a>
          <div className="pt-2 flex flex-col gap-2">
            <Button variant="ghost" size="sm" className="w-full">Entrar</Button>
            <Button size="sm" className="w-full">Testar grátis</Button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
