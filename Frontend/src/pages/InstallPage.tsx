 import { motion } from "framer-motion";
 import { Smartphone, Share, PlusSquare, MoreVertical, Download, ArrowLeft } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { useState, useEffect } from "react";
 
 interface InstallPageProps {
   onBack: () => void;
 }
 
 interface BeforeInstallPromptEvent extends Event {
   prompt: () => Promise<void>;
   userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
 }
 
 const InstallPage = ({ onBack }: InstallPageProps) => {
   const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
   const [isIOS, setIsIOS] = useState(false);
   const [isAndroid, setIsAndroid] = useState(false);
   const [isStandalone, setIsStandalone] = useState(false);
 
   useEffect(() => {
     // Detect platform
     const ua = navigator.userAgent;
     setIsIOS(/iPad|iPhone|iPod/.test(ua));
     setIsAndroid(/Android/.test(ua));
     setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
 
     // Listen for install prompt
     const handleBeforeInstall = (e: Event) => {
       e.preventDefault();
       setDeferredPrompt(e as BeforeInstallPromptEvent);
     };
 
     window.addEventListener("beforeinstallprompt", handleBeforeInstall);
 
     return () => {
       window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
     };
   }, []);
 
   const handleInstallClick = async () => {
     if (deferredPrompt) {
       await deferredPrompt.prompt();
       const { outcome } = await deferredPrompt.userChoice;
       if (outcome === "accepted") {
         setDeferredPrompt(null);
       }
     }
   };
 
   if (isStandalone) {
     return (
       <div className="min-h-screen bg-background flex items-center justify-center px-6">
         <motion.div
           className="text-center max-w-sm"
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
         >
           <div className="w-16 h-16 rounded-full bg-status-validated/10 flex items-center justify-center mx-auto mb-6">
             <Smartphone className="w-8 h-8 text-status-validated" strokeWidth={1.5} />
           </div>
           <h1 className="font-serif text-2xl font-medium text-foreground mb-3">
             App instalado!
           </h1>
           <p className="text-muted-foreground">
             O ETHOS já está instalado no seu dispositivo.
           </p>
         </motion.div>
       </div>
     );
   }
 
   return (
     <div className="min-h-screen pb-16">
       <div className="content-container py-8">
         {/* Back button */}
         <motion.button
           onClick={onBack}
           className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-300 mb-8"
           initial={{ opacity: 0, x: -10 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.4 }}
         >
           <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
           <span className="text-sm">Voltar</span>
         </motion.button>
 
         <motion.div
           initial={{ opacity: 0, y: 12 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.5 }}
         >
           <h1 className="font-serif text-3xl font-medium text-foreground mb-2">
             Instalar no celular
           </h1>
           <p className="text-muted-foreground mb-8">
             Acesse o ETHOS diretamente da tela inicial do seu dispositivo.
           </p>
 
           {/* Android Install Button */}
           {deferredPrompt && (
             <motion.div
               className="mb-8"
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 }}
             >
               <Button onClick={handleInstallClick} size="lg" className="gap-2">
                 <Download className="w-5 h-5" strokeWidth={1.5} />
                 Instalar agora
               </Button>
             </motion.div>
           )}
 
           {/* iOS Instructions */}
           {(isIOS || !isAndroid) && (
             <motion.section
               className="mb-10"
               initial={{ opacity: 0, y: 12 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.15 }}
             >
               <h2 className="font-serif text-xl font-medium text-foreground mb-4 flex items-center gap-2">
                 <Smartphone className="w-5 h-5" strokeWidth={1.5} />
                 No iPhone (Safari)
               </h2>
               <div className="space-y-4">
                 <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                   <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                     <span className="text-primary font-medium">1</span>
                   </div>
                   <div>
                     <p className="font-medium text-foreground">Abra no Safari</p>
                     <p className="text-sm text-muted-foreground">
                       Acesse o ETHOS pelo navegador Safari
                     </p>
                   </div>
                 </div>
 
                 <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                   <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                     <span className="text-primary font-medium">2</span>
                   </div>
                   <div className="flex items-start gap-2">
                     <div>
                       <p className="font-medium text-foreground">Toque em Compartilhar</p>
                       <p className="text-sm text-muted-foreground">
                         Clique no ícone de compartilhamento na barra inferior
                       </p>
                     </div>
                     <Share className="w-5 h-5 text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
                   </div>
                 </div>
 
                 <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                   <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                     <span className="text-primary font-medium">3</span>
                   </div>
                   <div className="flex items-start gap-2">
                     <div>
                       <p className="font-medium text-foreground">Adicionar à Tela de Início</p>
                       <p className="text-sm text-muted-foreground">
                         Role para baixo e selecione esta opção
                       </p>
                     </div>
                     <PlusSquare className="w-5 h-5 text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
                   </div>
                 </div>
               </div>
             </motion.section>
           )}
 
           {/* Android Instructions */}
           {(isAndroid || !isIOS) && !deferredPrompt && (
             <motion.section
               className="mb-10"
               initial={{ opacity: 0, y: 12 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2 }}
             >
               <h2 className="font-serif text-xl font-medium text-foreground mb-4 flex items-center gap-2">
                 <Smartphone className="w-5 h-5" strokeWidth={1.5} />
                 No Android (Chrome)
               </h2>
               <div className="space-y-4">
                 <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                   <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                     <span className="text-primary font-medium">1</span>
                   </div>
                   <div>
                     <p className="font-medium text-foreground">Abra no Chrome</p>
                     <p className="text-sm text-muted-foreground">
                       Acesse o ETHOS pelo navegador Chrome
                     </p>
                   </div>
                 </div>
 
                 <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                   <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                     <span className="text-primary font-medium">2</span>
                   </div>
                   <div className="flex items-start gap-2">
                     <div>
                       <p className="font-medium text-foreground">Menu do navegador</p>
                       <p className="text-sm text-muted-foreground">
                         Toque nos três pontos no canto superior direito
                       </p>
                     </div>
                     <MoreVertical className="w-5 h-5 text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
                   </div>
                 </div>
 
                 <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                   <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                     <span className="text-primary font-medium">3</span>
                   </div>
                   <div className="flex items-start gap-2">
                     <div>
                       <p className="font-medium text-foreground">Instalar aplicativo</p>
                       <p className="text-sm text-muted-foreground">
                         Selecione "Instalar aplicativo" ou "Adicionar à tela inicial"
                       </p>
                     </div>
                     <Download className="w-5 h-5 text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
                   </div>
                 </div>
               </div>
             </motion.section>
           )}
 
           {/* Benefits */}
           <motion.section
             initial={{ opacity: 0, y: 12 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.3 }}
           >
             <h2 className="font-serif text-xl font-medium text-foreground mb-4">
               Vantagens do app instalado
             </h2>
             <ul className="space-y-3 text-muted-foreground">
               <li className="flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                 Acesso rápido pela tela inicial
               </li>
               <li className="flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                 Funciona mesmo sem internet
               </li>
               <li className="flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                 Experiência em tela cheia
               </li>
               <li className="flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                 Carregamento instantâneo
               </li>
             </ul>
           </motion.section>
         </motion.div>
       </div>
     </div>
   );
 };
 
 export default InstallPage;