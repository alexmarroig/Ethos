import { motion } from "framer-motion";
import { Shield, Database, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const EthicsPage = () => {
  return (
    <div className="min-h-screen">
      <div className="content-container py-12 max-w-3xl">
        {/* Header */}
        <motion.header
          className="mb-12"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-primary" strokeWidth={1.5} />
            <h1 className="font-serif text-3xl md:text-4xl font-medium text-foreground">
              Ética e sigilo
            </h1>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Transparência total sobre como seus dados são tratados.
          </p>
        </motion.header>

        {/* Content sections */}
        <div className="space-y-10">
          {/* Where data is stored */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex items-start gap-4">
              <Database className="w-5 h-5 text-muted-foreground mt-1 shrink-0" strokeWidth={1.5} />
              <div>
                <h2 className="font-serif text-xl font-medium text-foreground mb-3">
                  Onde os dados ficam
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Todos os dados são armazenados localmente no seu dispositivo. 
                  Nenhuma informação clínica é enviada para servidores externos. 
                  Você mantém controle total sobre os registros dos seus pacientes.
                </p>
              </div>
            </div>
          </motion.section>

          {/* When data is deleted */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <div className="flex items-start gap-4">
              <Trash2 className="w-5 h-5 text-muted-foreground mt-1 shrink-0" strokeWidth={1.5} />
              <div>
                <h2 className="font-serif text-xl font-medium text-foreground mb-3">
                  Quando os dados são apagados
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Os dados só são apagados quando você decide. Não há exclusão 
                  automática ou expiração. Você pode remover registros individuais, 
                  dados de pacientes específicos, ou todos os dados a qualquer momento.
                </p>
              </div>
            </div>
          </motion.section>

          {/* What we never do */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-5 h-5 text-muted-foreground mt-1 shrink-0" strokeWidth={1.5} />
              <div>
                <h2 className="font-serif text-xl font-medium text-foreground mb-3">
                  O que nunca é feito
                </h2>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-foreground">·</span>
                    <span>Seus dados nunca são usados para treinar modelos de IA</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-foreground">·</span>
                    <span>Nenhuma informação é compartilhada com terceiros</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-foreground">·</span>
                    <span>Não há análise ou processamento de dados para fins comerciais</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-foreground">·</span>
                    <span>Não há acesso remoto aos seus registros clínicos</span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.section>
        </div>

        {/* Critical actions */}
        <motion.section
          className="mt-16 pt-10 border-t border-border"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h2 className="font-serif text-xl font-medium text-foreground mb-6">
            Ações críticas
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Estas ações são irreversíveis. Tenha certeza antes de prosseguir.
          </p>

          <div className="space-y-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start h-14 px-5 text-left text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20"
                >
                  Apagar registros desta sessão
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-serif">
                    Apagar registros da sessão
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Todos os áudios, notas e 
                    prontuários desta sessão serão permanentemente removidos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Apagar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start h-14 px-5 text-left text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20"
                >
                  Apagar dados deste paciente
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-serif">
                    Apagar dados do paciente
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Todo o histórico clínico, 
                    sessões e prontuários deste paciente serão permanentemente removidos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Apagar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start h-14 px-5 text-left text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20"
                >
                  Apagar todos os meus dados
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-serif">
                    Apagar todos os dados
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Todos os seus dados, incluindo 
                    pacientes, sessões, prontuários e configurações serão permanentemente 
                    removidos. O aplicativo voltará ao estado inicial.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Apagar tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default EthicsPage;
