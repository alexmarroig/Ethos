import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import PainPoints from "@/components/landing/PainPoints";
import Solution from "@/components/landing/Solution";
import HowItWorks from "@/components/landing/HowItWorks";
import Features from "@/components/landing/Features";
import Testimonials from "@/components/landing/Testimonials";
import Demo from "@/components/landing/Demo";
import Platforms from "@/components/landing/Platforms";
import Pricing from "@/components/landing/Pricing";
import CtaFinal from "@/components/landing/CtaFinal";
import Faq from "@/components/landing/Faq";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <PainPoints />
        <Solution />
        <HowItWorks />
        <Features />
        <Testimonials />
        <Demo />
        <Platforms />
        <Pricing />
        <CtaFinal />
        <Faq />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
