 import { useState } from "react";
 import { motion, AnimatePresence } from "framer-motion";
 import { Mic, Square, Play, Pause, RotateCcw, Check, AlertCircle } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { useAudioRecorder } from "@/hooks/useAudioRecorder";
 import AudioWaveform from "./AudioWaveform";
 import ConsentModal from "./ConsentModal";
 
 interface AudioRecorderProps {
   onRecordingComplete?: (audioBlob: Blob, audioUrl: string) => void;
   hasExternalConsent?: boolean;
 }
 
 const formatDuration = (seconds: number): string => {
   const mins = Math.floor(seconds / 60);
   const secs = seconds % 60;
   return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
 };
 
 const AudioRecorder = ({ onRecordingComplete, hasExternalConsent = false }: AudioRecorderProps) => {
   const [showConsentModal, setShowConsentModal] = useState(false);
   const [hasConfirmedConsent, setHasConfirmedConsent] = useState(hasExternalConsent);
 
   const {
     isRecording,
     isPaused,
     duration,
     audioBlob,
     audioUrl,
     analyserNode,
     error,
     startRecording,
     stopRecording,
     pauseRecording,
     resumeRecording,
     resetRecording,
   } = useAudioRecorder();
 
   const handleStartClick = () => {
     if (hasConfirmedConsent || hasExternalConsent) {
       startRecording();
     } else {
       setShowConsentModal(true);
     }
   };
 
   const handleConsentConfirm = () => {
     setShowConsentModal(false);
     setHasConfirmedConsent(true);
     startRecording();
   };
 
   const handleStopRecording = () => {
     stopRecording();
     if (audioBlob && audioUrl && onRecordingComplete) {
       // The blob will be available after onstop fires
       setTimeout(() => {
         const blob = audioBlob;
         const url = audioUrl;
         if (blob && url) {
           onRecordingComplete(blob, url);
         }
       }, 100);
     }
   };
 
   const handleReset = () => {
     resetRecording();
   };
 
   // Show error state
   if (error) {
     return (
       <motion.div
         className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg"
         initial={{ opacity: 0, y: 5 }}
         animate={{ opacity: 1, y: 0 }}
       >
         <div className="flex items-center gap-3 text-destructive">
           <AlertCircle className="w-5 h-5" strokeWidth={1.5} />
           <div>
             <p className="font-medium">Erro ao acessar microfone</p>
             <p className="text-sm text-destructive/80">{error}</p>
           </div>
         </div>
         <Button
           variant="outline"
           size="sm"
           className="mt-3"
           onClick={handleReset}
         >
           Tentar novamente
         </Button>
       </motion.div>
     );
   }
 
   // Show completed recording
   if (audioUrl && !isRecording) {
     return (
       <motion.div
         className="space-y-4"
         initial={{ opacity: 0, y: 5 }}
         animate={{ opacity: 1, y: 0 }}
       >
         <div className="flex items-center gap-2 text-sm text-status-validated">
           <Check className="w-4 h-4" />
           <span>Áudio gravado • {formatDuration(duration)}</span>
         </div>
 
         <audio
           src={audioUrl}
           controls
           className="w-full h-12 rounded-lg"
         />
 
         <Button
           variant="secondary"
           size="sm"
           onClick={handleReset}
           className="gap-2"
         >
           <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
           Gravar novamente
         </Button>
       </motion.div>
     );
   }
 
   // Show recording UI
   return (
     <>
       <ConsentModal
         isOpen={showConsentModal}
         onClose={() => setShowConsentModal(false)}
         onConfirm={handleConsentConfirm}
       />
 
       <div className="space-y-4">
         <AnimatePresence mode="wait">
           {isRecording ? (
             <motion.div
               key="recording"
               className="space-y-4"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
             >
               {/* Timer */}
               <div className="flex items-center justify-center gap-3">
                 <motion.div
                   className="w-3 h-3 rounded-full bg-destructive"
                   animate={{ opacity: isPaused ? 0.5 : [1, 0.3, 1] }}
                   transition={{ duration: 1, repeat: isPaused ? 0 : Infinity }}
                 />
                 <span className="font-mono text-2xl text-foreground tabular-nums">
                   {formatDuration(duration)}
                 </span>
               </div>
 
               {/* Waveform */}
               <AudioWaveform analyserNode={analyserNode} isRecording={isRecording && !isPaused} />
 
               {/* Controls */}
               <div className="flex items-center justify-center gap-3">
                 <Button
                   variant="secondary"
                   size="icon"
                   onClick={isPaused ? resumeRecording : pauseRecording}
                   className="w-12 h-12 rounded-full"
                 >
                   {isPaused ? (
                     <Play className="w-5 h-5" strokeWidth={1.5} />
                   ) : (
                     <Pause className="w-5 h-5" strokeWidth={1.5} />
                   )}
                 </Button>
 
                 <Button
                   variant="destructive"
                   size="icon"
                   onClick={handleStopRecording}
                   className="w-14 h-14 rounded-full"
                 >
                   <Square className="w-5 h-5" strokeWidth={1.5} fill="currentColor" />
                 </Button>
               </div>
 
               <p className="text-center text-sm text-muted-foreground">
                 {isPaused ? "Gravação pausada" : "Gravando..."}
               </p>
             </motion.div>
           ) : (
             <motion.div
               key="idle"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
             >
               <Button
                 variant="secondary"
                 className="gap-2 px-5 py-3 h-auto"
                 onClick={handleStartClick}
               >
                 <Mic className="w-4 h-4" strokeWidth={1.5} />
                 Gravar agora
               </Button>
             </motion.div>
           )}
         </AnimatePresence>
       </div>
     </>
   );
 };
 
 export default AudioRecorder;