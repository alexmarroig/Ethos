import { useState, useEffect, useRef } from "react";

export function useAutoSave<T>(
  data: T,
  onSave: (data: T) => Promise<void> | void,
  delay: number = 30000 // 30s default
) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const initialData = useRef<T>(data);
  const dataRef = useRef(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    // Only auto-save if data has changed from initial
    if (JSON.stringify(initialData.current) === JSON.stringify(dataRef.current)) {
      return;
    }

    setStatus("idle");
    const timeoutId = setTimeout(async () => {
      try {
        setStatus("saving");
        await onSave(dataRef.current);
        setStatus("saved");
        setLastSaved(new Date());
        initialData.current = dataRef.current; // Update initial reference
        
        // Reset status to idle after 3 seconds of showing "saved"
        setTimeout(() => setStatus("idle"), 3000);
      } catch (e) {
        setStatus("error");
      }
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [data, delay, onSave]);

  return { status, lastSaved, forceSave: () => onSave(dataRef.current) };
}
