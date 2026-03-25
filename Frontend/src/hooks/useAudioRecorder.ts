 import { useState, useRef, useCallback, useEffect } from "react";
 
 interface UseAudioRecorderReturn {
   isRecording: boolean;
   isPaused: boolean;
   duration: number;
   audioBlob: Blob | null;
   audioUrl: string | null;
   analyserNode: AnalyserNode | null;
   error: string | null;
   startRecording: () => Promise<void>;
   stopRecording: () => void;
   pauseRecording: () => void;
   resumeRecording: () => void;
   resetRecording: () => void;
 }
 
 export const useAudioRecorder = (): UseAudioRecorderReturn => {
   const [isRecording, setIsRecording] = useState(false);
   const [isPaused, setIsPaused] = useState(false);
   const [duration, setDuration] = useState(0);
   const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
   const [audioUrl, setAudioUrl] = useState<string | null>(null);
   const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
   const [error, setError] = useState<string | null>(null);
 
   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
   const audioContextRef = useRef<AudioContext | null>(null);
   const streamRef = useRef<MediaStream | null>(null);
   const chunksRef = useRef<Blob[]>([]);
   const timerRef = useRef<NodeJS.Timeout | null>(null);
   const startTimeRef = useRef<number>(0);
   const pausedDurationRef = useRef<number>(0);
 
   // Cleanup on unmount
   useEffect(() => {
     return () => {
       if (timerRef.current) clearInterval(timerRef.current);
       if (streamRef.current) {
         streamRef.current.getTracks().forEach((track) => track.stop());
       }
       if (audioContextRef.current) {
         audioContextRef.current.close();
       }
       if (audioUrl) {
         URL.revokeObjectURL(audioUrl);
       }
     };
   }, [audioUrl]);
 
   const startRecording = useCallback(async () => {
     try {
       setError(null);
       chunksRef.current = [];
 
       // Request microphone access
       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
       streamRef.current = stream;
 
       // Create audio context for visualization
       const audioContext = new AudioContext();
       audioContextRef.current = audioContext;
 
       const source = audioContext.createMediaStreamSource(stream);
       const analyser = audioContext.createAnalyser();
       analyser.fftSize = 256;
       source.connect(analyser);
       setAnalyserNode(analyser);
 
       // Create MediaRecorder
       const mediaRecorder = new MediaRecorder(stream, {
         mimeType: MediaRecorder.isTypeSupported("audio/webm")
           ? "audio/webm"
           : "audio/mp4",
       });
       mediaRecorderRef.current = mediaRecorder;
 
       mediaRecorder.ondataavailable = (event) => {
         if (event.data.size > 0) {
           chunksRef.current.push(event.data);
         }
       };
 
       mediaRecorder.onstop = () => {
         const blob = new Blob(chunksRef.current, {
           type: mediaRecorder.mimeType,
         });
         setAudioBlob(blob);
         setAudioUrl(URL.createObjectURL(blob));
       };
 
       // Start recording
       mediaRecorder.start(100); // Collect data every 100ms
       setIsRecording(true);
       setIsPaused(false);
       startTimeRef.current = Date.now();
       pausedDurationRef.current = 0;
 
       // Start timer
       timerRef.current = setInterval(() => {
         const elapsed = Date.now() - startTimeRef.current - pausedDurationRef.current;
         setDuration(Math.floor(elapsed / 1000));
       }, 100);
     } catch (err) {
       const message =
         err instanceof Error ? err.message : "Erro ao acessar microfone";
       setError(message);
       console.error("Error starting recording:", err);
     }
   }, []);
 
   const stopRecording = useCallback(() => {
     if (mediaRecorderRef.current && isRecording) {
       mediaRecorderRef.current.stop();
       setIsRecording(false);
       setIsPaused(false);
 
       if (timerRef.current) {
         clearInterval(timerRef.current);
         timerRef.current = null;
       }
 
       if (streamRef.current) {
         streamRef.current.getTracks().forEach((track) => track.stop());
       }
 
       if (audioContextRef.current) {
         audioContextRef.current.close();
         setAnalyserNode(null);
       }
     }
   }, [isRecording]);
 
   const pauseRecording = useCallback(() => {
     if (mediaRecorderRef.current && isRecording && !isPaused) {
       mediaRecorderRef.current.pause();
       setIsPaused(true);
       pausedDurationRef.current = Date.now();
     }
   }, [isRecording, isPaused]);
 
   const resumeRecording = useCallback(() => {
     if (mediaRecorderRef.current && isRecording && isPaused) {
       mediaRecorderRef.current.resume();
       pausedDurationRef.current = Date.now() - pausedDurationRef.current;
       setIsPaused(false);
     }
   }, [isRecording, isPaused]);
 
   const resetRecording = useCallback(() => {
     if (audioUrl) {
       URL.revokeObjectURL(audioUrl);
     }
     setAudioBlob(null);
     setAudioUrl(null);
     setDuration(0);
     setError(null);
     chunksRef.current = [];
   }, [audioUrl]);
 
   return {
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
   };
 };