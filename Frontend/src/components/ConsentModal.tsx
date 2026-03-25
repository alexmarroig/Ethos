 import { useState } from "react";
 import { motion, AnimatePresence } from "framer-motion";
 import { X, ShieldCheck } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Checkbox } from "@/components/ui/checkbox";
 
 interface ConsentModalProps {
   isOpen: boolean;
   onClose: () => void;
   onConfirm: () => void;
 }
 
 const ConsentModal = ({ isOpen, onClose, onConfirm }: ConsentModalProps) => {
   const [hasConsent, setHasConsent] = useState(false);
 
   const handleConfirm = () => {
     if (hasConsent) {
       onConfirm();
       setHasConsent(false);
     }
   };
 
   const handleClose = () => {
     setHasConsent(false);
     onClose();
   };
 
   return (
     <AnimatePresence>
       {isOpen && (
         <>
           {/* Backdrop */}
           <motion.div
             className="fixed inset-0 bg-black/40 z-50"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             onClick={handleClose}
           />
 
           {/* Modal */}
           <motion.div
             className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
             initial={{ opacity: 0, scale: 0.95, y: 10 }}
             animate={{ opacity: 1, scale: 1, y: 0 }}
             exit={{ opacity: 0, scale: 0.95, y: 10 }}
             transition={{ duration: 0.2 }}
           >
             <div className="bg-background rounded-xl shadow-xl border border-border p-6 mx-4">
               {/* Header */}
               <div className="flex items-start justify-between mb-6">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                     <ShieldCheck className="w-5 h-5 text-primary" strokeWidth={1.5} />
                   </div>
                   <div>
                     <h2 className="font-serif text-xl font-medium text-foreground">
                       Consentimento para gravação
                     </h2>
                   </div>
                 </div>
                 <button
                   onClick={handleClose}
                   className="text-muted-foreground hover:text-foreground transition-colors"
                 >
                   <X className="w-5 h-5" strokeWidth={1.5} />
                 </button>
               </div>
 
               {/* Content */}
               <div className="space-y-4 mb-6">
                 <p className="text-muted-foreground leading-relaxed">
                   A gravação de sessões clínicas requer consentimento explícito do paciente,
                   conforme as normas éticas e legais vigentes.
                 </p>
 
                 <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                   <p className="text-sm text-foreground font-medium">
                     Antes de continuar, confirme que:
                   </p>
                   <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                     <li>• O paciente foi informado sobre a gravação</li>
                     <li>• O paciente consentiu verbalmente ou por escrito</li>
                     <li>• A finalidade do registro foi explicada</li>
                   </ul>
                 </div>
 
                 <div className="flex items-start gap-3 pt-2">
                   <Checkbox
                     id="consent-modal"
                     checked={hasConsent}
                     onCheckedChange={(checked) => setHasConsent(checked === true)}
                     className="mt-0.5"
                   />
                   <label
                     htmlFor="consent-modal"
                     className="text-sm text-foreground cursor-pointer leading-relaxed"
                   >
                     Declaro que possuo consentimento do paciente para esta gravação
                   </label>
                 </div>
               </div>
 
               {/* Actions */}
               <div className="flex gap-3">
                 <Button
                   variant="outline"
                   className="flex-1"
                   onClick={handleClose}
                 >
                   Cancelar
                 </Button>
                 <Button
                   className="flex-1"
                   onClick={handleConfirm}
                   disabled={!hasConsent}
                 >
                   Confirmar e gravar
                 </Button>
               </div>
             </div>
           </motion.div>
         </>
       )}
     </AnimatePresence>
   );
 };
 
 export default ConsentModal;