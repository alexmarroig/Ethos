import { motion } from "framer-motion";
import { Play } from "lucide-react";
import ethosDashboard from "@/assets/ethos-dashboard.jpg";

const DEMO_VIDEO_URL = "";

export default function Demo() {
  const hasVideo = DEMO_VIDEO_URL.trim().length > 0;

  return (
    <section className="bg-secondary py-16 md:py-24">
      <div className="container">
        <motion.div
          className="mb-10 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Veja um pouco do{" "}
            <span className="font-display tracking-tight">
              <span style={{ color: "hsl(191 55% 62%)" }}>E</span>
              <span>THOS</span>
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            {hasVideo
              ? "Assista a uma demonstração rápida da plataforma."
              : "Visualize a interface real do produto enquanto o vídeo ainda não foi publicado."}
          </p>
        </motion.div>

        <motion.div
          className="mx-auto max-w-5xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div
            className="overflow-hidden rounded-[28px] border border-border bg-card"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            {hasVideo ? (
              <div className="relative aspect-video bg-black">
                <iframe
                  src={DEMO_VIDEO_URL}
                  title="Demonstração do ETHOS"
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="group relative aspect-video overflow-hidden bg-[#f7f4ef]">
                <img
                  src={ethosDashboard}
                  alt="Tela real do ETHOS Web"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.01]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f1720]/18 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between gap-4 rounded-2xl border border-white/50 bg-white/70 px-4 py-3 backdrop-blur">
                  <div>
                    <p className="text-sm font-semibold text-foreground">ETHOS Web em uso real</p>
                    <p className="text-xs text-muted-foreground">
                      Você pode substituir esta imagem por um vídeo quando quiser.
                    </p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                    <Play size={18} className="ml-0.5" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-sm text-muted-foreground">
            Para trocar por vídeo depois:
            {` `}
            edite `DEMO_VIDEO_URL` em
            {` `}
            <span className="font-medium text-foreground">`Site/src/components/landing/Demo.tsx`</span>
            {` `}
            e cole a URL de embed do vídeo.
          </div>
        </motion.div>
      </div>
    </section>
  );
}
