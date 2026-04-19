import { useEffect, useState } from "react";

export function TranscriptionViewer() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [texts, setTexts] = useState<Record<string, string>>({});

  useEffect(() => {
    // 🔥 escuta mensagens do worker
    const unsubscribe = window.ethos.transcription.onMessage(async (msg: any) => {
      if (!msg?.payload?.id) return;

      const job = msg.payload;

      // atualiza lista
      setJobs(prev => {
        const exists = prev.find(j => j.id === job.id);
        if (exists) {
          return prev.map(j => (j.id === job.id ? job : j));
        }
        return [...prev, job];
      });

      // 🔐 descriptografa transcript se existir
      if (job.transcript) {
        const decrypted = await window.ethos.crypto.decrypt(job.transcript);

        setTexts(prev => ({
          ...prev,
          [job.id]: decrypted
        }));
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div>
      <h2>Transcrições</h2>

      {jobs.map(job => (
        <div key={job.id} style={{ border: "1px solid #ccc", padding: 10, marginBottom: 10 }}>
          <p><strong>Status:</strong> {job.status}</p>
          <p><strong>Progresso:</strong> {job.progress}%</p>

          <div>
            <strong>Texto:</strong>
            <p>{texts[job.id] || "Sem transcrição ainda..."}</p>
          </div>
        </div>
      ))}
    </div>
  );
}