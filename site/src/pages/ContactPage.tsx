import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import LeadCapture from "@/components/landing/LeadCapture";
import { CONTACT_EMAIL } from "@/config/site";
import { useSeo } from "@/lib/seo";
import { breadcrumbSchema, organizationSchema } from "@/lib/schemas";

const ContactPage = () => {
  useSeo({
    title: "Contato ETHOS - Fale sobre sua rotina clinica",
    description: "Entre em contato com o ETHOS para conhecer o sistema de gestao clinica para psicologas.",
    path: "/contato",
    jsonLd: [
      organizationSchema,
      breadcrumbSchema([
        { name: "Inicio", path: "/" },
        { name: "Contato", path: "/contato" },
      ]),
    ],
  });

  return (
    <div className="min-h-screen" style={{ background: "#060F1E" }}>
      <Header />
      <main className="pt-16">
        <LeadCapture />
        <section className="mx-auto max-w-4xl px-6 pb-24">
          <div className="rounded-2xl border border-[#1A2D42] bg-[#0D1B2E]/60 p-6 text-center">
            <p className="text-sm leading-7 text-[#6B8FA8]">
              Prefere email? Escreva para <a className="text-[#4ECDC4] hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ContactPage;
