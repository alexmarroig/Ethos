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
import Pricing from "@/components/landing/Pricing";
import Faq from "@/components/landing/Faq";
import CtaFinal from "@/components/landing/CtaFinal";
import Footer from "@/components/landing/Footer";

const Index = () => {
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
        <Pricing />
        <Faq />
        <CtaFinal />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
