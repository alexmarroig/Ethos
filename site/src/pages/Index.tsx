import { useEffect } from "react";
import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import PainPoints from "@/components/landing/PainPoints";
import Solution from "@/components/landing/Solution";
import HowItWorks from "@/components/landing/HowItWorks";
import Features from "@/components/landing/Features";
import BioHub from "@/components/landing/BioHub";
import Demo from "@/components/landing/Demo";
import Platforms from "@/components/landing/Platforms";
import Testimonials from "@/components/landing/Testimonials";
import LeadCapture from "@/components/landing/LeadCapture";
import Pricing from "@/components/landing/Pricing";
import Faq from "@/components/landing/Faq";
import CtaFinal from "@/components/landing/CtaFinal";
import Footer from "@/components/landing/Footer";
import { faqSchema, organizationSchema, softwareSchema, websiteSchema } from "@/lib/schemas";
import { useSeo } from "@/lib/seo";

const homeFaqs = [
  {
    q: "Meus dados realmente ficam so no meu computador?",
    a: "Sim. O ETHOS foi projetado para funcionar localmente, com dados clinicos armazenados no dispositivo e recursos de exportacao.",
  },
  {
    q: "A IA substitui a revisao profissional?",
    a: "Nao. A IA ajuda a gerar rascunhos e organizacao, mas a psicologa sempre revisa e assina o conteudo final.",
  },
  {
    q: "O ETHOS tambem organiza agenda e financeiro?",
    a: "Sim. A plataforma conecta pacientes, agenda, prontuarios, documentos e financeiro em uma rotina unica.",
  },
];

const Index = () => {
  useSeo({
    jsonLd: [organizationSchema, websiteSchema, softwareSchema, faqSchema(homeFaqs)],
  });

  useEffect(() => {
    document.body.classList.add("grain");
    return () => document.body.classList.remove("grain");
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#060F1E" }}>
      <Header />
      <main>
        <Hero />
        <PainPoints />
        <Solution />
        <HowItWorks />
        <Features />
        <BioHub />
        <Demo />
        <Platforms />
        <Testimonials />
        <LeadCapture />
        <Pricing />
        <Faq />
        <CtaFinal />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
