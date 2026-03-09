 import { useEffect, useRef } from "react";
 import { motion } from "framer-motion";
 
 interface AudioWaveformProps {
   analyserNode: AnalyserNode | null;
   isRecording: boolean;
 }
 
 const AudioWaveform = ({ analyserNode, isRecording }: AudioWaveformProps) => {
   const canvasRef = useRef<HTMLCanvasElement>(null);
   const animationRef = useRef<number>(0);
 
   useEffect(() => {
     const canvas = canvasRef.current;
     if (!canvas || !analyserNode || !isRecording) return;
 
     const ctx = canvas.getContext("2d");
     if (!ctx) return;
 
     const bufferLength = analyserNode.frequencyBinCount;
     const dataArray = new Uint8Array(bufferLength);
 
     const draw = () => {
       animationRef.current = requestAnimationFrame(draw);
       analyserNode.getByteFrequencyData(dataArray);
 
       // Clear canvas
       ctx.fillStyle = "hsl(42, 20%, 95%)";
       ctx.fillRect(0, 0, canvas.width, canvas.height);
 
       // Draw bars
       const barWidth = (canvas.width / bufferLength) * 2.5;
       let x = 0;
 
       for (let i = 0; i < bufferLength; i++) {
         const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
 
         // Use primary color (hsl(195, 45%, 25%))
         const hue = 195;
         const saturation = 45;
         const lightness = 25 + (dataArray[i] / 255) * 20;
 
         ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
 
         const y = (canvas.height - barHeight) / 2;
         ctx.fillRect(x, y, barWidth - 2, barHeight);
 
         x += barWidth;
       }
     };
 
     draw();
 
     return () => {
       if (animationRef.current) {
         cancelAnimationFrame(animationRef.current);
       }
     };
   }, [analyserNode, isRecording]);
 
   if (!isRecording) return null;
 
   return (
     <motion.div
       initial={{ opacity: 0, scaleY: 0.8 }}
       animate={{ opacity: 1, scaleY: 1 }}
       exit={{ opacity: 0, scaleY: 0.8 }}
       className="w-full"
     >
       <canvas
         ref={canvasRef}
         width={400}
         height={80}
         className="w-full h-20 rounded-lg"
       />
     </motion.div>
   );
 };
 
 export default AudioWaveform;