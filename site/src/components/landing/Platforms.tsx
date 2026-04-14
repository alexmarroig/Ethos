import { motion } from "framer-motion";
import { Globe, Smartphone, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

const Platforms = () => {
  return (
    <section className="py-16 md:py-24 bg-secondary">
      <div className="container">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Disponível onde você precisar
          </h2>
          <p className="text-muted-foreground text-lg">Acesse pelo navegador ou baixe o app no celular.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {/* Web - Primary */}
          <motion.div
            className="p-8 rounded-xl border-2 border-primary bg-card text-center"
            style={{ boxShadow: "var(--shadow-card-hover)" }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Globe size={28} className="text-primary" />
            </div>
            <h3 className="font-display font-bold text-foreground text-lg mb-2">Web</h3>
            <p className="text-sm text-muted-foreground mb-6">Acesse direto pelo navegador, sem instalar nada.</p>
            <a href="/login">
              <Button className="w-full">Acessar agora</Button>
            </a>
          </motion.div>

          {/* Android */}
          <motion.div
            className="p-8 rounded-xl border border-border bg-card text-center"
            style={{ boxShadow: "var(--shadow-card)" }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Smartphone size={28} className="text-accent" />
            </div>
            <h3 className="font-display font-bold text-foreground text-lg mb-2">Android</h3>
            <p className="text-sm text-muted-foreground mb-6">Escaneie o QR code para baixar na Play Store.</p>
            <div className="w-32 h-32 mx-auto rounded-lg border border-border bg-muted flex items-center justify-center">
              <QrCode size={48} className="text-muted-foreground/40" />
            </div>
            <p className="text-xs text-muted-foreground mt-3">Em breve</p>
          </motion.div>

          {/* iOS */}
          <motion.div
            className="p-8 rounded-xl border border-border bg-card text-center"
            style={{ boxShadow: "var(--shadow-card)" }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Smartphone size={28} className="text-accent" />
            </div>
            <h3 className="font-display font-bold text-foreground text-lg mb-2">iOS</h3>
            <p className="text-sm text-muted-foreground mb-6">Escaneie o QR code para baixar na App Store.</p>
            <div className="w-32 h-32 mx-auto rounded-lg border border-border bg-muted flex items-center justify-center">
              <QrCode size={48} className="text-muted-foreground/40" />
            </div>
            <p className="text-xs text-muted-foreground mt-3">Em breve</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Platforms;
